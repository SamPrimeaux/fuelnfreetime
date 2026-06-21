-- Team mailboxes on fuelnfreetime.com (Resend send + inbound route by address)

CREATE TABLE IF NOT EXISTS mail_mailboxes (
  id              TEXT PRIMARY KEY,
  address         TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('personal', 'payments', 'system', 'shared')),
  owner_name      TEXT,
  owner_auth_email TEXT,
  resend_from_name TEXT,
  is_default_send INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mail_mailboxes_sort ON mail_mailboxes(sort_order ASC);
