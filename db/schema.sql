-- Fuel & Free Time — D1 schema

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL UNIQUE,
  source_page  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Admin auth =====

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
  is_verified             INTEGER NOT NULL DEFAULT 0,
  verified_at             INTEGER,
  superadmin_identity_id  TEXT,
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
  default_workspace_id    TEXT,
  role                    TEXT NOT NULL DEFAULT 'member',
  account_type            TEXT NOT NULL DEFAULT 'human',
  iam_owned               INTEGER NOT NULL DEFAULT 0,
  downgrade_protected     INTEGER NOT NULL DEFAULT 0,
  notification_email      TEXT,
  plan                    TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id      TEXT,
  meta_json               TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_auth_users_tenant ON auth_users(tenant_id, status);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

-- Legacy admin auth (deprecated — use auth_users)

CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Products / inventory =====

CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT,
  collection   TEXT,
  price_cents  INTEGER NOT NULL DEFAULT 0,
  image_url    TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_variants (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku            TEXT NOT NULL UNIQUE,
  size           TEXT,
  color          TEXT,
  price_cents    INTEGER,
  inventory_qty  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Orders (schema ready; no checkout wired yet) =====

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_email  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  total_cents     INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id   INTEGER REFERENCES product_variants(id),
  title        TEXT NOT NULL,
  qty          INTEGER NOT NULL DEFAULT 1,
  price_cents  INTEGER NOT NULL DEFAULT 0
);

-- ===== Media library (R2-backed, CMS-reusable across products) =====

CREATE TABLE IF NOT EXISTS media_assets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key        TEXT NOT NULL UNIQUE,
  url           TEXT NOT NULL,
  filename      TEXT NOT NULL,
  content_type  TEXT,
  size_bytes    INTEGER,
  category      TEXT,
  folder        TEXT NOT NULL DEFAULT 'images',
  display_order INTEGER NOT NULL DEFAULT 0,
  alt_text      TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_assets_folder_order ON media_assets(folder, display_order, id);

CREATE TABLE IF NOT EXISTS product_images (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_asset_id  INTEGER NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 0,
  is_primary      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, media_asset_id)
);

-- ===== Mail (Gmail inbox + Resend sending) =====

CREATE TABLE IF NOT EXISTS mail_settings (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  settings_json TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS store_settings (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  settings_json TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== CMS (pages + editable sections) =====

CREATE TABLE IF NOT EXISTS pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS page_sections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id      INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  section_key  TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  content_json TEXT NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(page_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_page_sections_page ON page_sections(page_id, sort_order);
