-- Mail inbox + Resend webhook event log (fuelnfreetime)

CREATE TABLE IF NOT EXISTS mail_messages (
  id              TEXT PRIMARY KEY,
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email      TEXT,
  to_email        TEXT,
  subject         TEXT,
  preview         TEXT,
  body_text       TEXT,
  body_html       TEXT,
  status          TEXT NOT NULL DEFAULT 'received',
  provider        TEXT NOT NULL DEFAULT 'resend',
  provider_id     TEXT,
  thread_key      TEXT,
  labels_json     TEXT DEFAULT '[]',
  metadata_json   TEXT DEFAULT '{}',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mail_messages_direction_created
  ON mail_messages(direction, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mail_messages_provider_id
  ON mail_messages(provider_id);

CREATE TABLE IF NOT EXISTS mail_webhook_events (
  id              TEXT PRIMARY KEY,
  channel         TEXT NOT NULL CHECK (channel IN ('outbound', 'inbound')),
  event_type      TEXT NOT NULL,
  provider_id     TEXT,
  payload_json    TEXT NOT NULL,
  received_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mail_webhook_events_channel
  ON mail_webhook_events(channel, received_at DESC);
