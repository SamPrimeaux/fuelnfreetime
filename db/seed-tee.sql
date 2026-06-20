-- Seed / activate Fuel N Free Time Tee for v1 storefront

UPDATE products SET
  title = 'Fuel N Free Time Tee',
  description = 'Earned-not-given energy on premium cotton. Front graphic with full back print. Built for those who fuel hard and live free.',
  collection = 'essentials',
  price_cents = 3400,
  image_url = '/media/products/shirts/fft-tee-frontside.webp',
  status = 'active',
  updated_at = datetime('now')
WHERE slug = 'fuel-n-free-time-tee';

-- Secondary back image
INSERT OR IGNORE INTO product_images (product_id, media_asset_id, position, is_primary)
SELECT 2, 6, 1, 0
WHERE EXISTS (SELECT 1 FROM products WHERE id = 2)
  AND EXISTS (SELECT 1 FROM media_assets WHERE id = 6)
  AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = 2 AND media_asset_id = 6);

-- Variants (idempotent by sku)
INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT 2, 'FNF-TEE-S', 'S', 'Black', 3400, 8, datetime('now') WHERE EXISTS (SELECT 1 FROM products WHERE id = 2);
INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT 2, 'FNF-TEE-M', 'M', 'Black', 3400, 12, datetime('now') WHERE EXISTS (SELECT 1 FROM products WHERE id = 2);
INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT 2, 'FNF-TEE-L', 'L', 'Black', 3400, 10, datetime('now') WHERE EXISTS (SELECT 1 FROM products WHERE id = 2);
INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT 2, 'FNF-TEE-XL', 'XL', 'Black', 3400, 6, datetime('now') WHERE EXISTS (SELECT 1 FROM products WHERE id = 2);
INSERT OR IGNORE INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
SELECT 2, 'FNF-TEE-XXL', 'XXL', 'Black', 3400, 4, datetime('now') WHERE EXISTS (SELECT 1 FROM products WHERE id = 2);
