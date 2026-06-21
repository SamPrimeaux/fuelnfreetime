# Fuel & Free Time

Official Cloudflare Workers site and admin dashboard for **Fuel & Free Time** — storefront, D1/R2-backed CMS, product catalog, growth campaigns, discounts, analytics, and Agent Sam on a single Worker.

**Production:** https://fuelnfreetime.com  
**Workers.dev:** https://fuelnfreetime.meauxbility.workers.dev

---

## Client handoff — start here

### Admin login

1. Open **https://fuelnfreetime.com/admin/login**
2. Sign in with the admin account you were given
3. You'll land on **Admin home** — sidebar highlights your profile (name / role) in the footer

**Main admin routes (clean URLs):**

| Route | Purpose |
|-------|---------|
| `/admin/home` | Dashboard overview |
| `/admin/products` | Catalog list |
| `/admin/product-edit` | Create / edit product (media upload + browse library) |
| `/admin/inventory` | Stock by variant |
| `/admin/orders` | Order list |
| `/admin/subscribers` | Newsletter signups |
| `/admin/growth` | Marketing campaigns, attribution, publish to site |
| `/admin/discounts` | Discount codes & promotions |
| `/admin/content` | Media library (images, video, 3D — code/json assets hidden) |
| `/admin/pages` | CMS page list |
| `/admin/page-edit` | Section editor + publish |
| `/admin/agentsam` | Full-page Agent Sam |
| `/admin/email` | Mail inbox (Resend) |
| `/admin/analytics/*` | React finance / analytics SPA |

**Agent Sam in admin:** On most pages, the sparkle drawer is **docked** on the right (~400px) — not a full-screen overlay. It shares the workspace with the main content.

### Add a product

