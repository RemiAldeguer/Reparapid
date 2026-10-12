PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role = 'admin')
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admin(id),
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  seen_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS sessions_seen_at ON sessions(seen_at);

CREATE TABLE IF NOT EXISTS limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS limits_expires_at ON limits(expires_at);

CREATE TABLE IF NOT EXISTS workshop (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL CHECK (revision >= 0),
  generation TEXT
);

CREATE TABLE IF NOT EXISTS workshop_chunks (
  generation TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  data TEXT NOT NULL,
  PRIMARY KEY (generation, position)
);

INSERT OR IGNORE INTO workshop(id, revision, generation) VALUES(1, 0, NULL);
