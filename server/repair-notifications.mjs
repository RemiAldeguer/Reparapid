// Keep this module free of Node-only APIs: the same event projection and
// message renderer are used by the local server and the Cloudflare Worker.
export const NOTIFICATION_PREFERENCES_SCHEMA = `
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload))
);
INSERT OR IGNORE INTO notification_preferences(id, payload) VALUES(1, '{}');
`;

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
${NOTIFICATION_PREFERENCES_SCHEMA}
`;

export const REPAIR_STAGE_LABELS = Object.freeze({
  'attente-envoi': 'En attente d’envoi',
  reception: 'Réception',
  diagnostic: 'Diagnostic',
  'attente-pieces': 'En attente de pièces',
  reparation: 'Réparation en cours',
  tests: 'Tests de validation',
  terminee: 'Terminée',
  irreparable: 'Irréparable',
  abandonnee: 'Abandonnée',
});

export const NOTIFICATION_EVENTS = Object.freeze([
  {key: 'created', label: 'Demande ou dossier créé'},
  ...Object.entries(REPAIR_STAGE_LABELS).map(([key, label]) => ({key, label})),
  {key: 'proposal-published', label: 'Diagnostic et proposition publiés'},
  {key: 'proposal-decided', label: 'Choix du client enregistré'},
  {key: 'return-transfer-declared', label: 'Virement de retour déclaré'},
  {key: 'return-payment-confirmed', label: 'Virement de retour reçu'},
  {key: 'return-dispatched', label: 'Retour expédié'},
  {key: 'buyback-completed', label: 'Rachat finalisé'},
].map(Object.freeze));
const eventLabels = Object.fromEntries(NOTIFICATION_EVENTS.map(({key, label}) => [key, label]));
const audiences = ['client', 'shop'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export function normalizeNotificationPreferences(value) {
  return Object.fromEntries(audiences.map(audience => [audience,
    Object.fromEntries(NOTIFICATION_EVENTS.map(({key}) => [key, value?.[audience]?.[key] !== false])),
  ]));
}

export function validateNotificationPreferences(value) {
  if (!object(value) || Object.keys(value).some(key => !audiences.includes(key))) throw new Error('Préférences de notification invalides.');
  for (const audience of audiences) if (Object.hasOwn(value, audience)) {
    if (!object(value[audience]) || Object.entries(value[audience]).some(([key, enabled]) => !Object.hasOwn(eventLabels, key) || typeof enabled !== 'boolean')) {
      throw new Error('Préférences de notification invalides.');
    }
  }
  return normalizeNotificationPreferences(value);
}

export function notificationEventLabel(key) {return eventLabels[key] || '';}

export function notificationMetadata(payload) {
  if (payload?.version === undefined) {
    const eventType = Object.entries(REPAIR_STAGE_LABELS).find(([, label]) => label === payload?.newStage)?.[0] || '';
    return {audience: 'client', eventType, eventLabel: eventLabels[eventType] || payload?.newStage || ''};
  }
  if (payload.version !== 2 || !audiences.includes(payload.audience) || !Object.hasOwn(eventLabels, payload.eventType)) throw new Error('Message de notification invalide.');
  return {audience: payload.audience, eventType: payload.eventType, eventLabel: eventLabels[payload.eventType]};
}

function portalURL(origin, workshopId, repairId) {
  let url;
  try { url = new URL(origin); } catch { throw new Error('Origine des notifications invalide.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Origine des notifications invalide.');
  }
  if (workshopId != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(workshopId)) throw new Error('Atelier des notifications invalide.');
  if (repairId !== undefined && !/^[A-Za-z0-9_-]{1,120}$/.test(repairId)) throw new Error('Dossier des notifications invalide.');
  return `${url.origin}/${workshopId ? '?atelier=' + workshopId : ''}#/${repairId === undefined ? 'espace-client' : 'repairs/' + repairId}`;
}

export function notificationRecipient(value) {
  if (typeof value !== 'string') return '';
  const address = value.trim().toLowerCase();
  return address.length <= 254 && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(address) ? address : '';
}

function repairEvents(previous, repair) {
  if (!previous) return ['created'];
  const events = [], oldProposal = previous.proposal, proposal = repair.proposal;
  const sameProposal = proposal && oldProposal?.id === proposal.id;
  if (proposal && !sameProposal) events.push('proposal-published');
  const decided = sameProposal && oldProposal.decision === 'pending' && proposal.decision !== 'pending';
  if (decided) events.push('proposal-decided');
  if (sameProposal) for (const [field, event] of [
    ['transferDeclaredAt', 'return-transfer-declared'], ['returnPaidAt', 'return-payment-confirmed'],
    ['returnedAt', 'return-dispatched'], ['buybackCompletedAt', 'buyback-completed'],
  ]) if (!oldProposal[field] && proposal[field]) events.push(event);
  const canonical = stage => stage === 'a-commander' ? 'attente-pieces' : stage;
  if (canonical(previous.stage) !== canonical(repair.stage) && !decided) events.push(canonical(repair.stage));
  return events;
}

