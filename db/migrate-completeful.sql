-- Completeful integration + local catalog mirror
-- Fuel & Free Time / Cloudflare D1
--
-- Safe to run repeatedly: CREATE TABLE/INDEX IF NOT EXISTS only.
-- This migration does NOT store API keys or webhook signing secrets.
-- Provider payload fragments are retained in *_json columns for forward compatibility.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Shop registry
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS completeful_shops (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  completeful_shop_id        TEXT NOT NULL UNIQUE,
  kind                       TEXT,
  name                       TEXT,
  display_name               TEXT,
  domain                     TEXT,
  marketplace                TEXT,
  currency                   TEXT,
  is_primary                 INTEGER NOT NULL DEFAULT 0,
  is_active                  INTEGER NOT NULL DEFAULT 1,
  marketplace_readiness_json TEXT,
  raw_json                   TEXT,
  last_request_id            TEXT,
  last_synced_at             TEXT,
  created_at                 TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                 TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_completeful_shops_primary
  ON completeful_shops(is_primary, is_active);

-- ---------------------------------------------------------------------------
-- Catalog mirror state
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS completeful_catalog_sync_state (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  status              TEXT NOT NULL DEFAULT 'never',
  api_version         TEXT,
  include_set         TEXT,
  next_cursor         TEXT,
  page_count          INTEGER NOT NULL DEFAULT 0,
  product_count       INTEGER NOT NULL DEFAULT 0,
  variant_count       INTEGER NOT NULL DEFAULT 0,
  started_at          TEXT,
  completed_at        TEXT,
  last_request_id     TEXT,
  last_error_code     TEXT,
  last_error_message  TEXT,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO completeful_catalog_sync_state (id, status)
VALUES (1, 'never');

-- Canonical catalog product/family row.
CREATE TABLE IF NOT EXISTS completeful_catalog_products (
  completeful_product_id        TEXT PRIMARY KEY,
  catalog_product_id            TEXT NOT NULL,
  sku                           TEXT,
  name                          TEXT NOT NULL,
  product_type                  TEXT,
  print_type                    TEXT,
  material                      TEXT,
  variant_title                 TEXT,
  default_title                 TEXT,
  default_description           TEXT,

  available                     INTEGER NOT NULL DEFAULT 0,
  marketplace_eligible          INTEGER NOT NULL DEFAULT 0,

  pricing_currency              TEXT,
  fulfillment_cost_free_cents   INTEGER,
  fulfillment_cost_growth_cents INTEGER,
  fulfillment_cost_business_cents INTEGER,

  shipping_profile_id           TEXT,

  cover_image_url               TEXT,
  main_icon_url                 TEXT,
  realistic_image_url           TEXT,

  tags_json                     TEXT,
  dimensions_json               TEXT,
  variant_attributes_json       TEXT,
  shipping_json                 TEXT,

  raw_json                      TEXT NOT NULL,
  source_hash                   TEXT,
  last_seen_sync_token          TEXT,
  last_request_id               TEXT,
  last_synced_at                TEXT NOT NULL DEFAULT (datetime('now')),
  created_at                    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_products_catalog_id
  ON completeful_catalog_products(catalog_product_id);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_products_name
  ON completeful_catalog_products(name);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_products_sku
  ON completeful_catalog_products(sku);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_products_type
  ON completeful_catalog_products(product_type, print_type);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_products_available
  ON completeful_catalog_products(available, marketplace_eligible);

-- All sellable family members, including the lead variant.
CREATE TABLE IF NOT EXISTS completeful_catalog_variants (
  completeful_variant_id        TEXT PRIMARY KEY,
  completeful_product_id        TEXT NOT NULL REFERENCES completeful_catalog_products(completeful_product_id) ON DELETE CASCADE,

  sku                           TEXT,
  name                          TEXT,
  title                         TEXT,
  variant_title                 TEXT,
  variants_category             TEXT,
  is_primary                    INTEGER NOT NULL DEFAULT 0,
  is_lead                       INTEGER NOT NULL DEFAULT 0,

  pricing_currency              TEXT,
  fulfillment_cost_free_cents   INTEGER,
  fulfillment_cost_growth_cents INTEGER,
  fulfillment_cost_business_cents INTEGER,

  attributes_json               TEXT,
  variant_attributes_json       TEXT,
  cover_image_url               TEXT,
  main_icon_url                 TEXT,
  realistic_image_url           TEXT,

  raw_json                      TEXT NOT NULL,
  last_seen_sync_token          TEXT,
  last_synced_at                TEXT NOT NULL DEFAULT (datetime('now')),
  created_at                    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_variants_product
  ON completeful_catalog_variants(completeful_product_id, is_lead DESC, variant_title);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_variants_sku
  ON completeful_catalog_variants(sku);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_variants_category
  ON completeful_catalog_variants(variants_category);

-- Print placement/production areas per catalog product.
CREATE TABLE IF NOT EXISTS completeful_catalog_print_locations (
  completeful_product_id TEXT NOT NULL REFERENCES completeful_catalog_products(completeful_product_id) ON DELETE CASCADE,
  print_location_id      TEXT NOT NULL,
  name                   TEXT NOT NULL,

  x                      REAL,
  y                      REAL,
  width                  REAL,
  height                 REAL,
  artboard_width         INTEGER,
  artboard_height        INTEGER,
  file_width             REAL,
  file_height            REAL,
  unit                   TEXT,
  dpi                    INTEGER,
  enabled                INTEGER NOT NULL DEFAULT 1,
  shape_type             TEXT,
  artboard_image_url     TEXT,
  extra_cost_cents       INTEGER,

  raw_json               TEXT NOT NULL,
  last_synced_at         TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (completeful_product_id, print_location_id)
);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_print_locations_enabled
  ON completeful_catalog_print_locations(completeful_product_id, enabled);

-- Catalog imagery kept separately so the admin can browse without reparsing raw_json.
CREATE TABLE IF NOT EXISTS completeful_catalog_images (
  completeful_product_id TEXT NOT NULL REFERENCES completeful_catalog_products(completeful_product_id) ON DELETE CASCADE,
  image_id               TEXT NOT NULL,
  url                    TEXT NOT NULL,
  thumbnail_url          TEXT,
  type                   TEXT,
  media_type             TEXT,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  is_primary             INTEGER NOT NULL DEFAULT 0,
  variant_title          TEXT,
  raw_json               TEXT NOT NULL,
  last_synced_at         TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (completeful_product_id, image_id)
);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_images_product_sort
  ON completeful_catalog_images(completeful_product_id, is_primary DESC, sort_order);

-- Approved mockup pool per catalog product/family.
CREATE TABLE IF NOT EXISTS completeful_catalog_mockups (
  completeful_product_id TEXT NOT NULL REFERENCES completeful_catalog_products(completeful_product_id) ON DELETE CASCADE,
  mockup_id              TEXT NOT NULL,
  name                   TEXT NOT NULL,
  preview_url            TEXT,
  print_location_id      TEXT,
  active                 INTEGER NOT NULL DEFAULT 1,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  variant_scope_json     TEXT,
  raw_json               TEXT NOT NULL,
  last_synced_at         TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (completeful_product_id, mockup_id)
);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_mockups_active
  ON completeful_catalog_mockups(completeful_product_id, active, sort_order);

-- Local-only catalog curation so F&FT can shortlist preferred products without
-- mutating the provider mirror.
CREATE TABLE IF NOT EXISTS completeful_catalog_curation (
  completeful_product_id TEXT PRIMARY KEY REFERENCES completeful_catalog_products(completeful_product_id) ON DELETE CASCADE,
  is_favorite            INTEGER NOT NULL DEFAULT 0,
  is_hidden              INTEGER NOT NULL DEFAULT 0,
  priority               INTEGER NOT NULL DEFAULT 0,
  local_group            TEXT,
  notes                  TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_completeful_catalog_curation_browse
  ON completeful_catalog_curation(is_hidden, is_favorite DESC, priority DESC);

-- ---------------------------------------------------------------------------
-- Local F&FT product/variant mappings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS completeful_product_links (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id                   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  completeful_shop_id          TEXT NOT NULL,
  completeful_store_product_id TEXT,
  completeful_catalog_product_id TEXT,
  completeful_design_id        TEXT,
  completeful_design_option_id TEXT,
  selection_json               TEXT,

  sync_status                  TEXT NOT NULL DEFAULT 'unlinked',
  last_request_id              TEXT,
  last_error_code              TEXT,
  last_error_message           TEXT,
  last_synced_at               TEXT,
  created_at                   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                   TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(product_id, completeful_shop_id),
  FOREIGN KEY (completeful_shop_id)
    REFERENCES completeful_shops(completeful_shop_id)
);

CREATE INDEX IF NOT EXISTS idx_completeful_product_links_store_product
  ON completeful_product_links(completeful_store_product_id);

CREATE INDEX IF NOT EXISTS idx_completeful_product_links_catalog_product
  ON completeful_product_links(completeful_catalog_product_id);

CREATE TABLE IF NOT EXISTS completeful_variant_links (
  id                              INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id                      INTEGER NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  product_link_id                 INTEGER NOT NULL REFERENCES completeful_product_links(id) ON DELETE CASCADE,

  completeful_catalog_product_id  TEXT,
  completeful_catalog_variant_id  TEXT,
  completeful_store_product_id    TEXT,
  print_location_ids_json         TEXT,
  patch_material_option_id        TEXT,
  selection_json                  TEXT,
  provider_sku                    TEXT,

  last_synced_at                  TEXT,
  created_at                      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_completeful_variant_links_catalog_variant
  ON completeful_variant_links(completeful_catalog_variant_id);

-- ---------------------------------------------------------------------------
-- Fulfillment/order bridge
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS completeful_order_links (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id                 INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  completeful_shop_id      TEXT NOT NULL,
  completeful_order_id     TEXT UNIQUE,
  external_order_id        TEXT NOT NULL UNIQUE,
  idempotency_key          TEXT NOT NULL UNIQUE,

  quote_json               TEXT,
  quote_version            TEXT,
  provider_status          TEXT,
  fulfillment_status       TEXT,
  tracking_json            TEXT,

  last_request_id          TEXT,
  last_error_code          TEXT,
  last_error_message       TEXT,
  submitted_at             TEXT,
  last_synced_at           TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (completeful_shop_id)
    REFERENCES completeful_shops(completeful_shop_id)
);

CREATE INDEX IF NOT EXISTS idx_completeful_order_links_provider_order
  ON completeful_order_links(completeful_order_id);

CREATE INDEX IF NOT EXISTS idx_completeful_order_links_status
  ON completeful_order_links(fulfillment_status, provider_status);

-- Bounded durable ledger for mutating provider operations.
CREATE TABLE IF NOT EXISTS completeful_operations (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_key          TEXT NOT NULL UNIQUE,
  operation_type         TEXT NOT NULL,
  local_entity_type      TEXT,
  local_entity_id        TEXT,
  completeful_shop_id    TEXT,
  idempotency_key        TEXT NOT NULL UNIQUE,
  status                 TEXT NOT NULL DEFAULT 'pending',

  provider_resource_id   TEXT,
  provider_request_id    TEXT,
  response_status        INTEGER,

  error_code             TEXT,
  error_message          TEXT,
  remediation            TEXT,
  attempt_count          INTEGER NOT NULL DEFAULT 0,

  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_completeful_operations_entity
  ON completeful_operations(local_entity_type, local_entity_id, operation_type);

CREATE INDEX IF NOT EXISTS idx_completeful_operations_status
  ON completeful_operations(status, updated_at);

-- ---------------------------------------------------------------------------
-- Webhooks
-- ---------------------------------------------------------------------------

-- Completeful webhook registrations are canonical rows in agentsam_webhooks
-- (provider='completeful'). Delivery receipts are canonical rows in
-- agentsam_webhook_events. Do not create provider-specific webhook tables.

-- ---------------------------------------------------------------------------
-- Verification view: one-row summary useful in D1 Studio.
-- ---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_completeful_schema_summary AS
SELECT
  (SELECT COUNT(*) FROM completeful_shops) AS shops,
  (SELECT COUNT(*) FROM completeful_catalog_products) AS catalog_products,
  (SELECT COUNT(*) FROM completeful_catalog_variants) AS catalog_variants,
  (SELECT COUNT(*) FROM completeful_catalog_print_locations) AS print_locations,
  (SELECT COUNT(*) FROM completeful_catalog_images) AS catalog_images,
  (SELECT COUNT(*) FROM completeful_catalog_mockups) AS catalog_mockups,
  (SELECT COUNT(*) FROM completeful_product_links) AS product_links,
  (SELECT COUNT(*) FROM completeful_order_links) AS order_links,
  (SELECT COUNT(*) FROM agentsam_webhooks
    WHERE provider = 'completeful' AND status != 'retired') AS webhook_subscriptions,
  (SELECT COUNT(*) FROM agentsam_webhook_events
    WHERE provider = 'completeful') AS webhook_events;
