# Secrets

Nothing deployed today requires a secret — the static pages and newsletter
capture run entirely on `vars` + bindings already in `wrangler.toml`.

These get added with `wrangler secret put <NAME>` (never commit values to
`wrangler.toml` or `.dev.vars` gets pushed — both stay gitignored) as each
feature comes online:

| Secret | Needed for | Status |
|---|---|---|
| `STRIPE_SECRET_KEY` | Checkout / payments | Not yet — add when cart build starts |
| `STRIPE_WEBHOOK_SECRET` | Order confirmation webhook | Not yet |
| `SHOPIFY_STOREFRONT_TOKEN` | If product data/checkout stays on Shopify instead of going fully custom | Decide before building shop backend — current product cards in `legacy/shop.html` are static placeholders, not pulled from Shopify |
| `RESEND_API_KEY` | Transactional email (signup confirmation, order receipts) | Optional, not required for newsletter capture (writes straight to D1) |

For local dev, copy needed values into `.dev.vars` (gitignored already).
For production, `wrangler secret put NAME` from this repo's root.
