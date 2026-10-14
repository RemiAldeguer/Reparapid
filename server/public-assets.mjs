import {guideCatalog, guideManifest, guideCollections} from '../src/repair-guides-manifest.mjs';

// Only the interface build is public. A file placed beside it must never become
// downloadable merely because its extension happens to be browser-readable.
const fixedAssets = new Map([
  ['/index.html', 'text/html; charset=utf-8'],
  ['/reparapid-logo-original.webp', 'image/webp'],
  ['/maxxi-games-logo-original.png', 'image/png'],
  ['/favicon-reparapid.png', 'image/png'],
  ['/logo-clinique-retro.svg', 'image/svg+xml'],
  ['/fonts/oxanium.ttf', 'font/ttf'],
  ['/fonts/oxanium-OFL.txt', 'text/plain; charset=utf-8'],
]);
const bundledAsset = /^\/assets\/[A-Za-z0-9][A-Za-z0-9_-]*-[A-Za-z0-9_-]{8}\.(js|css)$/;
const guidePages = [guideCatalog, ...guideCollections, ...guideManifest];
const generatedAssets = new Map([
  ['/robots.txt', 'text/plain; charset=utf-8'],
  ['/sitemap.xml', 'application/xml; charset=utf-8'],
  ...guidePages.map(page => ['/' + page.filename, 'text/html; charset=utf-8']),
]);
const pageFiles = new Map(guidePages.map(page => [page.pathname, '/' + page.filename]));
const pageAliases = new Map(guidePages.flatMap(page => [
  [page.pathname.slice(0, -1), page.pathname],
  ['/' + page.filename, page.pathname],
]));

export const publicAssetDirectories = Object.freeze(['assets', 'fonts', 'guides', ...[...guideCollections, ...guideManifest].map(page => page.filename.slice(0, -11))]);
export const publicSourceDirectories = Object.freeze(['fonts']);
export const generatedPublicFiles = Object.freeze([...generatedAssets.keys()].map(name => name.slice(1)));

// Files copied from public/ are fixed brand assets only. Bundles are produced
// by Vite from source; a copied export must not impersonate a hashed bundle.
export function publicSourceAsset(pathname) {
  return pathname !== '/index.html' && fixedAssets.has(pathname) ? publicAsset(pathname) : null;
}

function publicPathname(requestTarget) {
  // Inspect the original target before URL parsing can normalize dot segments
  // or backslashes. Accept the origin-form target and absolute HTTP(S) URLs.
  const pathname = requestTarget.startsWith('/')
    ? requestTarget.split(/[?#]/, 1)[0]
    : /^https?:\/\/[^/?#]+(\/[^?#]*)?(?:[?#].*)?$/.exec(requestTarget)?.[1] ?? null;
  if (pathname === null) return null;
  // Validate escapes even for an unlisted path so malformed paths retain 400.
  // Encoded aliases (including a second decode, separator or dot) are refused.
  const decoded = decodeURIComponent(pathname);
  if (decoded !== pathname) return null;
  return pathname;
}

// Redirect only deliberate aliases of declared pages; never normalize unknown
// files, encoded paths or arbitrary HTML into a public document.
export function publicPageRedirect(requestTarget) {
  const pathname = publicPathname(requestTarget);
  return pathname === null ? null : pageAliases.get(pathname) ?? null;
}

export function publicAsset(requestTarget) {
  const pathname = publicPathname(requestTarget);
  if (pathname === null) return null;
  const canonical = pathname === '/' ? '/index.html' : pageFiles.get(pathname) ?? pathname;
  const bundle = bundledAsset.exec(canonical);
  const contentType = fixedAssets.get(canonical) ?? generatedAssets.get(canonical) ?? (bundle && (bundle[1] === 'js'
    ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8'));
  return contentType ? {pathname: canonical, filename: canonical.slice(1), contentType} : null;
}
