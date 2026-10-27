-- Additive only: same collection identity, products and existing media.
-- Apply to production fuelnfreetime D1 before deploying the new Worker.
ALTER TABLE store_collections
  ADD COLUMN hero_settings_json TEXT NOT NULL DEFAULT '{}';

-- Supplier blank shortlist; design intent is not a published product.
-- Existing storefront membership still uses store_collection_products.
ALTER TABLE store_collections
  ADD COLUMN product_plan_json TEXT NOT NULL DEFAULT '[]';
