import { emptyStore } from '../src/domain.ts';
import { notificationBatches, insertNotificationsSQL } from '../server/notification-storage.mjs';

// D1 limits a single TEXT value to 2 MB. A UTF-16 chunk of this size is at
// most 750 KB in UTF-8; a surrogate pair always stays in the same chunk.
const CHUNK_UNITS = 250000;
const CHUNKS_PER_INSERT = 40;
const MAX_STORE_BYTES = 20 * 1024 * 1024;
const encoder = new TextEncoder();
export class StoreSizeError extends Error {}

export async function initWorkshop(db) {
  await db.prepare('INSERT OR IGNORE INTO workshop(id, revision, generation) VALUES(1, 0, NULL)').run();
}

export async function limit(db, key, max, windowMs, now = Date.now()) {
  const results = await db.batch([
    db.prepare(`INSERT INTO limits(key, hits, expires_at) VALUES(?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        hits = CASE WHEN limits.expires_at <= ? THEN 1 ELSE limits.hits + 1 END,
        expires_at = CASE WHEN limits.expires_at <= ? THEN excluded.expires_at ELSE limits.expires_at END
      RETURNING hits, expires_at`).bind(key, now + windowMs, now, now),
    // Expired keys cannot accumulate indefinitely, and each cleanup is bounded.
    db.prepare(`DELETE FROM limits WHERE key IN
      (SELECT key FROM limits WHERE expires_at <= ? LIMIT 100)`).bind(now),
  ]);
  const row = results[0].results[0];
  return row.hits > max ? Math.max(1, Math.ceil((row.expires_at - now) / 1000)) : 0;
}

export async function readWorkshop(db) {
  // A single query observes the generation and its fragments together. Reading
  // them separately would race with a save removing the previous generation.
  const { results } = await db.prepare(`SELECT w.revision, w.generation, c.position, c.data
    FROM workshop w LEFT JOIN workshop_chunks c ON c.generation = w.generation
    WHERE w.id = 1 ORDER BY c.position`).all();
  const metadata = results[0];
  if (!metadata || metadata.generation === null) {
    return { ...emptyStore(), revision: metadata?.revision ?? 0 };
  }
  if (results.some((row, position) => row.position !== position || typeof row.data !== 'string')) {
    throw new Error('Les fragments de l’atelier sont incomplets.');
  }
  const store = JSON.parse(results.map(row => row.data).join(''));
  if (store.revision !== metadata.revision) throw new Error('La révision de l’atelier est incohérente.');
  return store;
}

function splitJSON(text) {
  const chunks = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + CHUNK_UNITS, text.length);
    if (end < text.length) {
      const last = text.charCodeAt(end - 1);
      const next = text.charCodeAt(end);
      if (last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end--;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

// The revision and authorization guards run inside the same D1 transaction as
// every fragment and the publication. A rejected guard inserts no fragments.
const saveGuard = `EXISTS (
  SELECT 1 FROM workshop w WHERE w.id = 1 AND w.revision = ?
    AND EXISTS (SELECT 1 FROM sessions s JOIN admin a ON a.id = s.admin_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND s.seen_at > ? AND a.role = 'admin')
)`;

const clientSaveGuard = `EXISTS (
  SELECT 1 FROM workshop w WHERE w.id=1 AND w.revision=?
    AND EXISTS (SELECT 1 FROM client_sessions s JOIN client_accounts a ON a.client_id=s.client_id
      WHERE s.token_hash=? AND s.client_id=? AND s.csrf=? AND s.expires_at>? AND s.seen_at>? AND a.enabled=1)
)`;

export async function saveWorkshop(db, { expectedRevision, data, tokenHash, now, idleMs, notifications = [], cancelNotifications = false, clientAuth = null }) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= 1e9) {
    throw new Error('Révision invalide.');
  }
  const text = JSON.stringify({ ...data, revision: expectedRevision + 1 });
  if (encoder.encode(text).byteLength > MAX_STORE_BYTES) throw new StoreSizeError('L’atelier dépasse 20 Mio.');
  const chunks = splitJSON(text);
  const generation = crypto.randomUUID();
  const guard = clientAuth ? clientSaveGuard : saveGuard;
  const guardValues = clientAuth
    ? [expectedRevision, tokenHash, clientAuth.clientId, clientAuth.csrf, now, now - idleMs]
    : [expectedRevision, tokenHash, now, now - idleMs];
  const statements = [];
  for (let start = 0; start < chunks.length; start += CHUNKS_PER_INSERT) {
    const group = chunks.slice(start, start + CHUNKS_PER_INSERT);
    const rows = group.map((_, index) => index === 0
      ? 'SELECT ? AS position, ? AS data' : 'SELECT ?, ?').join(' UNION ALL ');
    const values = group.flatMap((chunk, index) => [start + index, chunk]);
    // Grouped inserts keep even a 20 MiB store under the Free plan's query
    // limit, while remaining below D1's 100 bound-parameter limit per query.
    statements.push(db.prepare(`INSERT INTO workshop_chunks(generation, position, data)
      SELECT ?, part.position, part.data FROM (${rows}) part WHERE ${guard}`)
      .bind(generation, ...values, ...guardValues));
  }
  const publicationIndex = statements.length;
  statements.push(db.prepare(`UPDATE workshop SET revision = ?, generation = ?
    WHERE id = 1 AND ${guard}`).bind(expectedRevision + 1, generation, ...guardValues));
  for (const batch of notificationBatches(notifications)) {
    statements.push(db.prepare(insertNotificationsSQL +
      ' AND EXISTS (SELECT 1 FROM workshop WHERE id=1 AND generation=?)').bind(batch, generation));
  }
  if (cancelNotifications) {
    statements.push(db.prepare(`UPDATE repair_notifications SET status='cancelled',claim_token='',lease_until=0,
      error='L’atelier a été restauré ou réinitialisé.' WHERE status='pending'
      AND EXISTS (SELECT 1 FROM workshop WHERE id=1 AND generation=?)`).bind(generation));
  }
  statements.push(db.prepare(`DELETE FROM workshop_chunks
    WHERE generation NOT IN (SELECT generation FROM workshop WHERE generation IS NOT NULL)`));
  // Client removal and session revocation share the publication transaction.
  // Guard with its fresh random generation so rejected/stale saves have no
  // effect on any account, including accounts created concurrently.
  if (!clientAuth) {
  statements.push(db.prepare(`UPDATE client_accounts SET enabled=0,updated_at=? WHERE enabled=1
    AND client_id NOT IN (SELECT value FROM json_each(?))
    AND EXISTS (SELECT 1 FROM workshop WHERE id=1 AND generation=?)`)
    .bind(now, JSON.stringify((data.clients || []).map(client => client.id)), generation));
  statements.push(db.prepare(`DELETE FROM client_sessions WHERE client_id IN (SELECT client_id FROM client_accounts WHERE enabled=0)
    AND EXISTS (SELECT 1 FROM workshop WHERE id=1 AND generation=?)`).bind(generation));
  }
  const results = await db.batch(statements);
  return results[publicationIndex].meta.changes === 1;
}

// The caller builds a fresh snapshot with the single domain action. Authorization
// and the workshop revision are checked again at the atomic publication boundary.
export function saveClientWorkshop(db, {expectedRevision, data, tokenHash, clientId, csrf, now, idleMs}) {
  return saveWorkshop(db, {expectedRevision, data, tokenHash, now, idleMs, clientAuth: {clientId, csrf}});
}
