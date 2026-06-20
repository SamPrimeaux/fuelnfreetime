-- Virtual folder metadata for media library (folder lives in D1, not R2 keys)

ALTER TABLE media_assets ADD COLUMN folder TEXT NOT NULL DEFAULT 'images';
ALTER TABLE media_assets ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE media_assets ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_media_assets_folder_order ON media_assets(folder, display_order, id);

-- Backfill folder from legacy category / r2_key patterns where possible
UPDATE media_assets SET folder = 'products' WHERE r2_key LIKE 'products/%';
UPDATE media_assets SET folder = 'videos'
  WHERE lower(r2_key) LIKE '%.mp4'
     OR lower(r2_key) LIKE '%.mov'
     OR lower(r2_key) LIKE '%.webm'
     OR lower(r2_key) LIKE '%.glb'
     OR lower(r2_key) LIKE '%.usdz'
     OR r2_key LIKE 'archive/shopify-import/videos/%'
     OR r2_key LIKE 'archive/shopify-import/3d-models/%';
UPDATE media_assets SET display_order = id WHERE display_order = 0;
UPDATE media_assets SET updated_at = COALESCE(NULLIF(updated_at, ''), created_at, datetime('now'));
