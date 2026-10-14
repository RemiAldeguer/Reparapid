import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp, mkdir, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {guideCatalog, guideManifest, guideCollections, GUIDE_ORIGIN, GUIDE_PUBLISHED_DATE} from '../src/repair-guides-manifest.mjs';
import {publicAsset, publicSourceAsset, publicPageRedirect, generatedPublicFiles} from '../server/public-assets.mjs';
import {verifyPublicAssets} from '../scripts/verify-public-assets.mjs';
import {generateRepairGuides, guideStylesheets, guideSitemap, loadGuideRenderer} from '../scripts/generate-repair-guides.mjs';
import {createApplication} from '../server/application.mjs';
import worker from '../cloudflare/worker.mjs';

async function directory(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reparapid-guides-test-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  return root;
}
async function populate(root, filename, body = 'SYNTHETIC_GUIDE') {
  await mkdir(path.dirname(path.join(root, filename)), {recursive: true});
  await writeFile(path.join(root, filename), body);
}
const pages = [guideCatalog, ...guideCollections, ...guideManifest];
const escapedText = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
const unknownPaths = ['/guides/inconnu/', '/guides/inconnu/index.html', '/guides/backup.html', '/guides/PS5/', '/guides//', '/guides/index.html.bak', '/guides/' + guideManifest[0].slug + '/secret.html'];

test('public guide manifest declares 120 distinct slugs, category pages and only known page aliases', () => {
  assert.equal(guideManifest.length, 120);
  assert.equal(new Set(guideManifest.map(page => page.slug)).size, 120);
  assert.equal(new Set(pages.map(page => page.pathname)).size, pages.length);
  assert.equal(new Set(pages.map(page => page.filename)).size, pages.length);
  assert.ok(guideManifest.every(page => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)));
  for (const page of pages) {
    const expected = {pathname: '/' + page.filename, filename: page.filename, contentType: 'text/html; charset=utf-8'};
    for (const target of [page.pathname, page.pathname + '?source=fixture', GUIDE_ORIGIN + page.pathname]) assert.deepEqual(publicAsset(target), expected);
    assert.deepEqual(publicAsset('/' + page.filename), expected);
    assert.equal(publicPageRedirect(page.pathname), null);
    assert.equal(publicPageRedirect(page.pathname.slice(0, -1) + '?source=fixture'), page.pathname);
    assert.equal(publicPageRedirect('/' + page.filename), page.pathname);
  }
  for (const pathname of unknownPaths) {
    assert.equal(publicAsset(pathname), null, pathname);
    assert.equal(publicPageRedirect(pathname), null, pathname);
  }
  for (const pathname of ['/guides/%70s5-bruit-ventilateur-nettoyage/', '/guides%2f', '/guides/../guides/index.html']) {
    assert.equal(publicAsset(pathname), null);
    assert.equal(publicPageRedirect(pathname), null);
  }
  assert.throws(() => publicPageRedirect('/guides/%GG'), URIError);
});

test('public guide files belong only to generated output, never to copied public sources', async t => {
  for (const filename of generatedPublicFiles) assert.equal(publicSourceAsset('/' + filename), null, filename);
  const root = await directory(t);
  await populate(root, 'index.html');
  for (const filename of generatedPublicFiles) await populate(root, filename);
  assert.deepEqual((await verifyPublicAssets(root, {guides: true})).sort(), ['index.html', ...generatedPublicFiles].sort());
  await populate(root, 'guides/backup.html', 'SYNTHETIC_PRIVATE_EXPORT');
  await assert.rejects(verifyPublicAssets(root), /non autorisé/);
  await rm(path.join(root, 'guides', 'backup.html'));
  await mkdir(path.join(root, 'guides', 'inconnu'));
  await assert.rejects(verifyPublicAssets(root), /Dossier public non autorisé/);
  const source = await directory(t);
  for (const filename of ['robots.txt', 'sitemap.xml']) {
    await populate(source, filename);
    await assert.rejects(verifyPublicAssets(source, {source: true}), /non autorisé/);
    await rm(path.join(source, filename));
  }
  await mkdir(path.join(source, 'guides'));
  await assert.rejects(verifyPublicAssets(source, {source: true}), /Dossier public non autorisé/);
});

test('public guide final guard detects a missing rendered page', async t => {
  const root = await directory(t);
  await populate(root, 'index.html');
  for (const filename of generatedPublicFiles.slice(1)) await populate(root, filename);
  await assert.rejects(verifyPublicAssets(root, {guides: true}), /manquant/);
});

