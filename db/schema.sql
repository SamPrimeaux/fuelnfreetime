-- Fuel & Free Time — D1 schema

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL UNIQUE,
  source_page  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Admin auth =====

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
  alt_text      TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_images (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_asset_id  INTEGER NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 0,
  is_primary      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, media_asset_id)
);