// Callers provide validated stores and enqueue these rows in the very same
// transaction as the revision CAS. Restores/resets are excluded by the API,
// rather than inferred from mutable workshop history or imported timestamps.
export function repairNotifications(before, after, { origin, workshopId, now = Date.now() }) {
  if (!Number.isSafeInteger(after.revision) || after.revision < 0 ||
      !Number.isSafeInteger(now) || now < 0) throw new Error('Révision ou date de notification invalide.');
  const clientPortalUrl = portalURL(origin, workshopId);
  const previousRepairs = new Map((before.repairs || []).map(item => [item.id, item]));
  const previousConsoles = new Map((before.consoles || []).map(item => [item.id, item]));
  const previousClients = new Map((before.clients || []).map(item => [item.id, item]));
  const consoles = new Map((after.consoles || []).map(item => [item.id, item]));
  const clients = new Map((after.clients || []).map(item => [item.id, item]));
  const notifications = [];
  for (const repair of after.repairs || []) {
    const previous = previousRepairs.get(repair.id);
    if (previous && previous.consoleId !== repair.consoleId) continue;
    const oldStageId = previous?.stage === 'a-commander' ? 'attente-pieces' : previous?.stage;
    const newStageId = repair.stage === 'a-commander' ? 'attente-pieces' : repair.stage;
    const events = repairEvents(previous, repair);
    if (!events.length) continue;
    const console = consoles.get(repair.consoleId);
    const previousConsole = previousConsoles.get(repair.consoleId);
    if (!console?.clientId || (previousConsole && previousConsole.clientId !== console.clientId) ||
        (previous && (!previousConsole || !previousClients.has(console.clientId)))) continue;
    const client = clients.get(console.clientId);
    if (!client) continue;
    const oldStage = REPAIR_STAGE_LABELS[oldStageId] || '', newStage = REPAIR_STAGE_LABELS[newStageId];
    if (!newStage || events.some(event => !Object.hasOwn(eventLabels, event))) throw new Error('Statut de réparation inconnu.');
    const common = {
      clientName: client.name,
      workshopName: after.settings.workshop,
      consoleName: `${console.brand} ${console.model}`.trim(),
      consoleCode: console.code,
      repairCode: repair.code,
      oldStage,
      newStage,
    };
    for (const eventType of events) for (const audience of audiences) {
      const recipient = notificationRecipient(audience === 'client' ? client.email : after.settings.publicIntake?.email);
      if (!recipient) continue;
      const payload = {version: 2, audience, eventType, ...common,
        portalUrl: audience === 'client' ? clientPortalUrl : portalURL(origin, workshopId, repair.id),
        ...(eventType === 'proposal-decided' ? {decision: repair.proposal.decision} : {}),
        ...(eventType === 'proposal-published' ? {proposalKind: repair.proposal.kind} : {}),
        ...(eventType === 'return-dispatched' ? {tracking: repair.proposal.tracking} : {}),
      };
      notifications.push({
      id: `${workshopId ? workshopId + ':' : ''}repair-event:${after.revision}:${repair.id}:${eventType}:${audience}`,
      client_id: client.id,
      console_id: console.id,
      repair_id: repair.id,
      recipient,
      payload: JSON.stringify(payload),
      created_at: now,
      next_attempt_at: now,
      });
    }
  }
  return notifications;
}