async function staticFixture(t, platform) {
  const files = new Map([['index.html', 'SYNTHETIC_APP'], ...generatedPublicFiles.map(filename => [filename, `SYNTHETIC:${filename}`])]);
  if (platform === 'worker') {
    const calls = [];
    const env = {ASSETS: {fetch: async request => {
      const pathname = new URL(request.url).pathname;
      calls.push({pathname, method: request.method});
      const filename = pathname.slice(1);
      return new Response(request.method === 'HEAD' ? null : files.get(filename) ?? 'SYNTHETIC_PRIVATE_EXPORT', {status: files.has(filename) ? 200 : 404, headers: {'Content-Type': publicAsset(pathname)?.contentType ?? 'text/plain'}});
    }}};
    return {calls, request: (route, method = 'GET') => worker.fetch(new Request('https://fixture.invalid' + route, {method}), env)};
  }
  const root = await directory(t);
  for (const [filename, body] of files) await populate(root, filename, body);
  await populate(root, 'guides/backup.html', 'SYNTHETIC_PRIVATE_EXPORT');
  const app = createApplication({databasePath: ':memory:', origin: 'http://127.0.0.1', distPath: root, notificationPollingMs: 0});
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  t.after(() => new Promise(resolve => {app.server.closeAllConnections(); app.server.close(resolve);}));
  return {root, request: (route, method = 'GET') => fetch(`http://127.0.0.1:${app.server.address().port}${route}`, {method, redirect: 'manual'})};
}

for (const platform of ['node', 'worker']) {
  test(`public guide ${platform}: canonical pages, SEO files and HEAD use the exact declared files`, async t => {
    const f = await staticFixture(t, platform);
    for (const page of pages) for (const method of ['GET', 'HEAD']) {
      const response = await f.request(page.pathname, method);
      assert.equal(response.status, 200, page.pathname);
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(await response.text(), method === 'HEAD' ? '' : `SYNTHETIC:${page.filename}`);
    }
    for (const filename of ['robots.txt', 'sitemap.xml']) for (const method of ['GET', 'HEAD']) {
      const response = await f.request('/' + filename, method);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), publicAsset('/' + filename).contentType);
      assert.equal(await response.text(), method === 'HEAD' ? '' : `SYNTHETIC:${filename}`);
    }
    const root = await f.request('/');
    assert.equal(root.status, 200);
    assert.equal(await root.text(), 'SYNTHETIC_APP');
    if (f.calls) {
      assert.ok(f.calls.some(call => call.pathname === '/' + guideManifest[0].filename));
      assert.ok(f.calls.some(call => call.pathname === '/index.html'));
      assert.ok(f.calls.every(call => !call.pathname.endsWith('/')));
    }
  });
  test(`public guide ${platform}: only known aliases redirect; unknown paths never reach assets`, async t => {
    const f = await staticFixture(t, platform);
    for (const page of pages) for (const alias of [page.pathname.slice(0, -1), '/' + page.filename]) for (const method of ['GET', 'HEAD']) {
      const response = await f.request(alias + '?source=fixture', method);
      assert.equal(response.status, 308, alias);
      assert.equal(response.headers.get('location'), page.pathname);
      assert.equal(await response.text(), '');
    }
    for (const pathname of unknownPaths) {
      const response = await f.request(pathname);
      assert.equal(response.status, 404, pathname);
      assert.ok(!(await response.text()).includes('SYNTHETIC_PRIVATE_EXPORT'));
    }
    assert.equal((await f.request(guideCatalog.pathname, 'POST')).status, 405);
    if (f.calls) assert.equal(f.calls.length, 0);
  });
}

test('public guide Node realpath refuses known article symlinks and symlinked guide directories', async t => {
  const f = await staticFixture(t, 'node');
  const outside = await directory(t);
  await populate(outside, 'private.html', 'SYNTHETIC_PRIVATE_EXPORT');
  const page = guideManifest[0];
  await rm(path.join(f.root, page.filename));
  await symlink(path.join(outside, 'private.html'), path.join(f.root, page.filename));
  for (const method of ['GET', 'HEAD']) assert.equal((await f.request(page.pathname, method)).status, 404);
  await rm(path.join(f.root, 'guides'), {recursive: true});
  await mkdir(path.join(outside, 'guides'));
  await populate(path.join(outside, 'guides'), 'index.html', 'SYNTHETIC_PRIVATE_EXPORT');
  await symlink(path.join(outside, 'guides'), path.join(f.root, 'guides'));
  for (const method of ['GET', 'HEAD']) assert.equal((await f.request(guideCatalog.pathname, method)).status, 404);
  await assert.rejects(verifyPublicAssets(f.root), /Lien symbolique/);
});

