CREATE TABLE IF NOT EXISTS registration_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  workshop_name TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT NOT NULL DEFAULT '',
  review_note TEXT NOT NULL DEFAULT '',
  review_token TEXT NOT NULL DEFAULT '',
  CHECK ((status = 'pending' AND password_hash IS NOT NULL AND reviewed_at IS NULL)
    OR (status <> 'pending' AND password_hash IS NULL AND reviewed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS registration_requests_status_created
  ON registration_requests(status, created_at DESC);

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
