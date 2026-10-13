// Only the interface build is public. A file placed beside it must never become
// downloadable merely because its extension happens to be browser-readable.
const fixedAssets = new Map([
  ['/index.html', 'text/html; charset=utf-8'],
  ['/reparapid-logo-original.webp', 'image/webp'],
  ['/favicon-reparapid.png', 'image/png'],
  ['/logo-clinique-retro.svg', 'image/svg+xml'],
  ['/fonts/oxanium.ttf', 'font/ttf'],
  ['/fonts/oxanium-OFL.txt', 'text/plain; charset=utf-8'],
]);
const bundledAsset = /^\/assets\/[A-Za-z0-9][A-Za-z0-9_-]*-[A-Za-z0-9_-]{8}\.(js|css)$/;

export const publicAssetDirectories = Object.freeze(['assets', 'fonts']);
export const publicSourceDirectories = Object.freeze(['fonts']);

// Files copied from public/ are fixed brand assets only. Bundles are produced
// by Vite from source; a copied export must not impersonate a hashed bundle.
export function publicSourceAsset(pathname) {
  return pathname !== '/index.html' && fixedAssets.has(pathname) ? publicAsset(pathname) : null;
}

export function publicAsset(requestTarget) {
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
  const canonical = pathname === '/' ? '/index.html' : pathname;
  const bundle = bundledAsset.exec(canonical);
  const contentType = fixedAssets.get(canonical) ?? (bundle && (bundle[1] === 'js'
    ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8'));
  return contentType ? {pathname: canonical, filename: canonical.slice(1), contentType} : null;
}
