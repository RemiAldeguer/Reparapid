// Shared request and response boundary. Domain mutations are injected by each
// host, while every response below names its public fields explicitly.
export const REPAIR_INTAKE_BODY_LIMIT = 48 * 1024;
export class RepairIntakeError extends Error {
  constructor(status, message) {super(message); this.status = status;}
}
export function exactObject(value, names, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(name => !names.includes(name))) {
    throw new RepairIntakeError(400, `${label} invalide.`);
  }
  return value;
}
const text = (value, label, max) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new RepairIntakeError(400, `${label} invalide.`);
  }
  return value.trim();
};
export function intakeRequest(body, validateIntakeInput) {
  exactObject(body, ['intake'], 'La demande');
  try {return validateIntakeInput(body.intake);}
  catch (error) {throw new RepairIntakeError(400, error.message);}
}
export function registrationIntakeRequest(body, {validateIntakeInput, email, checkPassword}) {
  exactObject(body, ['customer', 'password', 'intake'], 'L’inscription');
  const customer = exactObject(body.customer, ['name', 'email', 'phone', 'address'], 'Les coordonnées');
  const address = email(text(customer.email, 'L’adresse e-mail', 254));
  if (!address) throw new RepairIntakeError(400, 'Adresse e-mail invalide.');
  try {checkPassword(body.password);} catch (error) {throw new RepairIntakeError(400, error.message);}
  let intake;
  try {intake = validateIntakeInput(body.intake);} catch (error) {throw new RepairIntakeError(400, error.message);}
  return {
    customer: {name: text(customer.name, 'Le nom', 200), email: address,
      phone: text(customer.phone, 'Le téléphone', 80), address: text(customer.address, 'L’adresse', 1000), notes: ''},
    password: body.password, intake,
  };
}
export function repairIntakeId(value) {
  let result;
  try {result = decodeURIComponent(value);} catch {}
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(result || '')) throw new RepairIntakeError(404, 'Fiche de réparation introuvable.');
  return result;
}
export function repairIntakeSheet(store, clientId, repairId, publicIntakeSettings) {
  const repair = store.repairs.find(item => item.id === repairId);
  const console = repair && store.consoles.find(item => item.id === repair.consoleId && item.clientId === clientId);
  const customer = store.clients.find(item => item.id === clientId);
  if (!repair || !console || !customer) throw new RepairIntakeError(404, 'Fiche de réparation introuvable.');
  return {
    repair: {id: repair.id, code: repair.code, title: repair.title, symptoms: repair.symptoms,
      stage: repair.stage, createdAt: repair.createdAt},
    console: {brand: console.brand, model: console.model, variant: console.variant,
      serial: console.serial, accessories: console.accessories},
    customer: {name: customer.name, email: customer.email, phone: customer.phone, address: customer.address},
    shop: publicIntakeSettings(store),
  };
}

// Older admin clients must not silently drop the key used for retry deduplication
// or the shop's shipping destination. Explicit restore/reset and deletions keep
// their existing semantics.
export function assertIntakeMetadataPreserved(before, data, mode) {
  if (mode !== 'edit') return;
  const next = new Map(data.repairs.map(repair => [repair.id, repair]));
  if (before.repairs.some(repair => repair.publicRequestId && next.has(repair.id)
    && next.get(repair.id).publicRequestId !== repair.publicRequestId)
    || (before.settings.publicIntake !== undefined && data.settings.publicIntake === undefined)) {
    throw new RepairIntakeError(409, 'Votre version de l’atelier est ancienne. Rechargez la page avant de modifier les demandes en ligne et les coordonnées d’envoi.');
  }
}