1. **Admin → Products → Add product**
2. Set title, slug, price, collection, **status = active** (draft won't show on shop)
3. **Media:** click the **+** drop zone, drag files, or **Browse library** (Content uploads)
4. Add variants (size / SKU / inventory) — a default variant is created on save if none exist
5. Shop grid at `/shop` loads live from D1

### Edit site content

1. **Admin → Pages** → Home, Shop, About, Community, or **Site (global)** for logo/footer
2. Edit sections → **Save** → **Publish live** (or **Sync CMS to live** on the Pages list)
3. Preview draft: public page with `?preview=1` while logged into admin

### Growth campaigns

1. **Admin → Growth** → **Create campaign**
2. Set goal, channels, brief — generate pack / publish when ready
3. **Publish** can push hero copy to the live homepage CMS and draft a subscriber email
4. Storefront attribution: `public/js/fnf-attribution.js` tracks UTM visits; `/go` short links supported

### Discounts

1. **Admin → Discounts** → **Create discount** → pick type (amount off products/order, buy X get Y, free shipping)
2. Set code, value, dates, usage limits → **Save**
3. Customers apply codes on **Cart** (`/cart.html`) before checkout
4. v1 checkout validates codes and records redemptions in D1 — **no Stripe charge yet**

### Checkout & Stripe

Today: **`POST /api/store/checkout`** creates a D1 order, applies discount codes, decrements inventory immediately — **without payment**.

Stripe Hosted Checkout is **not wired**. When ready, follow [`docs/RUNTIME-CONTRACTS-STRIPE.md`](docs/RUNTIME-CONTRACTS-STRIPE.md) — secrets only in `wrangler secret put`; success/cancel paths are **code constants**, not `wrangler.toml` vars.

---

## What's live (June 2026 sprint)

Recent production additions:

- **Admin shell** — profile hydrated from `/api/admin/me`; mobile hamburger top-left
- **Agent Sam** — docked side panel layout; tools/status wired; GPT-style composer
- **Growth** — `growth_campaigns` D1 table, full CRUD API, `/admin/growth` UI, campaign publish → CMS + email draft
- **Attribution** — `attribution_visits`, order UTM columns, storefront visit tracking
- **Discounts** — `/admin/discounts`, promo validation at cart + checkout, redemption ledger
- **Content library** — non-media R2 objects (json, txt, etc.) filtered out of `/admin/content`; working upload tiles
- **Product editor** — fixed save/error display; media drop zone + library picker
- **Email** — Resend send/receive, D1 inbox, team mailboxes (sam, connor, payments @fuelnfreetime.com)

---

## Architecture

```
Browser
   │
   ▼
Cloudflare Worker (src/index.js)
   │
   ├── /api/store/*          Products, checkout, discount validate, SEO meta
   ├── /api/attribution/*    UTM visit logging
   ├── /api/cms/*            Published page JSON (KV → D1)
   ├── /api/admin/*          Session-gated CRUD, growth, discounts, Agent Sam
   ├── /media/*              R2 assets (images, video, GLB)
   └── /*                    Marketing + admin static (ASSETS)
```

**Content pipeline (no stub fallback on public reads):**

```
Admin edit → D1 draft → Publish → KV snapshot → GET /api/cms/pages/:slug → cms-hydrate.js
```

Registry source of truth: [`src/cms/registry.js`](src/cms/registry.js)

---

## Cloudflare bindings

| Binding | Purpose |
|---------|---------|
| `DB` | Products, CMS, orders, media, growth, discounts, auth, mail |
| `WEBSITE_ASSETS` | R2 — marketing + product media at `/media/...` |
| `CMS_CACHE` | Published CMS snapshots `cms:page:{slug}:v1` |
| `ASSETS` | Static HTML, admin UI, hydration scripts |
| `AGENTSAM_WAI` | Workers AI — Agent Sam |
| `FNF_VECTORIZE` | Agent Sam semantic skill / context search |

---

## D1 tables

| Table | Purpose |
|-------|---------|
| `products` / `product_variants` / `product_images` | Store catalog |
| `pages` / `page_sections` | CMS content |
| `media_assets` | R2 library metadata |
| `store_settings` | SEO title, meta description, social image |
| `orders` / `order_items` | Checkout (+ discount + attribution columns) |
| `discounts` / `discount_redemptions` | Promo codes & usage |
| `growth_campaigns` | Marketing campaigns & packs |
| `attribution_visits` | UTM / campaign session tracking |
| `auth_users` / `auth_sessions` | Admin auth |
| `mail_*` / Resend webhook tables | Admin email inbox |

---

## Public API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Binding smoke test |
| `GET /api/store/products` | Active products for shop grid |
| `GET /api/store/products/:slug` | Product detail + variants + gallery |
| `POST /api/store/checkout` | Create order (v1 — no Stripe; supports `discount_code`) |
| `POST /api/store/discounts/validate` | Validate promo against cart |
| `GET /api/store/meta` | SEO prefs for `<head>` |
| `GET /api/cms/pages/:slug` | Published CMS JSON |
| `GET /api/cms/pages/:slug?preview=1` | Draft preview (admin session) |
| `POST /api/newsletter` | Email signup |
| `POST /api/attribution/visit` | Record UTM visit |
| `GET /go` | Campaign short-link redirect |

---

## Admin API (session required)

| Area | Endpoints |
|------|-----------|
| CMS | `GET /api/admin/cms/registry`, pages/sections CRUD, `POST publish`, `POST bootstrap` |
| Products | Full CRUD + variants + inventory + image attach |
| Media | Upload, list (browsable types only), folders, reorder, sync from R2 |
| Growth | `/api/admin/growth/overview`, campaigns CRUD, generate, publish |
| Discounts | `/api/admin/discounts/*` — list, create, update, export CSV |
| Store | Preferences, online store overview |
| Mail | Mailboxes, send, Resend status |
| Agent Sam | Chat, conversations, tools, file upload, workflows |
| Team | Members, invite |

---

## Commands

```bash
npm install
npm run dev                 # local Worker
npm run deploy              # build admin SPA + wrangler deploy

# Database
npm run db:migrate                              # apply base schema (remote)
npm run db:migrate:auth-users                   # IAM auth_users
npm run db:migrate:growth-campaigns             # growth_campaigns
npm run db:migrate:attribution                  # attribution_visits + order UTM cols
npm run db:migrate:discounts                    # discounts + redemptions
npm run admin:create -- <email> <password> [role] [display_name]
npm run cms:bootstrap                           # seed CMS from registry
npm run cms:republish                           # clear stale KV + rebuild from D1

npm run cf:status           # zone + custom domain
npm run dns:check           # nameserver propagation
```

---

## Repository layout

```
fuelnfreetime/
├── src/
│   ├── index.js              # Worker router
│   ├── cms/                  # Registry, publish, R2 store
│   ├── store/api.js          # Storefront + checkout + discount validate
│   ├── lib/
│   │   ├── discounts.js      # Shared discount validation
│   │   └── attribution.js    # UTM visit + order attach
│   └── admin/
│       ├── api.js            # Admin router
│       ├── growth.js         # Growth campaigns API
│       ├── discounts.js      # Discounts admin API
│       └── media.js          # Media library (filters non-browsable assets)
├── public/
│   ├── index.html, shop.html, cart.html, …
│   ├── js/cms-hydrate.js, store-catalog.js, store-cart.js, fnf-attribution.js
│   └── admin/
│       ├── growth.html, discounts.html, content.html, product-edit.html, …
│       ├── js/shell.js, growth.js, discounts.js, media-library.js, agentsam.js
│       └── partials/         # growth-app.html, discounts-app.html, …
├── db/
│   ├── schema.sql
│   ├── migrate-growth-campaigns.sql
│   ├── migrate-attribution.sql
│   └── migrate-discounts.sql
├── admin-ui/                 # React analytics (/admin/analytics/*)
└── docs/
    ├── RUNTIME-CONTRACTS-STRIPE.md   # Stripe task checklist (not started)
    └── RUNTIME-CONTRACTS-COMMERCE.md
```

---

## Custom domain

Zone should be **Active** with Cloudflare nameservers. Worker custom domains: apex + www.

```bash
npm run cf:status
curl -s https://fuelnfreetime.com/api/health
```

---

## Roadmap

- [ ] Stripe Hosted Checkout + webhooks + inventory reservations — [`docs/RUNTIME-CONTRACTS-STRIPE.md`](docs/RUNTIME-CONTRACTS-STRIPE.md)
- [ ] Gmail OAuth + live inbox (Resend receive is wired)
- [x] D1/R2 CMS (registry-driven, multi-section)
- [x] Product catalog on shop from D1
- [x] Agent Sam docked panel + live store context
- [x] Growth campaigns + attribution + publish flow
- [x] Discount codes (admin + cart; payment still pending)
- [x] Media library with product picker
- [x] Custom domain on Cloudflare
- [x] Admin email (Resend send/receive)

---

Private — Inner Animals LLC / Fuel & Free Time.
