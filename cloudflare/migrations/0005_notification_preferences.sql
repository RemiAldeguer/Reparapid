-- Additive: existing settings, messages, accounts and workshop data are kept.
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload))
);
INSERT OR IGNORE INTO notification_preferences(id, payload) VALUES(1, '{}');
