export type Admin = { email: string; role: 'admin' | 'super_admin'; workshopId: string | null };
export type Session = { user: Admin; csrfToken: string; expiresAt: number };
let csrf = '';
let sessionGeneration = 0;
export function setSession(session: Session | null) {
  const next = session?.csrfToken || '';
  if(next !== csrf)sessionGeneration++;
  csrf = next;
}
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(url: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = options.method || 'GET';
  const generation = sessionGeneration;
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
  let response: Response;
  try {
    response = await fetch(url, {
      method, credentials: 'same-origin', cache: 'no-store', signal, keepalive: url === '/api/auth/logout',
      headers: { ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...((method !== 'GET' || url === '/api/admin/invoice-source') && csrf ? { 'X-CSRF-Token': csrf } : {}) },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch { if(options.signal?.aborted)throw options.signal.reason;throw new ApiError('Le serveur est injoignable. Vérifiez votre connexion puis réessayez.', 0); }
  if (response.ok && !response.headers.get('content-type')?.includes('application/json')) throw new ApiError('L’API est indisponible. Démarrez le serveur de l’application.', 502);
  const body = await response.json().catch(() => ({}));
  options.signal?.throwIfAborted();
  // A reply from a previous session must not expire or populate the next one.
  // Logout has a data-free outcome, guarded by AuthGate, after its private view is cleared.
  const previousSession = generation !== sessionGeneration;
  if(previousSession && url !== '/api/auth/logout')throw new DOMException('Cette requête appartient à une session terminée.', 'AbortError');
  if (!response.ok) {
    const invoiceSessionChanged = url === '/api/admin/invoice-source' && response.status === 403;
    if ((response.status === 401 || invoiceSessionChanged) && !previousSession && !['/api/auth/login', '/api/auth/me'].includes(url)) {
      setSession(null); window.dispatchEvent(new Event('clinique:expired'));
    }
    throw new ApiError(typeof body.error === 'string' ? body.error : 'La requête a échoué.', response.status);
  }
  return body as T;
}
