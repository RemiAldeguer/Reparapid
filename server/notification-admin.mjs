import {notificationStatus} from './notification-delivery.mjs';

export class NotificationError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const sessionGuard = `EXISTS(SELECT 1 FROM sessions s JOIN admin a ON a.id=s.admin_id
  WHERE s.token_hash=? AND s.expires_at>? AND s.seen_at>? AND a.role='admin')`;

// The caller has already enforced origin, admin authentication and CSRF. A
// write also checks the session in SQL, after its body has finished arriving.
export async function notificationAdminRequest({pathname, method, searchParams, readJSON, repo,
  config, tokenHash, idleMs, now: clock = Date.now, dispatch}) {
  if (!['/api/admin/notifications', '/api/admin/notifications/retry'].includes(pathname)) return null;
  if (pathname === '/api/admin/notifications' && method === 'GET') {
    const clientId = searchParams.get('clientId') || undefined;
    if (clientId && !/^[A-Za-z0-9_-]{1,120}$/.test(clientId)) throw new NotificationError(400, 'Client invalide.');
    return notificationStatus(repo, config, {clientId});
  }
  if (pathname === '/api/admin/notifications' && method === 'PUT') {
    const body = await readJSON(4096);
    if (typeof body.enabled !== 'boolean') throw new NotificationError(400, 'Activation des notifications invalide.');
    if (body.enabled && !config.configured) throw new NotificationError(503, 'Configurez le service d’e-mail et l’expéditeur avant d’activer les notifications.');
    const time = clock(), guard = [tokenHash, time, time - idleMs];
    const update = {sql: `UPDATE notification_settings SET enabled=? WHERE id=1 AND ${sessionGuard}`, values: [body.enabled ? 1 : 0, ...guard]};
    const result = body.enabled ? await repo.run(update.sql, update.values) : (await repo.batch([
      update,
      {sql: `UPDATE repair_notifications SET status='cancelled',claim_token='',lease_until=0,
        error='Les notifications ont été mises en pause.' WHERE status='pending'
        AND EXISTS(SELECT 1 FROM notification_settings WHERE id=1 AND enabled=0) AND ${sessionGuard}`, values: guard},
    ]))[0];
    if (!result.changes) throw new NotificationError(401, 'Votre session a expiré. Reconnectez-vous.');
    return notificationStatus(repo, config);
  }
  if (pathname === '/api/admin/notifications/retry' && method === 'POST') {
    const body = await readJSON(4096);
    if (typeof body.id !== 'string' || !/^repair-status:\d{1,10}:[A-Za-z0-9_-]{1,120}$/.test(body.id)) throw new NotificationError(400, 'Notification invalide.');
    if (!config.configured) throw new NotificationError(503, 'Le service d’e-mail doit être configuré.');
    const time = clock();
    const result = await repo.run(`UPDATE repair_notifications SET status='pending',attempts=0,next_attempt_at=?,
      claim_token='',lease_until=0,error='' WHERE id=? AND status='failed' AND created_at>?
      AND EXISTS(SELECT 1 FROM notification_settings WHERE id=1 AND enabled=1) AND ${sessionGuard}`,
      [time, body.id, time - 23 * 60 * 60 * 1000, tokenHash, time, time - idleMs]);
    if (!result.changes) throw new NotificationError(409, 'Cet envoi ne peut pas être relancé. Vérifiez son état et l’activation des notifications.');
    dispatch();
    return {ok: true};
  }
  throw new NotificationError(405, 'Méthode non autorisée.');
}
