# FNF storefront curation — 2026-10-14

**Primary status: IMPLEMENTED / UNVERIFIED.** Visual local fixtures pass, but no authenticated production flow or real Completeful availability was proven. Approval to publish is NOT implicit.

## Target / baseline

- User-provided baseline: live FNF /shop editorial imagery and product pages had awkward spacing, duplicated variant controls (90 separate size buttons), all options disabled, and an unavailable checkout.
- Visual donor: Resolve Atelier's purposeful split PDP, hierarchy, product gallery, sticky purchase rail, bag and editorial composition. Preserve Resolve original; do not add a fourth theme or copy its brand assets.
- Ownership: existing Heuristic theme renderer and `product.purchase-panel` contract for product detail, existing CMS section instances for /shop. FNF installation controls merchant copy and media. No schema/engine-authority rewrite.

## Change summary

- Introduce brandless `product-options.mjs`: collapse supplier matrix display to unique colors and sorted unique sizes, still resolve the exact local `product_variants.id` for purchase.
- Render separate color/size controls in existing product page; keep inventory gate intact. Cart line displays color and size when provided.
- Refine product presentation with a light paper canvas, large typographic hierarchy, gallery, compact responsive selection/buying panel and contextual assurances. Refine existing shop's hero, collections, editorial, catalog and story rhythm, without replacing source imagery or section registration.
- FNF-only read-only review fixture serves existing pages and browser screenshots, does not use provider credentials, Worker, D1, R2, Stripe or live orders.

## Quality evidence

- G0 ownership and target: PASS — source files and user screenshot references inspected, original work preserved.
- G1 source integrity: PARTIAL — focused Node syntax, four pure option tests, existing collections test and git diff validation pass. The unrelated `tests/store-theme-contract.test.mjs` has an existing stale routing assertion (expects `"theme-workspace"` in the old `admin-routes.js` instead of `route-manifest.js`) and fails identically on the untouched main worktree. The isolated admin TSX frontend compiled with `tsc -b && vite build`; `npm run build:admin:skip` assembled assets and passed guard-boundaries and package-authority checks. Not a served deployment, and not a production acceptance test.
- G2 interaction: PARTIAL — headless Chrome exercised FNF PDP selecting Black then XL at 390px; correct selected controls, selected variant fixture ID contract and purchase disabled. No authenticated merchant save/reload in scope.
- G3 visual: PARTIAL — actual Chrome screenshot captures at 390×844, 834×1112, 1440×960 with no horizontal overflow. Inspected mobile option panel and full desktop Shop scroll. **Not physical iPhone testing**; existing placeholder lifestyle photo does not depict the mockup for this synthetic product.
- G4 commerce/provider: BLOCKED — the current public store API reads `product_variants.inventory_qty`, and checkout/reservation helpers use only local warehouse quantities. Completeful variant links exist but no verified supplier availability or fulfillment checkout adapter is proven. Never invent local stock or allow provider purchase from zero quantity.
- G5 served deployment: NOT RUN — not merged or deployed. Local only: `http://127.0.0.1:4337/shop` and `/products/review-hoodie`.
- G6 repository closeout: pending review/PR. Isolated branch `feat/fnf-storefront-curation-20261014`, separate from the active TypeScript-migration worktree.

### Actual local screenshot receipts (not committed)

`site/fuelnfreetime/preview/snapshots/fnf-pdp-390.png`
`site/fuelnfreetime/preview/snapshots/fnf-pdp-390-options.png`
`site/fuelnfreetime/preview/snapshots/fnf-pdp-834.png`
`site/fuelnfreetime/preview/snapshots/fnf-pdp-1440.png`
`site/fuelnfreetime/preview/snapshots/fnf-shop-390.png`
`site/fuelnfreetime/preview/snapshots/fnf-shop-834.png`
`site/fuelnfreetime/preview/snapshots/fnf-shop-1440.png`

## Explicit non-goals / next gates

- No new website/theme system or CMS tables.
- Do not promote synthetic product images/prices, endorsements, review counts or availability to real product facts.
- Replace fixtures with actual D1/R2 merchant content after visual approval, refine actual Completeful mockup/color gallery, migrate affected JS to typed source in concert with the concurrent TypeScript work.
- Server-authoritative provider availability, checkout reservation semantics, discounts/payment and fulfillment must be solved and end-to-end verified separately before enabling buy.
- Genuine authored CMS controls, mobile physical iPhone acceptance, browser accessibility and served Worker asset identity still require proof.

## Second pass — original FNF merch concepts, owner-review drafts

- Responding to merchant feedback: **removed** generic three-column assurance/disclaimer copy, payment-status filler, and unrelated brand-story slab from the PDP renderer. Only concise availability state remains when a specific option cannot be ordered. No live deploy of this renderer.
- Authored a coherent three-piece `Field Series 01` mini-capsule from the canonical brand dossier (earned time, early water, workshop/build culture), each with dedicated front and back SVGs, illustrated cover, product narrative, SEO title and meta description.
- Original sources, reproducible SVG builder, metadata and creative review page: `site/fuelnfreetime/concepts/field-series-01/`. All creative direction is **proposed**, not founder-confirmed.
- Created actual merchant D1 commerce products: `13` Off Clock; `14` First Light; `15` Shop Notes. All have `status='draft'`, `price_cents=0`, one zero-stock default variant, and one primary gallery image. Existing account-scoped production connection used; no new table or API authority was added.
- Uploaded 9 original concept cover/front/back SVG objects into tenant's `fuelnfreetime` R2 bucket, `drafts/field-series-01/`, and registered 9 existing `media_assets` rows. Verified covers return HTTP 200 with `image/svg+xml` from `https://fuelnfreetime.com/media/drafts/field-series-01/...`. Direct R2-served media URLs **are public to anyone with the link**, even though these products do not appear in the active storefront.
- Read-back from production D1: 3 draft products, **0 active**, 9 media rows, one local placeholder variant and one primary `product_images` row per product.
- Existing admin edits: `/admin/product-edit?id=13`, `id=14`, `id=15` after authorized login. Authenticated GUI navigation, save/reload, supplier mapping and actual manufacturing are **not yet end-to-end verified**.
- Local creative review: `http://127.0.0.1:4338/` (Mac only). Chrome device-emulation checks at 390×844 and 1440×960: three concept chapters, image loads and no horizontal document overflow; screenshots inspected locally. No physical iPhone acceptance.
- Prepublication release gate: Justin selects/edits concept and grants approval; replace illustrative mockups with real provider geometry, outline SVG fonts, preflight print art, attach verified blank and color/size combinations, enter and verify actual price/margins, test save and checkout. **Do not activate zero-price placeholder variants.**
