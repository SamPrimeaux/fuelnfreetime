# Fuel & Free Time

Official Cloudflare Workers site and admin dashboard for **Fuel & Free Time** — storefront, D1/R2-backed CMS, product catalog, analytics, and Agent Sam on a single Worker.

**Production:** https://fuelnfreetime.com  
**Workers.dev:** https://fuelnfreetime.meauxbility.workers.dev

---

## Client handoff — start here

### Admin login

1. Open **https://fuelnfreetime.com/admin/login**
2. Sign in with the admin account you were given
3. You'll land on the admin home — use the sidebar:
   - **Products** → add/edit catalog items, images, variants, inventory
   - **Content** → media library (R2 uploads)
   - **Pages** → edit all site copy (hero, manifesto, collections, footer, etc.)
   - **Agent Sam** (sparkle icon) → AI assistant with live store data

### Add a product

1. **Admin → Products → Add product**
2. Set title, slug, price, collection, **status = active** (draft won't show on shop)
3. Upload images in **Content**, attach in product editor
4. Add variants (size/SKU/inventory)
5. Shop grid at `/shop.html` loads live from D1 automatically

### Edit site content

1. **Admin → Pages** → pick Home, Shop, About, Community, or **Site (global)** for logo/footer
2. Edit all sections on the page → **Save** → **Publish live** (or use **Sync CMS to live** on Pages list)
3. Preview draft: open the public page with `?preview=1` while logged into admin

### Stripe (you wire this)

Checkout creates orders in D1 today (`POST /api/store/checkout`) without payment. Add Stripe when ready — see [`SECRETS.md`](SECRETS.md).

---

## Architecture

```
Browser
   │
   ▼
Cloudflare Worker (src/index.js)
   │
   ├── /api/store/*       Products, checkout, SEO meta
   ├── /api/cms/*         Published page JSON (KV → D1)
   ├── /api/admin/*       Session-gated CRUD + Agent Sam
   ├── /media/*           R2 assets (images, video, GLB)
   └── /*                 Marketing + admin static (ASSETS)
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
| `DB` | Products, CMS pages/sections, orders, media metadata, admin auth |
| `WEBSITE_ASSETS` | R2 — all marketing + product media at `/media/...` |
| `CMS_CACHE` | Published CMS snapshots `cms:page:{slug}:v1` |
| `ASSETS` | Static HTML, admin UI, hydration scripts |
| `AGENTSAM_WAI` | Workers AI — Agent Sam in admin |

---

## D1 tables

| Table | Purpose |
|-------|---------|
| `products` / `product_variants` / `product_images` | Store catalog |
| `pages` / `page_sections` | CMS content |
| `media_assets` | R2 library metadata |
| `store_settings` | SEO title, meta description, social image |
| `orders` / `order_items` | Checkout (Stripe pending) |
| `auth_users` / `auth_sessions` | Admin auth (IAM-parity; canonical) |
| `admin_users` / `admin_sessions` | Legacy auth (kept for migration fallback) |

---

## Public API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Binding smoke test |
| `GET /api/store/products` | Active products for shop grid |
| `GET /api/store/products/:slug` | Product detail + variants + gallery |
| `POST /api/store/checkout` | Create order (no Stripe yet) |
| `GET /api/store/meta` | SEO prefs for `<head>` |
| `GET /api/cms/pages/:slug` | Published CMS JSON |
| `GET /api/cms/pages/:slug?preview=1` | Draft preview (admin session) |
| `POST /api/newsletter` | Email signup |

---

## Admin API (session required)

| Area | Endpoints |
|------|-----------|
| CMS | `GET /api/admin/cms/registry`, `GET/PUT pages`, `PUT sections`, `POST publish`, `POST bootstrap` |
| Products | Full CRUD + variants + inventory + image attach |
| Media | Upload, list, folders, reorder, sync from R2 |
| Store | `GET/POST store/preferences`, online store overview |
| Agent Sam | `POST /api/admin/agentsam/chat` (live D1 context) |

---

## Commands

```bash
npm install
npm run dev                 # local Worker
npm run deploy              # build admin SPA + wrangler deploy

# Database
npm run db:migrate          # apply schema (remote)
npm run db:migrate:auth-users  # IAM auth_users + migrate legacy admin_users
npm run admin:create -- <email> <password> [role] [display_name]  # create auth_users row
npm run db:seed:auth-display-names  # canonical display names for known users
npm run cms:bootstrap       # seed full CMS + tee product from registry
npm run cms:republish       # clear stale KV + rebuild from D1

npm run cf:status           # zone + custom domain
npm run dns:check           # nameserver propagation
```

---

## Repository layout

```
fuelnfreetime/
├── src/
│   ├── index.js            # Worker router
│   ├── cms/
│   │   ├── registry.js     # Section schemas + seed defaults (source of truth)
│   │   ├── api.js          # Public + admin CMS
│   │   └── media-paths.js  # R2 URL map
│   ├── store/api.js        # Public storefront API
│   └── admin/              # Products, media, mail, Agent Sam
├── public/
│   ├── index.html, shop.html, about.html, community.html
│   ├── js/cms-hydrate.js   # CMS slot hydration
│   ├── js/store-catalog.js # D1 product grid
│   └── admin/              # Legacy admin shell + React analytics SPA
├── db/
│   ├── schema.sql
│   ├── seed-cms-full.sql   # Generated from registry
│   └── seed-tee.sql
├── admin-ui/               # React analytics (/admin/analytics/*)
└── docs/FNF-CMS-SPRINT-2026-06-20.md
```

---

## Custom domain

Zone should be **Active** with nameservers `jessica.ns.cloudflare.com` + `mike.ns.cloudflare.com`. Worker custom domains: apex + www.

```bash
npm run cf:status
curl -s https://fuelnfreetime.com/api/health
```

---

## Roadmap

- [ ] Stripe checkout → `orders`
- [ ] Gmail OAuth + live inbox
- [ ] Resend production send
- [x] D1/R2 CMS (registry-driven, multi-section)
- [x] Product catalog on shop from D1
- [x] Agent Sam with live inventory/page context
- [x] Custom domain on Cloudflare

---

Private — Inner Animals LLC / Fuel & Free Time.
