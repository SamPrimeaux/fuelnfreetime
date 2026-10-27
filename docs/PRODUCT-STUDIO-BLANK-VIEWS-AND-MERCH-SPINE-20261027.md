# Product Studio — verified garment plates and merchandise spine

## Owner and implementation

This extends the **existing** Fuel N Free Time Product Studio, the existing Completeful adapter,
the site's `media_assets`/R2 Media Library, and its product drafts. It does not create a second
product catalog, second Product Studio, or a supplier-facing clone.

- Live D1: `fuelnfreetime`; additive migration `db/migrate-product-studio-blank-garments-20261027.sql`
- Merchant image registry: `product_studio_blank_views`, keyed by provider product, exact normalized color, side
- Existing detail API: `GET /api/admin/completeful/catalog/{productId}` includes `blank_views`
- Authorized merchant curation: `POST /api/admin/completeful/catalog/{productId}/blank-views`
  with `{ color, side, media_asset_id, source_note }`; DELETE with `{ color, side }` removes a mapping
- UI: Product Studio > Upload > Whole library > Assign clean Front / Back photo
- Source artwork, prepared artwork, and supplier final renders remain separate assets.

## Image trust order

1. Merchant-approved **unprinted** photo from Media Library for the exact product/color/side.
2. Matching Completeful mockup's `background.png` sibling, derived only from an **exactly scoped**
   color/side `preview.png`. The image component checks actual loading and attempts supplier direct source
   if the optimized proxy fails; a non-loading candidate cannot become the writable blank.
3. Matching color + side supplier `preview.png`, always labeled as a reference: it may have baked-in example art.
4. Unscoped supplier side photo, **color unverified**, always reference only.
5. Missing-photo notice with real print-area geometry, not fabricated another product/color/side.

Never use a supplier `preview.png`, product cover, icon, storefront image, AI-synthesized shirt
or supplier artboard as an approved, editable blank garment. Never apply local artwork over
a decorated stock sample and imply it represents a provider render.

## Collecting actual stock garment photos

For each missing product/color/side, retrieve product photography from Completeful or a manufacturer /
licensed garment asset library. Review actual **manufacturer style ID, color, orientation, absence of
demonstration art, resolution and usage rights**, import it as a distinct Media Library photo, then assign
it to that exact product/color/side. Size variants of one color normally reuse the same approved picture.
Do **not** bulk scrape or hotlink retailer photos without permission; link to candidates for review instead.
Do not quietly recolor a photograph to infer a stock color.

## Package authority audit

- `@inneranimalmedia/agentsam-provider-completeful`: typed **supplier transport, catalog operations,
  mockup render requests**; canonical SDK source at `agentsam-sdk/packages/providers/completeful`.
  Current FNF consumes vendored compiled RC because 2.6.14 is **not published**.
- `@inneranimalmedia/agentsam-merch`: provider-neutral **manufacturing profile, DPI/PPI compatibility,
  artwork preflight, crop/placement transforms, derivative plans**. Canonical SDK source:
  `agentsam-sdk/packages/agentsam-merch`.
- FNF currently also has distinct copies at `packages/agentsam-merch` and
  `apps/ecommerce-cms-agentsam/packages/agentsam-merch`. They **are not identical**. The nested copy
  owns `effectiveArtworkDpi` and `providerPrintSizeIn`, and Product Studio imports that nested copy.
  The SDK offers `calculateEffectivePpi` with distinct compatibility-oriented semantics.
- Current Product Studio physical pixel-size labels were adjusted to reuse the same nested
  `providerPrintSizeIn` helper used by artwork quality. This is a narrow first step, **not a claim that
  package duplication is fixed**.
- Existing `media_assets` + R2 manage originals and derivatives; render output must remain separate
  from print-quality masters. `product_studio_drafts` owns chosen artwork and side transforms.

### Follow-on package consolidation (no global version bump)

1. Extract tested effective source PPI/DPI and explicit crop/placement geometry into the existing SDK
   `agentsam-merch` kernel; reconcile it with `calculateEffectivePpi` and normalized profile targets.
2. Consume a pinned locally compiled SDK package from FNF (same approach as Completeful's portable
   provider), and remove the two in-repo copied implementations only after tests and deployment.
3. Require consistent calculations at frontend placement, artwork preparation, supplier print preflight
   and output derivative generation. Do not calculate resolution from a resized storefront image.
4. Publish only the changed individual package when ready; do not bump unrelated SDK packages.

## Acceptance

- Front / Back shows a real side-view photo when the provider has one.
- Exact side/color background loads are preferred; supplier artwork remains clearly labeled reference.
- The photo which actually loaded (not just a guessed URL) gates local artwork overlay.
- One blank mapping serves the sizes of the same product/color; wrong colors and front/back never inherit it.
- Staff can curate from the same Media Library without overwriting print artwork.
- Original source, prepared print file and rendered marketing mockup remain separate.
- The additive migration is idempotent and no provider mirror rows were changed.
- Test the live browser after deployment and review supplier candidates before describing them as
  manufacturer-verified imagery.

## Known limitations

- No third-party manufacturer stock photos were automatically imported: usage rights and exact
  color/side verification are still required.
- The `background.png` sibling shape is grounded in Completeful's real CDN path conventions, but
  was not HTTP verified from the Mac because its DNS resolution for the supplier's Supabase hostname
  failed. The browser image loader explicitly falls back to labeled supplier reference imagery.
- The mirrored catalog sync state was observed `running` with an unfinished cursor; a full supplier
  inventory refresh remains separate from this canvas fix.
