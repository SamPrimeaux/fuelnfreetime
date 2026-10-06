# FNF Product Studio → Product Details handoff

**Implementation:** apps/ecommerce-cms-agentsam (the existing reusable ecommerce CMS).
**Scope:** Creative-to-commerce progression, no new CMS/editor/media backend.

## Resource identities

1. **Catalog blank:** completeful_catalog_products / completeful_catalog_variants — provider-supplied garment options and print specifications. Not a storefront product.
2. **Studio design draft:** product_studio_drafts.id + its linked product_id — placement, selected variant/print area, original/prepared/preview asset IDs. First design save creates a real local products row with status=draft.
3. **Local store product:** products.id + variant rows — owned by Product Details. Title, price, description, SEO, slug, collections, product media and publishing live here.
4. **Provider store product:** linked only after explicit **Connect Completeful fulfillment**, using the existing idempotent draft-to-provider route. completeful_product_links retains provider IDs.
5. **Published storefront listing:** explicit products.status=active, guarded for Studio-sourced products; saving or linking is not publishing.

**Next step · Product details →** saves the design before opening /admin/product-edit?id=the-real-local-id. If save fails or returns no valid ID, it does not navigate. Returning via **Edit design** loads the selected catalog blank. Studio saves no longer overwrite commercial title, description or price.

## Media and preview accuracy

Original files remain in the media library. Prepared production rasters and placement composites have separate asset IDs. A saved placement preview may attach as product media, but is not a verified provider mockup or physical product photo. Merchants must review and approve product images before publishing. The mini preview is a placement approximation.

## Product details

Product Editor has top-right Save / Discard and verified saved-state feedback. Product fields, modified variant fields, SEO fields, membership in existing store_collections, and published-slug redirects are saved together. Inventory continues to use the same product_variants.inventory_qty rows as the Inventory page. Unmodified variant fields are not resent when only changing product copy.

**Migration:** db/migrate-product-seo-20261006.sql adds products.seo_title, products.seo_description, product_slug_redirects. It does not recreate products or reset inventory. Apply once before deploying the new Worker. Existing collection and membership tables are reused.

## Verification and limits

Automated contract and in-memory SQL persistence tests cover the core handoff, field isolation, atomic variant/collection/SEO saves, publishing guard and redirects. An authenticated browser walkthrough must still exercise a new design, provider render, actual inventory sync, and merchant publishing before considering the entire commerce workflow production-complete.

Not covered: independent front/back design state, root cause of intermittent HTML upload responses, advanced artwork recoloring/cutout, full collection-management screens (cover/SEO/edit/order), or provider render parity. Do not add alternative editors or storage systems.
