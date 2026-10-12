// Shared by the Node server and the Worker, including errors and static documents.
// React uses inline style attributes for progress and finance chart geometry;
// stylesheet elements are restricted to the bundled same-origin CSS files.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "media-src 'none'",
  "worker-src 'none'",
  "form-action 'self'",
].join('; ');

export function responseSecurityHeaders(secure, existing) {
  const headers = new Headers(existing);
  headers.set('Cache-Control', 'no-store');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Content-Security-Policy', contentSecurityPolicy);
  if (secure) headers.set('Strict-Transport-Security', 'max-age=31536000');

  // Keep upstream content negotiation while making session/origin variants explicit.
  const vary = (headers.get('Vary') || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!vary.includes('*')) {
    for (const name of ['Cookie', 'Origin']) {
      if (!vary.some(value => value.toLowerCase() === name.toLowerCase())) vary.push(name);
    }
    headers.set('Vary', vary.join(', '));
  }
  return headers;
}
