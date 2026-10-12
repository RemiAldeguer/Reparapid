export const SAAS_SCHEMA = `
CREATE TABLE IF NOT EXISTS saas_workshops (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS saas_session_index (
  token_hash TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL REFERENCES saas_workshops(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('admin', 'client')),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS saas_session_index_workshop_kind
  ON saas_session_index(workshop_id, kind);
CREATE INDEX IF NOT EXISTS saas_session_index_expires_at
  ON saas_session_index(expires_at);
`;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const scopedNames = new Set([
  'admin', 'sessions', 'limits', 'workshop', 'workshop_chunks', 'client_accounts',
  'client_sessions', 'notification_settings', 'repair_notifications',
  'sessions_expires_at', 'sessions_seen_at', 'limits_expires_at',
  'client_sessions_client_id', 'client_sessions_expires_at', 'client_sessions_seen_at',
  'repair_notifications_delivery', 'repair_notifications_client_created',
]);

export function workshopId(value) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new Error('Identifiant d’atelier invalide.');
  return value.toLowerCase();
}

export function workshopPrefix(id) {
  return `tenant_${workshopId(id).replaceAll('-', '')}_`;
}

// Only static server SQL enters this lexer. Values remain bound separately.
// SQL strings and comments are copied without inspection, while identifiers
// (including quoted ones) are rewritten as whole tokens, never substrings.
export function scopedSQL(sql, id) {
  const prefix = workshopPrefix(id);
  if (typeof sql !== 'string' || sql.includes('\0')) throw new Error('SQL d’atelier invalide.');
  const map = identifier => {
    const normalized = identifier.toLowerCase();
    if (scopedNames.has(normalized)) return prefix + normalized;
    if (normalized.startsWith('tenant_') && !normalized.startsWith(prefix)) {
      throw new Error('Un atelier ne peut pas accéder au namespace d’un autre atelier.');
    }
    return identifier;
  };
  let output = '', i = 0;
  while (i < sql.length) {
    const c = sql[i], next = sql[i + 1];
    if (c === '-' && next === '-') {
      const end = sql.indexOf('\n', i + 2);
      if (end === -1) return output + sql.slice(i);
      output += sql.slice(i, end + 1); i = end + 1; continue;
    }
    if (c === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      if (end === -1) throw new Error('Commentaire SQL incomplet.');
      output += sql.slice(i, end + 2); i = end + 2; continue;
    }
    if (c === "'" || c === '"' || c === '`' || c === '[') {
      const start = i++, closing = c === '[' ? ']' : c;
      let content = '', closed = false;
      while (i < sql.length) {
        if (sql[i] === closing) {
          if (c !== '[' && sql[i + 1] === closing) {content += closing; i += 2; continue;}
          i++; closed = true; break;
        }
        content += sql[i++];
      }
      if (!closed) throw new Error('Valeur ou identifiant SQL incomplet.');
      if (c === "'") output += sql.slice(start, i);
      else {
        const replacement = map(content);
        output += replacement === content ? sql.slice(start, i)
          : c + replacement + closing;
      }
      continue;
    }
    if ([':', '@', '$'].includes(c) && /[A-Za-z_\u0080-\uffff]/.test(next || '')) {
      const start = i++;
      while (/[A-Za-z0-9_$\u0080-\uffff]/.test(sql[i] || '')) i++;
      output += sql.slice(start, i); continue;
    }
    if (/[A-Za-z_\u0080-\uffff]/.test(c)) {
      const start = i++;
      while (/[A-Za-z0-9_$\u0080-\uffff]/.test(sql[i] || '')) i++;
      output += map(sql.slice(start, i)); continue;
    }
    output += c; i++;
  }
  return output;
}

export function scopedDatabase(db, id, {kind = 'node'} = {}) {
  const workshop = workshopId(id);
  if (!['node', 'd1'].includes(kind) || !db || typeof db.prepare !== 'function') {
    throw new Error('Base d’atelier invalide.');
  }
  let savepoint = 0;
  const wrapper = {
    prepare(sql) {return db.prepare(scopedSQL(sql, workshop));},
    exec(sql) {return db.exec(scopedSQL(sql, workshop));},
    batch(statements) {
      if (!Array.isArray(statements)) throw new Error('Lot SQL invalide.');
      if (kind === 'd1') return db.batch(statements);
      const nested = Boolean(db.isTransaction), label = `saas_scope_batch_${++savepoint}`;
      db.exec(nested ? `SAVEPOINT ${label}` : 'BEGIN IMMEDIATE');
      try {
        const results = statements.map(statement => typeof statement?.sql === 'string'
          ? wrapper.prepare(statement.sql).run(...(statement.values || []))
          : statement.run());
        db.exec(nested ? `RELEASE SAVEPOINT ${label}` : 'COMMIT');
        return results;
      } catch (error) {
        if (nested) {db.exec(`ROLLBACK TO SAVEPOINT ${label}`); db.exec(`RELEASE SAVEPOINT ${label}`);}
        else db.exec('ROLLBACK');
        throw error;
      }
    },
    // Closing one workshop must never close the shared connection.
    close() {},
    get isTransaction() {return db.isTransaction;},
  };
  return wrapper;
}

