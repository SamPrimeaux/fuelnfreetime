# FNF storefront curation — local review only

This is an isolated, instance-owned fixture around **the real Heuristic storefront pages**, not another CMS, theme, or publishing authority. It reads the selected FNF site manifest's existing logo and navigation and uses FNF theme assets. It cannot write to D1, R2, Stripe, Completeful, or the live site.

## Preview

```sh
cd /Users/samprimeaux/agent-worktrees/fnf-storefront-curation-20261014
FNF_REVIEW_PORT=4337 node site/fuelnfreetime/preview/product-curation.mjs
```

- Shop (existing authored sections): http://127.0.0.1:4337/shop
- Product page: http://127.0.0.1:4337/products/review-hoodie

The product fixture uses **90 synthetic size/color combinations** and the current installed FNF lifestyle asset, NOT actual hoodie or Completeful product imagery. All 90 quantities are zero, so purchases are intentionally disabled. Shop preview contains three conceptual cards only. All catalog and product prices in this preview are test fixtures, not verified live merchandise.

## Browser proof (Node 22+; macOS Google Chrome)

```sh
node --test tests/storefront-product-options.test.mjs
node site/fuelnfreetime/preview/capture.mjs
FNF_REVIEW_TARGET=shop node site/fuelnfreetime/preview/capture.mjs
```

Captures use Chrome DevTools device emulation for 390×844, 834×1112, 1440×960 CSS viewports. Generated PNGs stay ignored under `snapshots/` by design; the original site and product media are unchanged.

## Integration separation

- Reusable option normalization lives in `packages/heuristic-theme/storefront/js/product-options.mjs` (brandless, no fetch).
- Existing storefront controls continue to use the local variant ID and current cart/checkout ownership.
- Storefront DOM and CSS are the existing Heuristic renderer, not Resolve's compiled runtime.
- Completeful-backed availability requires a **real server-side provider availability and checkout policy**. The local-stock zero field must NOT be synthesized to make the merchant product appear purchasable.
- Merchant-approved FNF copy, actual product imagery and visual theme configuration remain instance/site data, not new engine constants.
- No production deployment, publication, supplier mutation or merchant data overwrite is performed here.
