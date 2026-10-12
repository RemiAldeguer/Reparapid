export class ClientPartAvailabilityError extends Error {
  constructor(status, message) {super(message); this.status = status;}
}

export function availablePartRequest(repairValue, partValue, body) {
  if (Object.keys(body).length !== 0) throw new ClientPartAvailabilityError(400, 'Cette action accepte uniquement un objet JSON vide.');
  let repairId, partId;
  try {repairId = decodeURIComponent(repairValue); partId = decodeURIComponent(partValue);} catch {}
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(repairId || '') || !/^[A-Za-z0-9_-]{1,120}$/.test(partId || '')) {
    throw new ClientPartAvailabilityError(404, 'Pièce client introuvable dans ce dossier.');
  }
  return {repairId, partId};
}

// Validate only this client's supplied part, before entering the domain action.
// Missing and foreign identifiers have the same response on both hosts.
export function assertAvailablePart(store, clientId, repairId, partId) {
  const repair = store.repairs.find(item => item.id === repairId);
  const console = repair && store.consoles.find(item => item.id === repair.consoleId);
  const part = repair?.clientParts?.find(item => item.id === partId);
  if (!store.clients.some(item => item.id === clientId) || !console || console.clientId !== clientId || !part) {
    throw new ClientPartAvailabilityError(404, 'Pièce client introuvable dans ce dossier.');
  }
  if (!['en-attente', 'disponible'].includes(part.status)) {
    throw new ClientPartAvailabilityError(409, 'Cette pièce a déjà été livrée ou installée.');
  }
}
