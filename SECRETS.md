# Secrets

Fuel & Free Time now has server-side integrations that require Worker secrets.
Secret values stay out of Git and browser code. Install/rotate them with
wrangler secret put <NAME> (or the repo's integration-specific setup script)
and keep local values only in gitignored files.

Current secret inventory/status:

| Secret | Needed for | Status |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Checkout / payments | Configured on the production Worker |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | Configured on the production Worker |
| `CAPP_KEY` | Completeful Partner API | **Not configured yet** — install a `capp_test_` key before first provider sync |
| `COMPLETEFUL_WEBHOOK_SECRET` | Completeful inbound webhook signing | Not needed until webhook phase |
| `SHOPIFY_STOREFRONT_TOKEN` | If product data/checkout stays on Shopify instead of going fully custom | Decide before building shop backend — current product cards in `legacy/shop.html` are static placeholders, not pulled from Shopify |
| `RESEND_API_KEY` | Outbound transactional email (`re_…`) | `./scripts/set-resend-secrets.sh` via repo `.env.cloudflare` |
| `RESEND_WEBHOOK_SECRET_OUTBOUND` | Outbound lifecycle webhooks (`whsec_…`) → `/api/webhooks/resend/outbound` | One secret per Resend webhook |
| `RESEND_WEBHOOK_SECRET_INBOUND` | Inbound `email.received` webhooks (`whsec_…`) → `/api/webhooks/resend/inbound` | One secret per Resend webhook |
| `RESEND_WEBHOOK_SECRET` | Legacy outbound alias | Optional backward compat |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` | Gmail OAuth inbox sync | Not yet — OAuth route stubbed in mail UI |

For local dev, copy needed values into `.dev.vars` (gitignored already).
For production, copy `.env.cloudflare.example` → `.env.cloudflare` and run `./scripts/set-resend-secrets.sh`.
