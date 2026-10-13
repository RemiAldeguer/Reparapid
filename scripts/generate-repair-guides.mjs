import {build} from 'esbuild';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {guideCatalog, guideManifest, GUIDE_ORIGIN, GUIDE_PUBLISHED_DATE} from '../src/repair-guides-manifest.mjs';
import {publicAsset} from '../server/public-assets.mjs';
import {verifyPublicAssets} from './verify-public-assets.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const xmlEscape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export async function loadGuideRenderer() {
  // This renderer is a build-time tool. Its bundle and dependencies are never
  // written to dist or sent to visitors of an article.
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'reparapid-guide-renderer-'));
  const filename = path.join(temporary, 'renderer.cjs');
  try {
    await build({
      absWorkingDir: projectRoot,
      entryPoints: ['src/repair-guides.tsx'],
      outfile: filename,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node22',
      jsx: 'automatic',
      loader: {'.css': 'empty'},
      define: {'process.env.NODE_ENV': '"production"'},
      logLevel: 'silent',
    });
    const imported = await import(pathToFileURL(filename).href);
    const renderer = imported.default;
    renderer.validateGuideContent();
    return renderer;
  } finally {
    await rm(temporary, {recursive: true, force: true});
  }
}

export function guideStylesheets(indexHtml) {
  const stylesheets = [];
  for (const link of indexHtml.match(/<link\b[^>]*>/gi) || []) {
    if (!/\brel=["']stylesheet["']/i.test(link)) continue;
    const href = /\bhref=["']([^"']+)["']/i.exec(link)?.[1];
    if (!href) throw new Error('Feuille de style du build invalide.');
    const url = new URL(href, GUIDE_ORIGIN + '/');
    const asset = publicAsset(url.pathname);
    if (url.origin !== GUIDE_ORIGIN || url.search || url.hash || asset?.contentType !== 'text/css; charset=utf-8') throw new Error('Feuille de style du build non autorisée.');
    stylesheets.push(url.pathname);
  }
  if (!stylesheets.length) throw new Error('Le build doit contenir une feuille de style pour les tutoriels.');
  return [...new Set(stylesheets)];
}

export function guideSitemap() {
  const pages = [{pathname: '/', lastmod: null}, {pathname: guideCatalog.pathname, lastmod: GUIDE_PUBLISHED_DATE}, ...guideManifest.map(page => ({pathname: page.pathname, lastmod: GUIDE_PUBLISHED_DATE}))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${xmlEscape(GUIDE_ORIGIN + page.pathname)}</loc>${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}

export async function generateRepairGuides(distPath = path.join(projectRoot, 'dist')) {
  const root = path.resolve(distPath);
  // Check before writing, including known directories/files from an earlier
  // render, so a symlink can never redirect generated output outside the build.
  const existing = await verifyPublicAssets(root);
  const stylesheets = guideStylesheets(await readFile(path.join(root, 'index.html'), 'utf8'));
  for (const stylesheet of stylesheets) if (!existing.includes(stylesheet.slice(1))) throw new Error(`Feuille de style absente du build : ${stylesheet}`);
  const renderer = await loadGuideRenderer();
  for (const page of [guideCatalog, ...guideManifest]) {
    const filename = path.join(root, page.filename);
    await mkdir(path.dirname(filename), {recursive: true});
    await writeFile(filename, renderer.renderGuideDocument({slug: page.slug, stylesheets}), 'utf8');
  }
  await writeFile(path.join(root, 'sitemap.xml'), guideSitemap(), 'utf8');
  await writeFile(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${GUIDE_ORIGIN}/sitemap.xml\n`, 'utf8');
  await verifyPublicAssets(root, {guides: true});
  return {pages: guideManifest.length + 1, stylesheets};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) throw new Error('Argument invalide.');
    const result = await generateRepairGuides();
    console.log(`Tutoriels générés : ${result.pages} pages HTML complètes, robots.txt et sitemap.xml.`);
  } catch (error) {
    console.error(`Génération des tutoriels refusée. ${error.message}`);
    process.exitCode = 1;
  }
}
