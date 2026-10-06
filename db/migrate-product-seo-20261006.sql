-- Expand existing commerce products; do not recreate tables or reset product data.
-- Apply only after verifying these columns are absent. Wrangler D1 executes this once.
ALTER TABLE products ADD COLUMN seo_title TEXT;
ALTER TABLE products ADD COLUMN seo_description TEXT;
CREATE TABLE IF NOT EXISTS product_slug_redirects (
  old_slug TEXT PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_product_slug_redirects_product ON product_slug_redirects(product_id);
