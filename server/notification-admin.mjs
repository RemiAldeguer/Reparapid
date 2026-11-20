import {notificationStatus} from './notification-delivery.mjs';
import {validateNotificationPreferences, NOTIFICATION_EVENTS} from './repair-notifications.mjs';
import {notificationEnabledSQL} from './notification-storage.mjs';

export class NotificationError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const sessionGuard = `EXISTS(SELECT 1 FROM sessions s JOIN admin a ON a.id=s.admin_id
  WHERE s.token_hash=? AND s.expires_at>? AND s.seen_at>? AND a.role='admin')`;

// The caller has already enforced origin, admin authentication and CSRF. A
// write also checks the session in SQL, after its body has finished arriving.
export async function notificationAdminRequest({pathname, method, searchParams, readJSON, repo,
  config, tokenHash, idleMs, now: clock = Date.now, dispatch, readStore}) {
  if (!['/api/admin/notifications', '/api/admin/notifications/retry'].includes(pathname)) return null;
  if (pathname === '/api/admin/notifications' && method === 'GET') {
    const clientId = searchParams.get('clientId') || undefined;
    if (clientId && !/^[A-Za-z0-9_-]{1,120}$/.test(clientId)) throw new NotificationError(400, 'Client invalide.');
    return notificationStatus(repo, config, {clientId, readStore});
  }
  if (pathname === '/api/admin/notifications' && method === 'PUT') {
    const body = await readJSON(16 * 1024);
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length
      || Object.keys(body).some(key => !['enabled', 'preferences'].includes(key))
      || (Object.hasOwn(body, 'enabled') && typeof body.enabled !== 'boolean')) throw new NotificationError(400, 'Activation des notifications invalide.');
    let preferences;
    if (Object.hasOwn(body, 'preferences')) {
      try {preferences = validateNotificationPreferences(body.preferences);}
      catch (error) {throw new NotificationError(400, error.message);}
    }
    if (body.enabled === true && !config.configured) throw new NotificationError(503, 'Configurez le service d’e-mail et l’expéditeur avant d’activer les notifications.');
    const time = clock(), guard = [tokenHash, time, time - idleMs];
    const statements = [];
    if (Object.hasOwn(body, 'enabled')) statements.push({sql: `UPDATE notification_settings SET enabled=? WHERE id=1 AND ${sessionGuard}`, values: [body.enabled ? 1 : 0, ...guard]});
    if (preferences) statements.push({sql: `UPDATE notification_preferences SET payload=? WHERE id=1 AND ${sessionGuard}`, values: [JSON.stringify(preferences), ...guard]});
    statements.push({sql: `UPDATE repair_notifications SET status='cancelled',claim_token='',lease_until=0,
      error=CASE WHEN EXISTS(SELECT 1 FROM notification_settings WHERE id=1 AND enabled=0)
        THEN 'Les notifications ont été mises en pause.' ELSE 'Cet e-mail a été désactivé dans les préférences de notification.' END
      WHERE status='pending' AND NOT (${notificationEnabledSQL}) AND ${sessionGuard}`, values: guard});
    const result = (await repo.batch(statements))[0];
    if (!result.changes) throw new NotificationError(401, 'Votre session a expiré. Reconnectez-vous.');
    return notificationStatus(repo, config, {readStore});
  }
  if (pathname === '/api/admin/notifications/retry' && method === 'POST') {
    const body = await readJSON(4096);
    const id = typeof body?.id === 'string' ? body.id : '';
    const scoped = id.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/, '');
    const event = /^repair-event:\d{1,10}:[A-Za-z0-9_-]{1,120}:([a-z-]+):(client|shop)$/.exec(scoped);
    if (!/^repair-status:\d{1,10}:[A-Za-z0-9_-]{1,120}$/.test(scoped)
      && !(event && NOTIFICATION_EVENTS.some(item => item.key === event[1]))) throw new NotificationError(400, 'Notification invalide.');
    if (!config.configured) throw new NotificationError(503, 'Le service d’e-mail doit être configuré.');
    const time = clock();
    const result = await repo.run(`UPDATE repair_notifications SET status='pending',attempts=0,next_attempt_at=?,
      claim_token='',lease_until=0,error='' WHERE id=? AND status='failed' AND created_at>?
      AND ${notificationEnabledSQL} AND ${sessionGuard}`,
      [time, body.id, time - 23 * 60 * 60 * 1000, tokenHash, time, time - idleMs]);
    if (!result.changes) throw new NotificationError(409, 'Cet envoi ne peut pas être relancé. Vérifiez son état et l’activation des notifications.');
    dispatch();
    return {ok: true};
  }
  throw new NotificationError(405, 'Méthode non autorisée.');
}
