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
