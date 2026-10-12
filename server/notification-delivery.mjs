import {renderRepairNotification} from './repair-notifications.mjs';

const LEASE_MS = 60_000;
const MAX_ATTEMPTS = 6;
// Resend retains idempotency keys for 24 hours. Leave an hour of margin.
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const ERRORS = {
  invalid: 'Le message de notification est invalide.',
  unavailable: 'Le service d’e-mail est momentanément indisponible.',
  timeout: 'Le service d’e-mail n’a pas répondu à temps.',
  limited: 'La limite d’envoi est atteinte. Une nouvelle tentative est prévue.',
  rejected: 'L’envoi a été refusé par le service d’e-mail. Vérifiez sa configuration.',
  confirmation: 'Le service d’e-mail n’a pas confirmé l’envoi.',
  exhausted: 'L’e-mail n’a pas pu être envoyé après plusieurs tentatives.',
  expired: 'Le délai de nouvelle tentative est dépassé. L’envoi reste à vérifier.',
  recipient: 'Le client ou le destinataire de cette réparation a changé.',
  paused: 'Les notifications ont été mises en pause.',
  restored: 'L’atelier a été restauré ou réinitialisé.',
};
const SAFE_ERRORS = new Set(Object.values(ERRORS));

const value = input => typeof input === 'string' ? input.trim() : '';
const address = input => {
  const email = value(input).toLowerCase();
  return email.length <= 254 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email) ? email : '';
};
function sender(input) {
  const from = value(input);
  if (!from || from.length > 320 || /[\r\n\x00-\x1f\x7f]/.test(from)) return '';
  if (address(from)) return from;
  const match = /^([^<>]+)\s*<([^<>]+)>$/.exec(from);
  return match && value(match[1]) && address(match[2]) ? from : '';
}
function portalOrigin(input) {
  try {
    const url = new URL(value(input));
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) return '';
    return url.origin;
  } catch {return '';}
}

/** Internal configuration. The API must allowlist public fields, never apiKey. */
export function notificationConfiguration(env = {}) {
  const apiKey = value(env.RESEND_API_KEY);
  const from = sender(env.MAIL_FROM);
  const rawReplyTo = value(env.MAIL_REPLY_TO);
  const replyTo = rawReplyTo ? address(rawReplyTo) : '';
  const origin = portalOrigin(env.MAIL_PORTAL_ORIGIN || env.APP_ORIGIN);
  let issue = '';
  if (!apiKey || apiKey.length > 1024 || /\s/.test(apiKey)) issue = 'La clé du service d’e-mail reste à configurer.';
  else if (!from) issue = 'L’adresse d’expédition reste à configurer avec un domaine vérifié.';
  else if (rawReplyTo && !replyTo) issue = 'L’adresse de réponse est invalide.';
  else if (!origin) issue = 'L’adresse de l’espace client reste à configurer.';
  return {configured: !issue, provider: 'resend', from, replyTo, portalOrigin: origin, issue, apiKey};
}

function parsePayload(row) {
  try {const payload = JSON.parse(row.payload); return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;}
  catch {return null;}
}

async function finish(repo, row, changes, now) {
  const {status, error = '', nextAttemptAt = now, sentAt = null, providerId = ''} = changes;
  return repo.run(`UPDATE repair_notifications SET status=?, error=?, next_attempt_at=?, sent_at=?, provider_id=?, claim_token='', lease_until=0
    WHERE id=? AND status='pending' AND claim_token=?`, [status, error, nextAttemptAt, sentAt, providerId, row.id, row.claim_token]);
}

