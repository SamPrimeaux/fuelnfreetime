-- Seed / activate Fuel N Free Time Tee (slug-based, idempotent)

INSERT OR IGNORE INTO products (slug, title, description, collection, price_cents, image_url, status, updated_at)
VALUES (
  'fuel-n-free-time-tee',
  'Fuel N Free Time Tee',
  'Earned-not-given energy on premium cotton. Front graphic with full back print. Built for those who fuel hard and live free.',
  'essentials',
  3400,
  '/media/products/shirts/fft-tee-frontside.webp',
  'active',
  datetime('now')
);

UPDATE products SET
  title = 'Fuel N Free Time Tee',
  description = 'Earned-not-given energy on premium cotton. Front graphic with full back print. Built for those who fuel hard and live free.',
  collection = 'essentials',
  price_cents = 3400,
  image_url = '/media/products/shirts/fft-tee-frontside.webp',
  status = 'active',
  updated_at = datetime('now')
WHERE slug = 'fuel-n-free-time-tee';

INSERT OR IGNORE INTO product_images (product_id, media_asset_id, position, is_primary)
SELECT p.id, m.id, 1, 0
FROM products p, media_assets m
WHERE p.slug = 'fuel-n-free-time-tee'
  AND m.r2_key = 'products/shirts/earn-your-freetime-teeshirt-backside.webp'
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi
    WHERE pi.product_id = p.id AND pi.media_asset_id = m.id
  );

INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT p.id, 'FNF-TEE-S', 'S', 'Black', 3400, 8, datetime('now') FROM products p WHERE p.slug = 'fuel-n-free-time-tee';
INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT p.id, 'FNF-TEE-M', 'M', 'Black', 3400, 12, datetime('now') FROM products p WHERE p.slug = 'fuel-n-free-time-tee';
INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT p.id, 'FNF-TEE-L', 'L', 'Black', 3400, 10, datetime('now') FROM products p WHERE p.slug = 'fuel-n-free-time-tee';
INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT p.id, 'FNF-TEE-XL', 'XL', 'Black', 3400, 6, datetime('now') FROM products p WHERE p.slug = 'fuel-n-free-time-tee';
INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT p.id, 'FNF-TEE-XXL', 'XXL', 'Black', 3400, 4, datetime('now') FROM products p WHERE p.slug = 'fuel-n-free-time-tee';