const sharedDDL = [
  `CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY CHECK(id=1), email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role='admin'))`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admin(id),
    csrf TEXT NOT NULL, expires_at INTEGER NOT NULL, seen_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at)`,
  `CREATE INDEX IF NOT EXISTS sessions_seen_at ON sessions(seen_at)`,
  `CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS limits_expires_at ON limits(expires_at)`,
  `CREATE TABLE IF NOT EXISTS workshop_chunks (
    generation TEXT NOT NULL,position INTEGER NOT NULL CHECK(position>=0),data TEXT NOT NULL,
    PRIMARY KEY(generation,position))`,
  `CREATE TABLE IF NOT EXISTS client_accounts (
    client_id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)),
    created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS client_sessions (
    token_hash TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES client_accounts(client_id) ON DELETE CASCADE,
    csrf TEXT NOT NULL,expires_at INTEGER NOT NULL,seen_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS client_sessions_client_id ON client_sessions(client_id)`,
  `CREATE INDEX IF NOT EXISTS client_sessions_expires_at ON client_sessions(expires_at)`,
  `CREATE INDEX IF NOT EXISTS client_sessions_seen_at ON client_sessions(seen_at)`,
  `CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)))`,
  `CREATE TABLE IF NOT EXISTS repair_notifications (
    id TEXT PRIMARY KEY,client_id TEXT NOT NULL,console_id TEXT NOT NULL,repair_id TEXT NOT NULL,
    recipient TEXT NOT NULL,payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','sent','failed','cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),created_at INTEGER NOT NULL,next_attempt_at INTEGER NOT NULL,
    claim_token TEXT NOT NULL DEFAULT '',lease_until INTEGER NOT NULL DEFAULT 0,sent_at INTEGER,
    provider_id TEXT NOT NULL DEFAULT '',error TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS repair_notifications_delivery ON repair_notifications(status,next_attempt_at,lease_until)`,
  `CREATE INDEX IF NOT EXISTS repair_notifications_client_created ON repair_notifications(client_id,created_at)`,
];

function initialJSON(store) {
  const required = ['schemaVersion', 'revision', 'settings', 'clients', 'consoles', 'repairs', 'parts', 'events'];
  const settingNames = ['workshop', 'owner', 'hourlyRate', 'demo', 'lastExportAt'];
  const settings = store?.settings;
  if (!store || Object.keys(store).sort().join() !== required.sort().join()
    || store.schemaVersion !== 1 || store.revision !== 0
    || ['clients', 'consoles', 'repairs', 'parts', 'events'].some(name => !Array.isArray(store[name]) || store[name].length)
    || !settings || Object.keys(settings).sort().join() !== settingNames.sort().join()
    || typeof settings.workshop !== 'string' || !settings.workshop.trim() || settings.workshop.length > 120
    || typeof settings.owner !== 'string' || settings.owner.length > 80
    || !Number.isFinite(settings.hourlyRate) || settings.hourlyRate < 0
    || settings.demo !== false || settings.lastExportAt !== '') {
    throw new Error('Un nouvel atelier doit être créé avec un stockage vide.');
  }
  return JSON.stringify(store);
}

export function provisioningStatements(registration, {at, guard, store}, kind = 'd1') {
  const id = workshopId(registration?.id);
  if (!['node', 'd1'].includes(kind) || !Number.isSafeInteger(at) || at < 0
    || !guard || typeof guard.sql !== 'string' || !guard.sql.trim() || !Array.isArray(guard.values)
    || typeof registration.email !== 'string' || !registration.email
    || typeof registration.password_hash !== 'string' || !registration.password_hash
    || typeof registration.workshop_name !== 'string' || !registration.workshop_name
    || typeof registration.name !== 'string' || !registration.name) {
    throw new Error('Création d’atelier invalide.');
  }
  const data = initialJSON(store);
  const namespace = sql => scopedSQL(sql, id);
  const ddl = [...sharedDDL, kind === 'node'
    ? `CREATE TABLE IF NOT EXISTS workshop (id INTEGER PRIMARY KEY CHECK(id=1),
      revision INTEGER NOT NULL CHECK(revision>=0),data TEXT NOT NULL)`
    : `CREATE TABLE IF NOT EXISTS workshop (id INTEGER PRIMARY KEY CHECK(id=1),
      revision INTEGER NOT NULL CHECK(revision>=0),generation TEXT)`];
  const statements = ddl.map(sql => ({sql: namespace(sql), values: []}));
  const insert = (sql, values) => statements.push({sql: namespace(sql) + ` WHERE ${guard.sql}`,
    values: [...values, ...guard.values]});
  // Global registration and session tables intentionally retain their names.
  insert('INSERT INTO saas_workshops(id,email,name,owner_name,created_at) SELECT ?,?,?,?,?',
    [id, registration.email, registration.workshop_name, registration.name, at]);
  insert("INSERT INTO admin(id,email,password_hash,role) SELECT 1,?,?,'admin'",
    [registration.email, registration.password_hash]);
  insert('INSERT INTO notification_settings(id,enabled) SELECT 1,1', []);
  if (kind === 'node') insert('INSERT INTO workshop(id,revision,data) SELECT 1,0,?', [data]);
  else {
    const generation = `initial_${id.replaceAll('-', '')}`;
    insert('INSERT INTO workshop_chunks(generation,position,data) SELECT ?,0,?', [generation, data]);
    insert('INSERT INTO workshop(id,revision,generation) SELECT 1,0,?', [generation]);
  }
  return statements;
}
