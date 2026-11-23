export const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://reparapid.aldeguer-remi.workers.dev';

// Keep the production hostname configurable at build time without accepting a
// URL that could move canonical links into credentials, a path or a query.
export function resolvePublicSiteOrigin(value = DEFAULT_PUBLIC_SITE_ORIGIN) {
  if (typeof value !== 'string' || !/^https:\/\/[^\s/?#\\@<>"'&]+\/?$/i.test(value)) {
    throw new Error('PUBLIC_SITE_ORIGIN doit être une origine HTTPS sans identifiants, chemin, paramètres ou fragment.');
  }
  let url;
  try { url = new URL(value); } catch {
    throw new Error('PUBLIC_SITE_ORIGIN doit être une origine HTTPS valide.');
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_SITE_ORIGIN doit être une origine HTTPS sans identifiants, chemin, paramètres ou fragment.');
  }
  return url.origin;
}

// This module is also reachable from the public catalog in the browser, where
// process does not exist. Server-only settings are never copied into its bundle.
export const PUBLIC_SITE_ORIGIN = resolvePublicSiteOrigin(typeof process === 'undefined' ? undefined : process.env.PUBLIC_SITE_ORIGIN);
