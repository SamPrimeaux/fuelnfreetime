-- IAM-parity auth_users + auth_sessions for Fuel & Free Time
-- Run: npm run db:migrate:auth-users
-- Migrates legacy admin_users → auth_users; sessions use auth_sessions (TEXT user_id)

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS auth_users (
  id                      TEXT PRIMARY KEY,
  email                   TEXT UNIQUE NOT NULL,
  name                    TEXT,
  password_hash           TEXT NOT NULL,
  salt                    TEXT NOT NULL,
  created_at              TEXT DEFAULT (datetime('now')),
  updated_at              TEXT DEFAULT (datetime('now')),
  tenant_id               TEXT,
  is_superadmin           INTEGER DEFAULT 0,
  superadmin_group_id     TEXT,
  is_verified             INTEGER NOT NULL DEFAULT 0,
  verified_at             INTEGER,
  superadmin_uuid         TEXT,
  superadmin_identity_id  TEXT,
  person_uuid             TEXT,
  supabase_user_id        TEXT,
  status                  TEXT DEFAULT 'active',
  active_tenant_id        TEXT,
  active_workspace_id     TEXT,
  display_name            TEXT,
  avatar_url              TEXT,
  last_login_at           INTEGER,
  login_count             INTEGER DEFAULT 0,
  phone                   TEXT,
  mfa_enabled             INTEGER DEFAULT 0,
  timezone                TEXT DEFAULT 'America/Chicago',
  user_key                TEXT,
  default_workspace_id    TEXT,
  role                    TEXT NOT NULL DEFAULT 'member',
  account_type            TEXT NOT NULL DEFAULT 'human',
  identity_label          TEXT,
  iam_owned               INTEGER NOT NULL DEFAULT 0,
  downgrade_protected     INTEGER NOT NULL DEFAULT 0,
  notification_email      TEXT,
  plan                    TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id      TEXT,
  meta_json               TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_auth_users_tenant ON auth_users(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

-- Migrate legacy admin_users (INTEGER id) → auth_users (TEXT id)
INSERT OR IGNORE INTO auth_users (
  id,
  email,
  name,
  password_hash,
  salt,
  tenant_id,
  role,
  display_name,
  active_tenant_id,
  active_workspace_id,
  default_workspace_id,
  is_verified,
  verified_at,
  status,
  timezone,
  account_type,
  created_at,
  updated_at
)
SELECT
  'au_legacy_' || id,
  email,
  CASE
    WHEN email = 'jmoeee21@yahoo.com' THEN 'Justin Molaison'
    WHEN email = 'admin@fuelnfreetime.com' THEN 'Site Admin'
    ELSE email
  END,
  password_hash,
  password_salt,
  'tenant_fuelnfreetime',
  CASE
    WHEN email = 'jmoeee21@yahoo.com' THEN 'owner'
    ELSE 'admin'
  END,
  CASE
    WHEN email = 'jmoeee21@yahoo.com' THEN 'Justin Molaison'
    WHEN email = 'admin@fuelnfreetime.com' THEN 'Site Admin'
    ELSE email
  END,
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'ws_fuelnfreetime',
  1,
  unixepoch(),
  'active',
  'America/Chicago',
  'human',
  created_at,
  datetime('now')
FROM admin_users
WHERE email IS NOT NULL;

PRAGMA foreign_keys = ON;