test('guide stylesheets accept the Vite relative path and reject arbitrary or remote styles', () => {
  assert.deepEqual(guideStylesheets('<link rel="stylesheet" crossorigin href="./assets/index-Abcd1234.css">'), ['/assets/index-Abcd1234.css']);
  for (const href of ['https://other.invalid/assets/index-Abcd1234.css', '/private.css', '/assets/index-Abcd1234.js', '/assets/index-Abcd1234.css?secret=1']) assert.throws(() => guideStylesheets(`<link href="${href}" rel="stylesheet">`), /non autorisée/);
  assert.throws(() => guideStylesheets('<html></html>'), /feuille de style/);
});

test('guide sitemap contains only the real canonical public pages and stable editorial dates', () => {
  const xml = guideSitemap();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, [GUIDE_ORIGIN + '/', ...pages.map(page => GUIDE_ORIGIN + page.pathname)]);
  assert.equal(new Set(urls).size, 124);
  assert.equal([...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].length, 123);
  assert.ok(xml.includes(`<lastmod>${GUIDE_PUBLISHED_DATE}</lastmod>`));
  assert.ok(urls.every(url => !url.includes('#') && !url.includes('/api/') && !url.includes('reparapid.fr')));
});

test('guide renderer emits complete indexable articles, honest metadata, visible FAQs and local links without the app bundle', async () => {
  const renderer = await loadGuideRenderer();
  const catalog = renderer.renderGuideDocument({stylesheets: ['/assets/index-Abcd1234.css']});
  assert.equal((catalog.match(/<h1\b/g) || []).length, 1);
  for (const page of guideManifest) assert.ok(catalog.includes(`href="${page.pathname}"`), page.pathname);
  const titles = new Set(), descriptions = new Set();
  for (const page of guideManifest) {
    const guide = renderer.repairGuides.find(item => item.slug === page.slug);
    const html = renderer.renderGuideDocument({slug: page.slug, stylesheets: ['/assets/index-Abcd1234.css']});
    titles.add(guide.title); descriptions.add(guide.description);
    assert.ok(html.startsWith('<!doctype html>'));
    assert.ok(html.includes('<html lang="fr">'));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes(`rel="canonical" href="${GUIDE_ORIGIN + page.pathname}"`));
    assert.ok(html.includes('name="description"'));
    assert.ok(html.includes('name="robots" content="index,follow"'));
    assert.ok(html.includes('data-console-kind=') || html.includes('data-guide-device='));
    assert.ok(html.includes(`dateTime="${GUIDE_PUBLISHED_DATE}"`) || html.includes(`datetime="${GUIDE_PUBLISHED_DATE}"`));
    assert.ok(html.includes('13 octobre 2026'));
    if (guide.deviceType === 'smartphone') assert.ok(html.includes('href="/#/accueil?section=rp-contact"'));
    else assert.ok(html.includes('href="/#/demande-reparation'));
    assert.ok(html.includes('href="/guides/"'));
    assert.ok(!/<script[^>]+(?:src=|type="module")/.test(html));
    assert.ok(!html.includes('href="#/'));
    assert.ok(!html.includes('src="./'));
    const json = JSON.parse(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/.exec(html)[1]);
    const article = json['@graph'].find(item => item['@type'] === 'Article');
    assert.equal(article.headline, guide.title);
    assert.equal(article.mainEntityOfPage, GUIDE_ORIGIN + page.pathname);
    assert.equal(article.datePublished, GUIDE_PUBLISHED_DATE);
    assert.equal(article.image, undefined, 'the brand logo must not impersonate an article illustration');
    assert.ok(json['@graph'].some(item => item['@type'] === 'BreadcrumbList'));
    assert.ok(!json['@graph'].some(item => item['@type'] === 'FAQPage'));
    assert.ok(html.includes(escapedText(guide.introduction)));
    for (const value of [...guide.symptoms, ...guide.tools, ...guide.checks, ...guide.stop]) assert.ok(html.includes(escapedText(value)));
    for (const item of [...guide.steps, ...guide.examples]) {assert.ok(html.includes(escapedText(item.title))); assert.ok(html.includes(escapedText(item.body)));}
    for (const item of guide.faq) {assert.ok(html.includes(escapedText(item.question))); assert.ok(html.includes(escapedText(item.answer)));}
    if (guide.family === 'Steam Deck') assert.ok(html.includes('href="/#/demande-reparation?marque=Autre"'));
    for (const match of html.matchAll(/href="(#[^"]+)"/g)) assert.ok(html.includes(`id="${match[1].slice(1)}"`), match[1]);
  }
  assert.equal(titles.size, guideManifest.length);
  assert.equal(descriptions.size, guideManifest.length);
  assert.throws(() => renderer.renderGuideDocument({slug: 'inconnu', stylesheets: []}), /introuvable/);
});

