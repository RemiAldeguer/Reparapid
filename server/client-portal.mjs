// The client response is an explicit allowlist. Internal workshop data must
// never become public just because a new field is added to the store.
// Hosts inject the canonical domain calculation; only its public total is returned.
export function clientPortal(store, clientId, calculateTotalCost) {
  const client = (store.clients || []).find(item => item.id === clientId);
  if (!client) return null;
  const consoles = store.consoles.filter(item => item.clientId === clientId).map(item => ({
    id: item.id, code: item.code, brand: item.brand, model: item.model,
    variant: item.variant, serial: item.serial, state: item.state, accessories: item.accessories,
  }));
  const owned = new Set(consoles.map(item => item.id));
  const repairs = store.repairs.filter(item => owned.has(item.consoleId)).map(item => ({
    id: item.id, code: item.code, consoleId: item.consoleId, title: item.title,
    symptoms: item.symptoms, stage: item.stage === 'a-commander' ? 'attente-pieces' : item.stage,
    dueDate: item.dueDate, totalCost: calculateTotalCost(store, item),
    createdAt: item.createdAt, updatedAt: item.updatedAt, completedAt: item.completedAt,
    ...(item.clientParts === undefined ? {} : {clientParts: item.clientParts.map(part => ({
      id: part.id, name: part.name, quantity: part.quantity, note: part.note, status: part.status,
    }))}),
  }));
  return { workshop: {name: store.settings.workshop}, client: { name: client.name }, consoles, repairs };
}

export const clientAccess = row => row ? ({
  email: row.email, enabled: row.enabled === 1, createdAt: row.created_at, updatedAt: row.updated_at,
}) : null;

export const clientUser = (row, name) => ({
  user: { email: row.email, role: 'client', clientId: row.client_id, name },
  csrfToken: row.csrf, expiresAt: row.expires_at,
});
