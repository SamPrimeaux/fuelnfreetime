-- Storefront collection contract. Product ownership stays in products; this layer owns merchandising order and presentation.
CREATE TABLE IF NOT EXISTS store_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  eyebrow TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  accent_color TEXT NOT NULL DEFAULT '#ff4d00',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS store_collection_products (
  collection_id INTEGER NOT NULL REFERENCES store_collections(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_collections_status_sort ON store_collections(status, sort_order);
CREATE INDEX IF NOT EXISTS idx_store_collection_products_product ON store_collection_products(product_id);

INSERT INTO store_collections (slug, title, description, eyebrow, image_url, accent_color, status, sort_order)
VALUES
  ('high-octane-performance-gear', 'High Octane', 'Performance-minded gear for garage nights, open roads, and redline living.', 'Built for motion', '/assets/presets/fuel-free-time/earned-hours-hero.webp', '#ff4d00', 'active', 10),
  ('masters', 'Masters', 'Refined staples for people who have put in the years and earned the hours.', 'Quiet confidence', '/assets/presets/fuel-free-time/masters.webp', '#d99142', 'active', 20),
  ('essentials', 'Essentials', 'Dependable daily drivers made for early starts, late finishes, and everything after.', 'Repeat wear', '/assets/presets/fuel-free-time/essentials.webp', '#22adae', 'active', 30)
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  eyebrow = excluded.eyebrow,
  image_url = excluded.image_url,
  accent_color = excluded.accent_color,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = datetime('now');

INSERT OR IGNORE INTO store_collection_products (collection_id, product_id, sort_order)
SELECT c.id, p.id, p.id
FROM products p
JOIN store_collections c ON c.slug = CASE
  WHEN lower(replace(p.collection, ' ', '-')) IN ('high-octane', 'high-octane-performance-gear') THEN 'high-octane-performance-gear'
  WHEN lower(replace(p.collection, ' ', '-')) IN ('masters', 'masters-series') THEN 'masters'
  WHEN lower(replace(p.collection, ' ', '-')) IN ('essentials', 'everyday-essentials') THEN 'essentials'
  ELSE ''
END
WHERE p.collection IS NOT NULL;