const line = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
const escapeHTML = value => line(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function renderLifecycleNotification(payload) {
  const {audience, eventType, eventLabel} = notificationMetadata(payload);
  const workshopName = line(payload.workshopName), consoleName = line(payload.consoleName);
  const clientName = line(payload.clientName), consoleCode = line(payload.consoleCode), repairCode = line(payload.repairCode);
  let url;
  try {url = new URL(payload.portalUrl);} catch {throw new Error('Lien de suivi invalide.');}
  const repairId = audience === 'shop' ? /^#\/repairs\/([A-Za-z0-9_-]{1,120})$/.exec(url.hash)?.[1] : undefined;
  if (audience === 'shop' && !repairId) throw new Error('Lien de suivi invalide.');
  let expectedURL;
  try {expectedURL = portalURL(url.origin, url.searchParams.get('atelier') || undefined, repairId);} catch {throw new Error('Lien de suivi invalide.');}
  if (expectedURL !== url.href) throw new Error('Lien de suivi invalide.');
  const decision = {repair: 'La réparation proposée est acceptée.', return: 'Le retour de la console est demandé.', buyback: 'Le rachat pour pièces proposé est accepté.'};
  const descriptions = {
    created: payload.newStage === REPAIR_STAGE_LABELS['attente-envoi']
      ? 'La demande de réparation est enregistrée. Imprimez la fiche et préparez le colis selon les consignes d’envoi du dossier.'
      : 'Le dossier de réparation est enregistré. Consultez son suivi pour connaître les prochaines étapes.',
    'attente-envoi': 'Imprimez la fiche et préparez le colis selon les consignes d’envoi du dossier.',
    reception: 'La console est bien arrivée à l’atelier.',
    diagnostic: 'L’atelier analyse la console avant de publier sa proposition.',
    'attente-pieces': 'L’atelier attend les pièces nécessaires à la suite de la réparation.',
    reparation: 'L’intervention sur la console est en cours.',
    tests: 'Le fonctionnement de la console est en cours de contrôle.',
    terminee: 'La réparation est terminée. Contactez l’atelier pour convenir du retrait ou du retour de la console.',
    irreparable: 'La console est déclarée irréparable. Consultez le dossier et les options proposées par l’atelier.',
    abandonnee: 'L’intervention est clôturée. Consultez le dossier pour connaître la suite avec l’atelier.',
    'proposal-published': payload.proposalKind === 'unrepairable'
      ? 'Le diagnostic indique que la console est irréparable. Consultez les choix proposés dans le dossier.'
      : 'Le diagnostic et le devis sont disponibles. Consultez la proposition dans le dossier pour choisir la suite.',
    'proposal-decided': decision[payload.decision],
    'return-transfer-declared': 'Le client déclare avoir effectué le virement des frais de retour. Sa réception doit être confirmée par le magasin.',
    'return-payment-confirmed': 'Le magasin confirme avoir reçu le virement des frais de retour.',
    'return-dispatched': 'Le magasin a expédié le retour de la console.',
    'buyback-completed': 'Le magasin a finalisé le rachat pour pièces accepté.',
  };
  const description = descriptions[eventType];
  if (!description || (eventType === 'proposal-decided' && !Object.hasOwn(decision, payload.decision))) throw new Error('Message de notification invalide.');
  const greeting = audience === 'client' ? `Bonjour ${clientName},` : 'Bonjour,';
  const action = audience === 'client' ? 'Consulter mon espace client' : 'Consulter le dossier';
  const tracking = eventType === 'return-dispatched' && line(payload.tracking) ? `Suivi du retour : ${line(payload.tracking)}` : '';
  const subject = `${workshopName} · ${consoleName} : ${eventLabel}`;
  const text = [greeting, '', `${consoleName} (${consoleCode}) · Dossier ${repairCode}`,
    ...(audience === 'shop' ? [`Client : ${clientName}`] : []), eventLabel,
    ...(Object.hasOwn(REPAIR_STAGE_LABELS, eventType) ? [`Nouveau statut : ${eventLabel}`] : []), description,
    ...(tracking ? [tracking] : []), '', `${action} : ${url.href}`, '', `L’équipe de ${workshopName}`].join('\n');
  const e = escapeHTML;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${e(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f5f5f5;color:#292929;font-family:Arial,Helvetica,sans-serif;line-height:1.6">
<table role="presentation" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse;background:white;border:1px solid #ddd">
<tr><td style="padding:24px;background:#161616;color:white"><strong style="font-size:22px">${e(workshopName)}</strong></td></tr>
<tr><td style="padding:28px"><p>${e(greeting)}</p><h1 style="font-size:23px;color:#a32720">${e(eventLabel)}</h1>
<p><strong>${e(consoleName)}</strong> · ${e(consoleCode)}<br>Dossier ${e(repairCode)}${audience === 'shop' ? `<br>Client : ${e(clientName)}` : ''}</p>
<p>${e(description)}</p>${tracking ? `<p>${e(tracking)}</p>` : ''}
<p style="margin:24px 0"><a href="${e(url.href)}" style="display:inline-block;padding:12px 20px;background:#a32720;color:white;text-decoration:none;border-radius:6px;font-weight:bold">${e(action)}</a></p>
<p>L’équipe de ${e(workshopName)}</p></td></tr></table></body></html>`;
  return {subject, text, html};
}

export function renderRepairNotification(payload) {
  if (payload?.version !== undefined) return renderLifecycleNotification(payload);
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
