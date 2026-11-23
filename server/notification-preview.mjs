import {NOTIFICATION_EVENTS, REPAIR_STAGE_LABELS, renderRepairNotification} from './repair-notifications.mjs';

const eventVariants = {
  created: [{key: 'request', label: 'Demande depuis le site'}, {key: 'workshop', label: 'Dossier créé à l’atelier'}],
  'proposal-published': [{key: 'repairable', label: 'Console réparable'}, {key: 'unrepairable', label: 'Console irréparable'}],
  'proposal-decided': [{key: 'repair', label: 'Réparation acceptée'}, {key: 'return', label: 'Retour demandé'}, {key: 'buyback', label: 'Rachat accepté'}],
  'return-dispatched': [{key: 'tracked', label: 'Avec suivi de colis'}, {key: 'untracked', label: 'Sans suivi renseigné'}],
  'delivery-chosen':[{key:'pickup',label:'Retrait en magasin'},{key:'shipping',label:'Envoi inclus'}],
  'delivery-completed':[{key:'pickup',label:'Console remise'},{key:'shipping',label:'Console expédiée'}],
};

/** Read-only examples: never load a customer, enqueue a notification or call a provider. */
export function notificationPreview(searchParams) {
  const allowed = ['event', 'audience', 'variant'];
  if ([...searchParams.keys()].some(key => !allowed.includes(key) || searchParams.getAll(key).length !== 1)) {
    throw new Error('Aperçu d’e-mail invalide.');
  }
  const eventType = searchParams.get('event'), audience = searchParams.get('audience');
  const event = NOTIFICATION_EVENTS.find(item => item.key === eventType);
  if (!event || !['client', 'shop'].includes(audience)) throw new Error('Aperçu d’e-mail invalide.');
  const variants = eventVariants[eventType] || [{key: 'default', label: 'Exemple'}];
  const variant = searchParams.has('variant') ? searchParams.get('variant') : variants[0].key;
  if (!variants.some(item => item.key === variant)) throw new Error('Aperçu d’e-mail invalide.');
  const newStage = Object.hasOwn(REPAIR_STAGE_LABELS, eventType) ? REPAIR_STAGE_LABELS[eventType]
    : REPAIR_STAGE_LABELS[eventType === 'created' && variant === 'request' ? 'attente-envoi'
      : eventType === 'proposal-published' || (eventType === 'proposal-decided' && variant === 'repair') ? 'diagnostic'
      : eventType.startsWith('delivery-')?'terminee':'reception'];
  const payload = {
    version: 2, eventType, audience,
    workshopName: 'RépaRapid · Maxxi Games', clientName: 'Camille Exemple',
    consoleName: 'Sony PlayStation 5', consoleCode: 'CON-EXEMPLE', repairCode: 'REP-EXEMPLE',
    oldStage: REPAIR_STAGE_LABELS.reception, newStage,
    portalUrl: `https://reparapid.example.invalid/#/${audience === 'client' ? 'espace-client' : 'repairs/dossier-exemple'}`,
    ...(eventType === 'proposal-published' ? {proposalKind: variant === 'unrepairable' ? 'unrepairable' : 'repair'} : {}),
    ...(eventType === 'proposal-decided' ? {decision: variant} : {}),
    ...(eventType === 'return-dispatched' && variant === 'tracked' ? {tracking: 'EXEMPLE-SUIVI'} : {}),
    ...(eventType.startsWith('delivery-')?{deliveryMethod:variant}:{}),
    ...(eventType==='delivery-completed'&&variant==='shipping'?{tracking:'EXEMPLE-SUIVI'}:{}),
  };
  return {
    eventType, eventLabel: event.label, audience, variant,
    variants: variants.map(item => ({...item})),
    ...renderRepairNotification(payload),
    recipient: audience === 'client' ? 'camille@example.invalid' : 'magasin@example.invalid',
    sender: 'RépaRapid <expediteur@example.invalid>', sample: true,
  };
}
