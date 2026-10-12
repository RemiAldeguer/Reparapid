// Keep this module free of Node-only APIs: the same event projection and
// message renderer are used by the local server and the Cloudflare Worker.
export const NOTIFICATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
);

CREATE TABLE IF NOT EXISTS repair_notifications (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  console_id TEXT NOT NULL,
  repair_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL,
  claim_token TEXT NOT NULL DEFAULT '',
  lease_until INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER,
  provider_id TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS repair_notifications_delivery
  ON repair_notifications(status, next_attempt_at, lease_until);
CREATE INDEX IF NOT EXISTS repair_notifications_client_created
  ON repair_notifications(client_id, created_at);

INSERT OR IGNORE INTO notification_settings(id, enabled) VALUES(1, 1);
`;

export const REPAIR_STAGE_LABELS = Object.freeze({
  reception: 'Réception',
  diagnostic: 'Diagnostic',
  'attente-pieces': 'En attente de pièces',
  reparation: 'Réparation en cours',
  tests: 'Tests de validation',
  terminee: 'Terminée',
  irreparable: 'Irréparable',
  abandonnee: 'Abandonnée',
});

function portalURL(origin, workshopId) {
  let url;
  try { url = new URL(origin); } catch { throw new Error('Origine des notifications invalide.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Origine des notifications invalide.');
  }
  if (workshopId != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(workshopId)) throw new Error('Atelier des notifications invalide.');
  return `${url.origin}/${workshopId ? '?atelier=' + workshopId : ''}#/espace-client`;
}

function recipientAddress(value) {
  if (typeof value !== 'string') return '';
  const address = value.trim().toLowerCase();
  return address.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) ? address : '';
}

// Callers provide validated stores and enqueue these rows in the very same
// transaction as the revision CAS. Restores/resets are excluded by the API,
// rather than inferred from mutable workshop history or imported timestamps.
export function repairNotifications(before, after, { origin, workshopId, now = Date.now() }) {
  if (!Number.isSafeInteger(after.revision) || after.revision < 0 ||
      !Number.isSafeInteger(now) || now < 0) throw new Error('Révision ou date de notification invalide.');
  const portalUrl = portalURL(origin, workshopId);
  const previousRepairs = new Map((before.repairs || []).map(item => [item.id, item]));
  const previousConsoles = new Map((before.consoles || []).map(item => [item.id, item]));
  const previousClients = new Map((before.clients || []).map(item => [item.id, item]));
  const consoles = new Map((after.consoles || []).map(item => [item.id, item]));
  const clients = new Map((after.clients || []).map(item => [item.id, item]));
  const notifications = [];
  for (const repair of after.repairs || []) {
    const previous = previousRepairs.get(repair.id);
    if (!previous || previous.consoleId !== repair.consoleId) continue;
    const oldStageId = previous.stage === 'a-commander' ? 'attente-pieces' : previous.stage;
    const newStageId = repair.stage === 'a-commander' ? 'attente-pieces' : repair.stage;
    if (oldStageId === newStageId) continue;
    const console = consoles.get(repair.consoleId);
    const previousConsole = previousConsoles.get(previous.consoleId);
    if (!console?.clientId || previousConsole?.clientId !== console.clientId ||
        !previousClients.has(console.clientId)) continue;
    const client = clients.get(console.clientId);
    const recipient = recipientAddress(client?.email);
    if (!client || !recipient) continue;
    const oldStage = REPAIR_STAGE_LABELS[oldStageId], newStage = REPAIR_STAGE_LABELS[newStageId];
    if (!oldStage || !newStage) throw new Error('Statut de réparation inconnu.');
    const payload = {
      clientName: client.name,
      workshopName: after.settings.workshop,
      consoleName: `${console.brand} ${console.model}`.trim(),
      consoleCode: console.code,
      repairCode: repair.code,
      oldStage,
      newStage,
      portalUrl,
    };
    notifications.push({
      id: `${workshopId ? workshopId + ":" : ""}repair-status:${after.revision}:${repair.id}`,
      client_id: client.id,
      console_id: console.id,
      repair_id: repair.id,
      recipient,
      payload: JSON.stringify(payload),
      created_at: now,
      next_attempt_at: now,
    });
  }
  return notifications;
}

const line = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
const escapeHTML = value => line(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function renderRepairNotification(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Message de notification invalide.');
  const { clientName, workshopName, consoleName, consoleCode, repairCode, oldStage, newStage } =
    Object.fromEntries(['clientName', 'workshopName', 'consoleName', 'consoleCode', 'repairCode', 'oldStage', 'newStage']
      .map(key => [key, line(payload[key])]));
  let url;
  try { url = new URL(payload.portalUrl); } catch { throw new Error('Lien de suivi invalide.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      portalURL(url.origin, url.searchParams.get('atelier') || undefined) !== url.href) throw new Error('Lien de suivi invalide.');
  const portalUrl = url.href;
  const subject = `${workshopName} · ${consoleName} : ${newStage}`;
  const text = [
    `Bonjour ${clientName},`, '',
    `Le statut de la réparation de votre ${consoleName} (${consoleCode}) a changé.`,
    `Dossier : ${repairCode}`, `Ancien statut : ${oldStage}`, `Nouveau statut : ${newStage}`, '',
    `Consultez le suivi de vos consoles dans votre espace client : ${portalUrl}`,
    'Si vous ne disposez pas encore d’un accès, contactez l’atelier.', '',
    `À bientôt,`, `L’équipe de ${workshopName}`,
  ].join('\n');
  const e = escapeHTML;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${e(subject)}</title></head>
<body style="margin:0;padding:28px 12px;background:#f5f4ed;color:#243c34;font-family:Arial,Helvetica,sans-serif;line-height:1.6">
  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#fffdf7;border:1px solid #e2e6dc;border-radius:16px">
    <tr><td style="padding:24px 28px;background:#163c30;color:#f9f6e8;border-radius:15px 15px 0 0"><strong style="font-size:22px">${e(workshopName)}</strong><br><span style="font-size:13px;color:#b9d4b5">Le suivi de votre réparation</span></td></tr>
    <tr><td style="padding:28px"><p style="margin:0 0 16px">Bonjour ${e(clientName)},</p>
      <p>La réparation de votre <strong>${e(consoleName)}</strong> a changé de statut.</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;background:#f1f5ec;border-radius:10px;margin:20px 0"><tr><td style="padding:18px 20px">
        <span style="font-size:12px;color:#58705f">NOUVEAU STATUT</span><br><strong style="font-size:23px;color:#163c30">${e(newStage)}</strong><br>
        <span style="font-size:13px;color:#58705f">Précédemment : ${e(oldStage)}</span></td></tr></table>
      <p style="font-size:14px;color:#58705f">Console ${e(consoleCode)} · Dossier ${e(repairCode)}</p>
      <p style="margin:24px 0"><a href="${e(portalUrl)}" style="display:inline-block;padding:12px 20px;background:#163c30;color:#fffdf7;text-decoration:none;border-radius:8px;font-weight:bold">Consulter mon espace client</a></p>
      <p style="font-size:13px;color:#58705f">Si vous ne disposez pas encore d’un accès, contactez l’atelier.</p>
      <p style="margin-top:24px">À bientôt,<br>L’équipe de ${e(workshopName)}</p>
    </td></tr>
  </table>
</body></html>`;
  return { subject, text, html };
}
