CREATE TABLE IF NOT EXISTS client_accounts (
  client_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS client_sessions (
  token_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client_accounts(client_id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  seen_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS client_sessions_client_id ON client_sessions(client_id);
CREATE INDEX IF NOT EXISTS client_sessions_expires_at ON client_sessions(expires_at);
CREATE INDEX IF NOT EXISTS client_sessions_seen_at ON client_sessions(seen_at);
