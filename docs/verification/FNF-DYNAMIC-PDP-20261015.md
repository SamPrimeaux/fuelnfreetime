# FNF dynamic PDP — 2026-10-15

**Scope:** existing Heuristic storefront + store API + supplier-backed product editor. No new theme, schema or product drafts.

## Source-backed implementation

- `packages/heuristic-theme/storefront/js/product-options.mjs`: normalized color/size projection; original variant IDs preserved; supplier availability wins over raw `inventory_qty`; products without size selectors handled.
- `backend/store/api.js`: merchant gallery images expose optional color tags from existing media metadata (`variant_color` / `product_color` / `color`). Optional Completeful color-scoped previews are read from the existing catalog mirror, with explicit `supplier_reference` source. No external URL hardcoded into the reusable engine.
- `store-product.js`, `store-pdp.css`, `product.html`: mobile-first gallery, swatches, uniformly sorted sizes, editable description in Details, short shipping/care panel, compact related products, no processor advertising or unrelated campaign slab.
- `frontend/static/product-edit.html`: linked Completeful assortment displays compact count and hides manual warehouse quantity editing. Product metadata saves no longer trigger a blocking browser confirmation just because a size-less/optionless item has no sellable variant. Existing D1 variant mappings, SKU data, publication flow and pricing remain intact.
- `store-cart.js`: selected color and presented size retained with exact local variant ID.

## Actual catalog evidence

Read-only D1 snapshot on iMac (not committed): product 12 Classic Hooded Sweatshirt has **90 mapped variants, 15 colors, six sizes, one merchant photo, 15 catalog color references**. Product 10 tee has 36 mapped variants and six reference colors. Product 6 hat has zero variants; it is appropriately unavailable rather than being given made-up stock. Provider catalog references are color-only unless merchant-decorated images are attached with a color association.

## Tested

- 15 focused existing/new Node tests passed, including Product Studio publish/handoff and admin inline syntax.
- TypeScript admin `tsc -b`, Vite, asset assembly, package authority and import boundaries passed.
- Chrome DevTools actual local browser at **390×844, 834×1112, 1440×960** against authorized read-only live D1 catalog snapshot: real hoodie photo loaded; zero document overflow; 15 swatches, six sizes, four related products; no Stripe text; Ash/M selected and added **variant ID 20** to browser cart; hat renders with no irrelevant controls and checkout disabled.
- QA preview at `http://127.0.0.1:4346/products/unisex-heavy-blend-hooded-sweatshirt-gildan-18500-b525071d-04d80a28` is local, read-only, and sourced from saved D1 catalog snapshot, not the production store API (which rejected command-line reads with HTTP 403).

## Remaining real acceptance

- No live Worker deployment or merge. Verify admin authenticated save/reload and real prod API after staged release.
- Supplier `available=true` currently means a validated mapped provider listing, **not a live Completeful stock quote**; do not claim real-time provider inventory.
- Product-photo color assignments require actual decorated images + image color metadata; until then, the catalog garment preview is explicitly a color reference, not a completed FNF artwork mockup.
- Shipping/care product-specific fields do not exist in the current persisted product schema. Current panel uses a small truthful generic note; `The details` renders the actual Product Edit description.
