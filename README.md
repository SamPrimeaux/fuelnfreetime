# Fuel & Free Time

Official Cloudflare Workers site and admin dashboard for **Fuel & Free Time** — storefront marketing pages, CMS-style product/media management, analytics insights, and mail tooling (Gmail + Resend) on a single Worker.

**Production (Workers.dev):** https://fuelnfreetime.meauxbility.workers.dev  
**Target domain:** https://fuelnfreetime.com

---

## Architecture

```
Browser
   │
   ▼
Cloudflare Worker (src/index.js)  ── run_worker_first: true
   │
   ├── /api/*           JSON APIs (newsletter, admin CRUD, media, mail)
   ├── /media/*         Public R2 object streaming
   ├── /admin/*         Session-gated admin HTML + static assets
   └── /*               Marketing pages from ASSETS (/public)
```

The Worker runs **before** static assets (`run_worker_first = true`), so routing, auth gates, and APIs are handled in code; HTML/CSS/JS ship from the **ASSETS** binding.

---

## Cloudflare bindings

Configured in [`wrangler.toml`](wrangler.toml):

| Binding | Type | Resource | Purpose |
|--------|------|----------|---------|
| `DB` | **D1** | `fuelnfreetime` | Products, variants, orders, newsletter, admin auth, media metadata, mail settings |
| `WEBSITE_ASSETS` | **R2** | `fuelnfreetime` | Product/marketing images and uploads (served at `/media/<key>`) |
| `CMS_CACHE` | **KV** | `fuelnfreetime-cache` | Optional cache + mail settings fallback when D1 row missing |
| `ASSETS` | **Workers Assets** | `./public` | Static HTML, admin shell, analytics bundle, fonts |
| `AGENTSAM_WAI` | **Workers AI** | Account catalog | Reserved for Agent Sam / inbox triage / copy assist (wired in health check; endpoints coming) |

### Workers AI (`AGENTSAM_WAI`)

Workers AI is bound and reported on `/api/health`. Planned uses:

- Inbox triage summaries on `/admin/dashboard/email.html`
- Product description drafts in the admin product editor
- Newsletter / campaign copy suggestions when Resend campaigns go live

**Runtime access (when you add features):**

```js
const response = await env.AGENTSAM_WAI.run("@cf/meta/llama-3.1-8b-instruct", {
  messages: [{ role: "user", content: "Summarize this email thread…" }],
});
```

