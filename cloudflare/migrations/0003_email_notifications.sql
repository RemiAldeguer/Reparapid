CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
);

CREATE TABLE IF NOT EXISTS repair_notifications (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  console_id TEXT NOT NULL,
  repair_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL,
  claim_token TEXT NOT NULL DEFAULT '',
  lease_until INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER,
  provider_id TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS repair_notifications_delivery
  ON repair_notifications(status, next_attempt_at, lease_until);
CREATE INDEX IF NOT EXISTS repair_notifications_client_created
  ON repair_notifications(client_id, created_at);

INSERT OR IGNORE INTO notification_settings(id, enabled) VALUES(1, 1);