test('guide generation uses a disposable build, supplies every exact public output and rejects symlinks before writing', async t => {
  const root = await directory(t);
  await populate(root, 'index.html', '<!doctype html><link rel="stylesheet" crossorigin href="./assets/index-Abcd1234.css">');
  await populate(root, 'assets/index-Abcd1234.css', '/* synthetic CSS */');
  const result = await generateRepairGuides(root);
  assert.equal(result.pages, 123);
  assert.equal(result.scripts.length, 1);
  const searchScript = result.scripts[0];
  assert.match(searchScript, /^\/assets\/guide-search-[a-f0-9]{8}\.js$/);
  assert.equal(publicAsset(searchScript).contentType, 'text/javascript; charset=utf-8');
  assert.equal(publicSourceAsset(searchScript), null);
  const searchSource = await readFile(path.join(root, searchScript.slice(1)), 'utf8');
  assert.ok(searchSource.length < 8000, 'public filtering does not load the administrative application');
  assert.ok(!/fetch\(|localStorage|sessionStorage|\/api\//.test(searchSource), 'search stays within the displayed public catalog');
  assert.equal((await verifyPublicAssets(root, {guides: true})).length, generatedPublicFiles.length + 3);
  for (const page of pages) {
    const html = await readFile(path.join(root, page.filename), 'utf8');
    assert.ok(html.includes(`rel="canonical" href="${GUIDE_ORIGIN + page.pathname}"`));
    assert.ok(html.includes('href="/assets/index-Abcd1234.css"'));
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(scripts, page.slug ? [] : [searchScript], 'only catalogs receive their independent search script');
  }
  assert.equal(await readFile(path.join(root, 'sitemap.xml'), 'utf8'), guideSitemap());
  const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
  assert.ok(robots.includes(`Sitemap: ${GUIDE_ORIGIN}/sitemap.xml`));
  assert.ok(robots.includes('Disallow: /api/'));
  const outside = await directory(t);
  await populate(outside, 'private.txt', 'SYNTHETIC_PRIVATE_EXPORT');
  await rm(path.join(root, 'robots.txt'));
  await symlink(path.join(outside, 'private.txt'), path.join(root, 'robots.txt'));
  await assert.rejects(generateRepairGuides(root), /Lien symbolique/);
  assert.equal(await readFile(path.join(outside, 'private.txt'), 'utf8'), 'SYNTHETIC_PRIVATE_EXPORT');
});

test('console and smartphone catalogs contain the right articles and distinct canonical metadata', async () => {
  const renderer = await loadGuideRenderer();
  const guides = renderer.repairGuides;
  const phones = guides.filter(guide => guide.deviceType === 'smartphone');
  const consoles = guides.filter(guide => guide.deviceType !== 'smartphone');
  assert.equal(phones.length, 48);
  assert.equal(consoles.length, 72);
  for (const page of guideCollections) {
    const html = renderer.renderGuideDocument({collection: page.collection, stylesheets: ['/assets/index-Abcd1234.css']});
    const wanted = page.collection === 'smartphones' ? phones : consoles;
    const excluded = page.collection === 'smartphones' ? consoles : phones;
    assert.ok(html.includes(`rel="canonical" href="${GUIDE_ORIGIN + page.pathname}"`));
    assert.equal((html.match(/data-guide-card="true"/g) || []).length, wanted.length);
    for (const guide of wanted) assert.ok(html.includes(`href="/guides/${guide.slug}/"`));
    for (const guide of excluded) assert.ok(!html.includes(`href="/guides/${guide.slug}/"`));
    const json = JSON.parse(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/.exec(html)[1]);
    assert.equal(json['@graph'].find(item => item['@type'] === 'CollectionPage').mainEntity.itemListElement.length, wanted.length);
    assert.ok(html.includes('data-guide-search-form="true" hidden=""'));
  }
});
