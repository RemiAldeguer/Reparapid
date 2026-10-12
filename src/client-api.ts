export type ClientSession = {user: {email: string; role: 'client'; clientId: string; name: string}; csrfToken: string; expiresAt: number};
export type IntakeShop = {shopName: string; address: string; postalCode: string; city: string; phone: string; email: string; addressConfirmed: boolean};
export class ClientApiError extends Error {constructor(message: string, public status: number) {super(message);}}
export async function clientApi<T>(url: string, options: {method?: string; body?: unknown; csrfToken?: string; signal?: AbortSignal; rootWorkshop?: boolean} = {}): Promise<T> {
  const method = options.method || 'GET';
  const workshopId = options.rootWorkshop ? null : new URLSearchParams(window.location.search).get('atelier');
  let response: Response;
  try {
    response = await fetch(url, {method, credentials: 'same-origin', cache: 'no-store', signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000), keepalive: url === '/api/client/auth/logout',
      headers: {...(options.body !== undefined ? {'Content-Type': 'application/json'} : {}), ...(method !== 'GET' && options.csrfToken ? {'X-CSRF-Token': options.csrfToken} : {}), ...(workshopId ? {'X-Workshop-ID': workshopId} : {})},
      ...(options.body !== undefined ? {body: JSON.stringify(options.body)} : {})});
  } catch {if (options.signal?.aborted) throw options.signal.reason; throw new ClientApiError('Le serveur est injoignable. Vérifiez votre connexion puis réessayez.', 0);}
  if (response.ok && !response.headers.get('content-type')?.includes('application/json')) throw new ClientApiError('Le service est momentanément indisponible.', 502);
  const body = await response.json().catch(() => ({}));
  options.signal?.throwIfAborted();
  if (!response.ok) throw new ClientApiError(typeof body.error === 'string' ? body.error : 'La requête a échoué.', response.status);
  return body as T;
}
