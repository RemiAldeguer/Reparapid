// An isolated, inert rendering of the real template. Only the fixed public logo
// may load; never allow arbitrary same-origin URLs or external customer assets.
export function notificationPreviewDocument(html, origin) {
  if (html === undefined) return undefined;
  let url;
  try {url = new URL(origin);} catch {throw new Error('Origine d’aperçu invalide.');}
  if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origin) throw new Error('Origine d’aperçu invalide.');
  const logo = `${url.origin}/favicon-reparapid.png`;
  return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${logo}; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">`)
    .replace('src="https://reparapid.example.invalid/favicon-reparapid.png"', `src="${logo}"`)
    .replace(/href="[^"]*"/g, 'aria-disabled="true"');
}
