-- Fuel & Free Time — D1 schema
-- Applied incrementally as features get built. Today: newsletter capture only.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL UNIQUE,
  source_page  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Phase 2 (ecommerce): products, variants, cart, orders.
-- Not created yet — add here when the shop build starts so schema and
-- code land together.
