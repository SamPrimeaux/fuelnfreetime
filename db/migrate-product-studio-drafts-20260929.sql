PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS product_studio_drafts (
  id                              TEXT PRIMARY KEY,
  product_id                      INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  completeful_catalog_product_id  TEXT NOT NULL,
  completeful_shop_id             TEXT,

  selected_variant_ids_json       TEXT NOT NULL DEFAULT '[]',
  print_locations_json            TEXT NOT NULL DEFAULT '[]',
  placement_json                  TEXT NOT NULL DEFAULT '{}',

  original_media_asset_id         INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
  prepared_media_asset_id         INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
  preview_media_asset_id          INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,

  completeful_design_id           TEXT,
  completeful_render_id           TEXT,
  completeful_render_status       TEXT,
  completeful_render_url          TEXT,

  title                           TEXT NOT NULL,
  description                     TEXT,
  retail_price_cents              INTEGER NOT NULL DEFAULT 0 CHECK (retail_price_cents >= 0),
  state                           TEXT NOT NULL DEFAULT 'draft'
                                  CHECK (state IN ('draft','prepared','rendering','rendered','created','published','error')),
  version                         INTEGER NOT NULL DEFAULT 1,

  last_error_code                 TEXT,
  last_error_message              TEXT,
  created_at                      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_studio_drafts_catalog
  ON product_studio_drafts(completeful_catalog_product_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_product_studio_drafts_state
  ON product_studio_drafts(state, updated_at);
