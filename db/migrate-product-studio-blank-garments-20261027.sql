-- Merchant-approved, exact-color/side blank garment references.
-- Provider catalog mirror remains untouched; no external image is implicitly approved.
CREATE TABLE IF NOT EXISTS product_studio_blank_views (
  completeful_catalog_product_id TEXT NOT NULL REFERENCES completeful_catalog_products(completeful_product_id) ON DELETE CASCADE,
  color_key TEXT NOT NULL,
  side_key TEXT NOT NULL,
  media_asset_id INTEGER NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  source_kind TEXT NOT NULL DEFAULT 'curated_media',
  source_note TEXT,
  approved_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (completeful_catalog_product_id, color_key, side_key),
  CHECK (color_key <> '' AND side_key <> ''),
  CHECK (side_key IN ('front','back','left','right')),
  CHECK (source_kind = 'curated_media')
);
CREATE INDEX IF NOT EXISTS idx_product_studio_blank_views_media
 ON product_studio_blank_views(media_asset_id);