Pick models from the [Workers AI model catalog](https://developers.cloudflare.com/workers-ai/models/). No API key in repo — billing is via your Cloudflare account.

### Environment variables (`[vars]`)

| Variable | Example | Use |
|----------|---------|-----|
| `APP_NAME` | `Fuel & Free Time` | Health / metadata |
| `APP_DOMAIN` | `fuelnfreetime.com` | Canonical domain |
| `ALLOWED_ORIGINS` | `https://fuelnfreetime.com,https://www.fuelnfreetime.com,https://fuelnfreetime.meauxbility.workers.dev` | CORS when needed |

Secrets (never commit): see [`SECRETS.md`](SECRETS.md).

---

## Repository layout

```
fuelnfreetime/
├── src/
│   ├── index.js           # Worker entry — routing, auth gate, APIs
│   ├── admin/
│   │   ├── api.js         # Admin REST router
│   │   ├── media.js       # R2 upload, product_images joins
│   │   └── mail.js        # Gmail/Resend settings + demo inbox
│   └── lib/
│       └── auth.js        # Session cookies, password hashing
├── public/                # ASSETS root
│   ├── index.html         # Marketing homepage
│   ├── shop.html, about.html, community.html
│   └── admin/
│       ├── dashboard/     # overview, finance, analytics, email
│       ├── analytics/     # Unpacked React analytics (embed.html + assets)
│       ├── css/, js/      # Admin shell, mail UI
│       └── partials/      # Mail app markup fragment
├── db/
│   └── schema.sql         # Idempotent D1 DDL (source of truth)
├── scripts/
│   └── unpack-analytics.mjs  # Regenerate analytics from analytics-3pt-dashboard-buildin.html
├── legacy/                # Older static mocks (reference only)
└── wrangler.toml
```

---

## D1 database

**Database name:** `fuelnfreetime`  
**ID:** `9fd6ff92-e407-4b51-8b01-3c93f3845bb2`

### Tables

| Table | Description |
|-------|-------------|
| `newsletter_subscribers` | Public signup emails + source page |
| `admin_users` | Admin login accounts |
| `admin_sessions` | Hashed session tokens |
| `products` | Catalog items (slug, price_cents, status, legacy `image_url`) |
| `product_variants` | SKU, size, color, `inventory_qty` |
| `orders` / `order_items` | Schema ready; checkout not wired |
| `media_assets` | Every R2 upload (key, public URL, metadata) |
| `product_images` | Many-to-many product ↔ media with `position`, `is_primary` |
| `mail_settings` | Single-row JSON blob for Gmail/Resend/routing prefs |

### Migrations

Schema is **idempotent** (`CREATE TABLE IF NOT EXISTS`). Apply to remote:

```bash
npm run db:migrate        # remote (production)
npm run db:migrate:local  # local D1 for wrangler dev
```

Verify tables:

```bash
npx wrangler d1 execute fuelnfreetime --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

### Bootstrap admin user

Create the first admin in D1 (password hashing is done in-app on login setup — use your project's documented bootstrap path or insert via a one-off script). Sessions are cookie-based; admin HTML routes redirect to `/admin/login.html` when unauthenticated.

---

## R2 media (`WEBSITE_ASSETS`)

- **Upload:** `POST /api/admin/media` (multipart, session required)
- **List:** `GET /api/admin/media`
- **Delete:** `DELETE /api/admin/media/:id`
- **Public serve:** `GET /media/<r2-key>` — long-cache headers, no R2 public bucket required

Product images attach via:

- `GET/POST /api/admin/products/:id/images`
- `DELETE /api/admin/products/:id/images/:imageId`
- `POST /api/admin/products/:id/images/:imageId/primary` — syncs `products.image_url`

---

## Admin dashboard

Login: `/admin/login.html` → redirects to `/admin/dashboard/overview.html`.

### Shell navigation

| Section | Routes |
|---------|--------|
| **Insights** | Overview, Finance, Analytics (infra health), Email |
| **Store** | Store Summary, Products, Media, Inventory, Orders, Subscribers |
| **Settings** | Account (password change) |

### Analytics (Insights)

Unpacked from `analytics-3pt-dashboard-buildin.html` into `public/admin/analytics/`.

| Page | URL | View |
|------|-----|------|
| Overview | `/admin/dashboard/overview.html` | `overview` |
| Finance | `/admin/dashboard/finance.html` | `finance` |
| Analytics | `/admin/dashboard/analytics.html` | `health` |

Implementation: admin shell loads `/admin/analytics/embed.html?view=<view>` in an iframe so Babel/React scripts execute at page load (dynamic injection does not work).

**Regenerate after editing the source HTML:**

```bash
npm run analytics:unpack
```

### Email (Gmail + Resend)

`/admin/dashboard/email.html` — glass 3-pane mail UI with settings for Gmail inbox sync and Resend transactional sending. Demo inbox until Gmail OAuth is wired.

| API | Method | Description |
|-----|--------|-------------|
| `/api/admin/mail/settings` | GET | Load settings (API key redacted) |
| `/api/admin/mail/settings` | POST | Persist settings to D1 |
| `/api/admin/mail/messages` | GET | Demo messages |
| `/api/admin/mail/send` | POST | Send preview payload (Resend/Gmail routing stub) |

---

## Public API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Binding smoke test |
| `/api/newsletter` | POST | No | `{ email, source_page? }` → D1 |

---

## Admin API (session required)

Except `POST /api/admin/login`.

| Area | Endpoints |
|------|-----------|
| Auth | `login`, `logout`, `me`, `account/password` |
| Dashboard | `overview` — product/inventory/order/subscriber counts |
| Products | CRUD `products`, `products/:id/variants`, `variants/:id`, inventory patch |
| Media | `media`, `media/:id`, product image attach/detach/primary |
| Store data | `inventory`, `orders`, `subscribers` |
| Mail | `mail/settings`, `mail/messages`, `mail/send` |

All admin API responses use `Cache-Control: private, no-store`.

---

## Local development

**Requirements:** Node 18+, Cloudflare account, Wrangler auth (`wrangler login`).

```bash
git clone git@github.com:SamPrimeaux/fuelnfreetime.git
cd fuelnfreetime
npm install

# Optional: copy secrets for local-only features
cp .dev.vars.example .dev.vars   # if you add one; .dev.vars is gitignored

npm run db:migrate:local
npm run dev
```

Open http://localhost:8787 — Worker + assets + local D1/R2/KV bindings per Wrangler dev.

---

## Deploy

```bash
npm run deploy
# or
npx wrangler deploy
```

Post-deploy checklist:

1. `npm run db:migrate` if `db/schema.sql` changed
2. Confirm `/api/health` shows all bindings `true`
3. Log into `/admin/login.html` and spot-check Overview + Media

Workers **Assets** upload is part of deploy; large analytics files (~4.5 MB) live in `public/admin/analytics/`.

---

## Secrets (production)

```bash
wrangler secret put RESEND_API_KEY      # when enabling real sends
wrangler secret put STRIPE_SECRET_KEY   # future checkout
wrangler secret put STRIPE_WEBHOOK_SECRET
```

Gmail OAuth client credentials will likely be secrets + Workers KV/D1 when implemented. See [`SECRETS.md`](SECRETS.md).

---

## Brand assets

- **Logo (CF Images):** `https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ad23b2d9-e2e4-4ad6-eb81-9e4c983df000/thumbnail`
- Used in admin sidebar and login

---

## Custom domain & DNS cutover

**Current state:** `fuelnfreetime.com` is added to Cloudflare but **pending** (`ns_mismatch`) — the registrar still points at Google Domains / Shopify nameservers. Until cutover completes, use **https://fuelnfreetime.meauxbility.workers.dev**.

### Check propagation

```bash
npm run dns:check
```

### At your registrar (tomorrow)

Set nameservers to:

- `jessica.ns.cloudflare.com`
- `mike.ns.cloudflare.com`

Cloudflare zone ID: `816a5d2284103e4481987ceeb16c2ca9`

### DNS records to keep in Cloudflare (already staged)

| Type | Name | Target | Notes |
|------|------|--------|-------|
| **Worker** | `fuelnfreetime.com` | `fuelnfreetime` | Apex → this Worker |
| **Worker** | `www` | `fuelnfreetime` | Add in dashboard (recommended alert) |

`wrangler.toml` also declares custom domains for apex + `www` — they attach automatically once the zone is **active**.

### Worker routing (Shopify-compat)

Old Shopify URLs keep working after cutover:

| Legacy URL | Serves |
|------------|--------|
| `/pages/shop` | `/shop.html` |
| `/pages/community` | `/community.html` |
| `/pages/about` | `/about.html` |
| `/cart`, `/pages/cart` | `/cart.html` |
| `/collections/*` | `/shop.html` |
| `/products/:slug` | Product detail page |

`www.fuelnfreetime.com` → 301 redirect to apex.

### Verify after cutover

```bash
curl -s https://fuelnfreetime.com/api/health
curl -I https://fuelnfreetime.com/pages/shop
```

### Email (optional, post-cutover)

For Resend transactional mail from `@fuelnfreetime.com`, add their SPF/DKIM records in Cloudflare DNS when you enable sending. For inbox routing, use **Email Routing** in the dashboard (MX records Cloudflare provides).

---

## Roadmap (in-repo stubs)

- [ ] Checkout / Stripe → `orders` table
- [ ] Gmail OAuth + live inbox sync
- [ ] Resend production send + webhooks
- [ ] Workers AI triage on mail + product copy
- [x] Custom domain config in `wrangler.toml` + Shopify URL aliases (waiting on NS cutover)

---

## License

Private — Inner Animals LLC / Fuel & Free Time.
