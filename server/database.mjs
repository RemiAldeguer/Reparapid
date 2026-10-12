import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { emptyStore } from '../tests/.compiled/domain.cjs';
import { NOTIFICATION_SCHEMA } from './repair-notifications.mjs';
import {REGISTRATION_SCHEMA} from './registration-requests.mjs';
import {SAAS_SCHEMA} from './workshop-scope.mjs';
export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY CHECK (id = 1), email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role = 'admin')
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admin(id),
      csrf TEXT NOT NULL, expires_at INTEGER NOT NULL, seen_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS limits (
      key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workshop (
      id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS client_accounts (
      client_id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS client_sessions (
      token_hash TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES client_accounts(client_id) ON DELETE CASCADE,
      csrf TEXT NOT NULL, expires_at INTEGER NOT NULL, seen_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS client_sessions_client_id ON client_sessions(client_id);
    CREATE INDEX IF NOT EXISTS client_sessions_expires_at ON client_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS client_sessions_seen_at ON client_sessions(seen_at);
  `);
  db.exec(NOTIFICATION_SCHEMA);
  db.exec(REGISTRATION_SCHEMA);
  db.exec(SAAS_SCHEMA);
  if (filename !== ':memory:') chmodSync(filename, 0o600);
  const initial = emptyStore();
  db.prepare('INSERT OR IGNORE INTO workshop(id, revision, data) VALUES(1, ?, ?)')
    .run(initial.revision, JSON.stringify(initial));
  return db;
}
export function limit(db, key, max, windowMs, now = Date.now()) {
  db.prepare('DELETE FROM limits WHERE expires_at <= ?').run(now);
  db.prepare(`INSERT INTO limits(key, hits, expires_at) VALUES(?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET hits = hits + 1`).run(key, now + windowMs);
  const row = db.prepare('SELECT hits, expires_at FROM limits WHERE key = ?').get(key);
  return row.hits > max ? Math.max(1, Math.ceil((row.expires_at - now) / 1000)) : 0;
}