async function claim(repo, now) {
  const token = crypto.randomUUID();
  return repo.first(`UPDATE repair_notifications SET claim_token=?, lease_until=?
    WHERE id=(SELECT id FROM repair_notifications
      WHERE status='pending' AND next_attempt_at<=? AND lease_until<=?
        AND EXISTS(SELECT 1 FROM notification_settings WHERE id=1 AND enabled=1)
        AND NOT EXISTS(SELECT 1 FROM repair_notifications WHERE status='pending' AND claim_token<>'' AND lease_until>?)
      ORDER BY created_at,id LIMIT 1)
      AND status='pending' AND lease_until<=?
    RETURNING *`, [token, now + LEASE_MS, now, now, now, now]);
}

function ownsNotification(store, row) {
  const client = store?.clients?.find(item => item.id === row.client_id);
  const console = store?.consoles?.find(item => item.id === row.console_id);
  const repair = store?.repairs?.find(item => item.id === row.repair_id);
  return client && address(client.email) === row.recipient && console?.clientId === row.client_id && repair?.consoleId === row.console_id;
}

async function retry(repo, row, error, now, counts) {
  const attempts = Number(row.attempts);
  const expired = now - Number(row.created_at) >= RETRY_WINDOW_MS;
  if (attempts >= MAX_ATTEMPTS || expired) {
    const result = await finish(repo, row, {status: 'failed', error: expired ? ERRORS.expired : ERRORS.exhausted}, now);
    if (result.changes) counts.failed++;
  } else {
    const delay = Math.min(60 * 60 * 1000, 60_000 * 2 ** Math.max(0, attempts - 1));
    const result = await finish(repo, row, {status: 'pending', error, nextAttemptAt: Math.min(now + delay, Number(row.created_at) + RETRY_WINDOW_MS)}, now);
    if (result.changes) counts.pending++;
  }
}

/** Claims and sends at most one notification at a time, using persistent leases. */
export async function deliverNotifications(repo, {config, readStore, fetch: fetchImpl = globalThis.fetch, now: clock = Date.now, limit: batch = 5}) {
  const counts = {claimed: 0, sent: 0, failed: 0, cancelled: 0, pending: 0};
  if (!config?.configured) return counts;
  const limit = Math.max(0, Math.min(20, Number.isFinite(batch) ? Math.floor(batch) : 5));
  for (let index = 0; index < limit; index++) {
    let time = clock();
    const row = await claim(repo, time);
    if (!row) break;
    counts.claimed++;
    const payload = parsePayload(row);
    let message;
    try {
      if (!payload) throw new Error('Invalid payload');
      message = renderRepairNotification(payload);
      if (!address(row.recipient) || !message || !value(message.subject) || !value(message.text) || !value(message.html)) throw new Error('Invalid message');
    } catch {
      if ((await finish(repo, row, {status: 'failed', error: ERRORS.invalid}, clock())).changes) counts.failed++;
      continue;
    }
    let store;
    try {store = await readStore();}
    catch {
      if ((await finish(repo, row, {status: 'pending', error: ERRORS.unavailable, nextAttemptAt: clock() + 60_000}, clock())).changes) counts.pending++;
      break;
    }
    if (!ownsNotification(store, row)) {
      if ((await finish(repo, row, {status: 'cancelled', error: ERRORS.recipient}, clock())).changes) counts.cancelled++;
      continue;
    }
    time = clock();
    if (Number(row.attempts) >= MAX_ATTEMPTS || (Number(row.attempts) > 0 && time - Number(row.created_at) >= RETRY_WINDOW_MS)) {
      if ((await finish(repo, row, {status: 'failed', error: Number(row.attempts) >= MAX_ATTEMPTS ? ERRORS.exhausted : ERRORS.expired}, time)).changes) counts.failed++;
      continue;
    }
    // Check the settings again after reading the current workshop. Disabling
    // notifications prevents an already-claimed message from starting its send.
    const attempted = await repo.run(`UPDATE repair_notifications SET attempts=attempts+1
      WHERE id=? AND status='pending' AND claim_token=? AND lease_until>?
        AND EXISTS(SELECT 1 FROM notification_settings WHERE id=1 AND enabled=1)`, [row.id, row.claim_token, time + 10_000]);
    if (!attempted.changes) {
      await repo.run("UPDATE repair_notifications SET claim_token='',lease_until=0 WHERE id=? AND claim_token=? AND status='pending'", [row.id, row.claim_token]);
      break;
    }
    row.attempts = Number(row.attempts) + 1;
    try {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}`, 'Idempotency-Key': row.id},
        body: JSON.stringify({from: config.from, to: [row.recipient], subject: message.subject, html: message.html, text: message.text, ...(config.replyTo ? {reply_to: config.replyTo} : {})}),
        signal: AbortSignal.timeout(10_000),
      });
      time = clock();
      if (response.status === 409) {
        // A concurrent request is retryable; a changed payload for the same key
        // is permanent. Read only the documented error name, never store its body.
        let code;
        try {code = (await response.json())?.name;} catch {code = '';}
        if (code === 'concurrent_idempotent_requests') await retry(repo, row, ERRORS.unavailable, clock(), counts);
        else if ((await finish(repo, row, {status: 'failed', error: ERRORS.rejected}, clock())).changes) counts.failed++;
      } else if (response.status === 429 || response.status >= 500 || response.status === 408) {
        await retry(repo, row, response.status === 429 ? ERRORS.limited : ERRORS.unavailable, time, counts);
      } else if (!response.ok) {
        if ((await finish(repo, row, {status: 'failed', error: ERRORS.rejected}, time)).changes) counts.failed++;
      } else {
        let data;
        try {data = await response.json();} catch {data = null;}
        if (typeof data?.id !== 'string' || !/^[A-Za-z0-9_-]{1,256}$/.test(data.id)) await retry(repo, row, ERRORS.confirmation, clock(), counts);
        else if ((await finish(repo, row, {status: 'sent', providerId: data.id, sentAt: clock()}, clock())).changes) counts.sent++;
      }
    } catch (error) {
      await retry(repo, row, ['TimeoutError', 'AbortError'].includes(error?.name) ? ERRORS.timeout : ERRORS.unavailable, clock(), counts);
    }
  }
  return counts;
}

export async function notificationStatus(repo, config, {clientId} = {}) {
  const scoped = typeof clientId === 'string' && !!clientId;
  const where = scoped ? 'WHERE client_id=?' : '';
  const parameters = scoped ? [clientId] : [];
  const settings = await repo.first('SELECT enabled FROM notification_settings WHERE id=1', []);
  const counts = {pending: 0, sent: 0, failed: 0, cancelled: 0};
  for (const row of await repo.all(`SELECT status, COUNT(*) AS total FROM repair_notifications ${where} GROUP BY status`, parameters)) {
    if (Object.hasOwn(counts, row.status)) counts[row.status] = Number(row.total);
  }
  const rows = await repo.all(`SELECT * FROM repair_notifications ${where} ORDER BY created_at DESC,id DESC LIMIT 20`, parameters);
  return {
    configured: !!config?.configured, provider: 'resend', sender: config?.from || '', replyTo: config?.replyTo || '', issue: config?.issue || '', enabled: !!settings?.enabled, counts,
    recent: rows.map(row => {
      const payload = parsePayload(row);
      return {id: row.id, clientId: row.client_id, consoleId: row.console_id, repairId: row.repair_id, to: row.recipient,
        consoleName: typeof payload?.consoleName === 'string' ? payload.consoleName : '', repairCode: typeof payload?.repairCode === 'string' ? payload.repairCode : '', stage: typeof payload?.newStage === 'string' ? payload.newStage : '',
        status: row.status, attempts: Number(row.attempts), createdAt: Number(row.created_at), sentAt: row.sent_at === null ? null : Number(row.sent_at), error: row.error ? (SAFE_ERRORS.has(row.error) ? row.error : 'Une erreur est survenue lors de l’envoi.') : ''};
    }),
  };
}
