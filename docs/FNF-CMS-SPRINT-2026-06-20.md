# FNF CMS Sprint — June 20, 2026

**Project:** Fuel & Free Time (`fuelnfreetime`)  
**Stack:** Cloudflare Workers · D1 · KV · R2 · Workers Assets  
**Goal:** A production CMS where every feature follows one **end-to-end runtime contract** — admin edit → D1 draft → publish → KV snapshot → public API → storefront hydration — with no special cases.

---

## Executive summary

### Where we are (June 20)

| Layer | Status |
|-------|--------|
| **D1 schema** | `pages` + `page_sections` — live |
| **Publish pipeline** | Draft → `POST publish` → KV `cms:page:{slug}:v1` — live |
| **Public read API** | `GET /api/cms/pages/:slug` — live |
| **Storefront hydration** | `cms-hydrate.js` + `[data-cms]` slots — live on 4 pages |
| **Admin editor** | Legacy HTML (`pages.html`, `page-edit.html`) — hero-only |
| **Media library** | R2 + D1 folders — live; hero image picker is basic |
| **Admin SPA** | React `admin-ui` — analytics only; CMS not migrated |
| **Custom domain** | NS cutover to Cloudflare in progress |

### What “done” looks like for this sprint

1. **Runtime contract** (below) is the single source of truth for all CMS work.
2. **Hero CMS** is stable on all 4 marketing pages with preview + publish verified on production.
3. **Section registry** replaces duplicated `SECTION_FIELDS` / stub drift.
4. **SEO + store prefs** flow from D1 → `<head>` on storefront.
5. **Admin path** is clear: legacy editors stay working; React migration scoped as Phase 2.

---

## End-to-end runtime contract

Every CMS feature MUST conform to this contract. If it doesn’t fit, extend the contract explicitly (schema version bump, new section type, new API route) — never bypass it.

### 1. Pipeline invariant

```
┌─────────────┐    PUT section     ┌──────┐    POST publish    ┌─────────────┐
│ Admin UI    │ ─────────────────► │ D1   │ ─────────────────► │ KV snapshot │
│ (any shell) │    (draft)         │ SoT  │    (published)     │ read cache  │
└─────────────┘                    └──────┘                    └──────┬──────┘
                                                                      │
                    GET /api/cms/pages/:slug ◄────────────────────────┘
                              │
                              ▼
                    cms-hydrate.js → [data-cms] DOM slots
                              │
                              ▼
                    Static HTML fallback (always)
```

**Rules:**

| Rule | Detail |
|------|--------|
| **D1 is source of truth** | All edits land in D1 first. KV is a published read cache only. |
| **Publish is explicit** | Saving a section sets `draft`. Public traffic never sees drafts. |
| **KV key format** | `cms:page:{slug}:v1` — bump `:v2` only with a breaking snapshot shape change. |
| **Stub fallback** | If D1 + KV empty, `src/cms/stubs.js` serves defaults (never 500 on read). |
| **Static HTML wins on failure** | Hydration errors are silent; page still renders from HTML. |
| **Preview requires session** | `?preview=1` returns draft merge; 401 without admin cookie. |

### 2. Data model contract

#### `pages`

| Column | Type | Contract |
|--------|------|----------|
| `slug` | `TEXT UNIQUE` | `[a-z0-9-]+` only. Fixed set v1: `home`, `shop`, `about`, `community`. |
| `title` | `TEXT` | Admin display name; not auto-synced to `<title>`. |
| `status` | `draft` \| `published` | Page-level visibility gate for public snapshot. |
| `updated_at` | ISO-ish UTC | Bumped on meta, section, or publish change. |

#### `page_sections`

| Column | Type | Contract |
|--------|------|----------|
| `section_key` | `TEXT` | Unique per page. v1 keys: `hero` (more in Phase 2). |
| `sort_order` | `INTEGER` | Render order in API response. |
| `content_json` | `TEXT` (JSON object) | Schema defined by **section registry** (see §5). |
| `status` | `draft` \| `published` | v1: publish promotes **all** sections atomically. |

#### Future tables (Phase 2+ — reserved, not implemented)

```sql
-- page_seo (slug FK) — meta title, description, og:image
-- section_definitions — dynamic section types beyond stubs
-- page_revisions — optional audit trail
```

### 3. Public API contract

**Base:** same origin as storefront (`fuelnfreetime.com` or `*.workers.dev`)

#### `GET /api/cms/pages/:slug`

| Param | Value |
|-------|-------|
| `slug` | `[a-z0-9-]+` |
| `preview` | `1` optional — admin session required |

**Response 200:**

```json
{
  "ok": true,
  "page": {
    "slug": "shop",
    "title": "Shop",
    "status": "published",
    "updated_at": "2026-06-20 15:00:00",
    "source": "kv | database | stub",
    "sections": [
      {
        "key": "hero",
        "sort_order": 0,
        "status": "published",
        "content": { "headline": "...", "ctaPrimary": { "label": "...", "href": "..." } },
        "updated_at": "2026-06-20 15:00:00"
      }
    ]
  }
}
```

**Headers (published only):** `cache-control: public, max-age=60, stale-while-revalidate=300`

**Errors:** `404` unknown slug · `401` preview without session

### 4. Admin API contract

All routes require admin session (same auth as `/api/admin/*`).

| Method | Route | Body | Effect |
|--------|-------|------|--------|
| `GET` | `/api/admin/cms/pages` | — | List pages + preview snippet |
| `GET` | `/api/admin/cms/pages/:slug` | — | Page + sections (stub-merged) |
| `PUT` | `/api/admin/cms/pages/:slug` | `{ title?, status? }` | Update meta; auto-seeds if missing |
| `PUT` | `/api/admin/cms/pages/:slug/sections/:sectionKey` | `{ content: object }` | Upsert section → **draft** |
| `POST` | `/api/admin/cms/pages/:slug/publish` | — | All sections + page → **published**; write KV |
| `POST` | `/api/admin/cms/pages/:slug/seed` | — | Bootstrap D1 from stub + publish KV |

**Implementation:** `src/cms/api.js` · wired via `src/admin/api.js`

### 5. Section registry contract

**Problem today:** Field schemas live in `public/admin/js/pages-shared.js`, defaults in `src/cms/stubs.js`, and slots in HTML — three places that can drift.

**Contract:** One registry module is the canonical definition for each `(pageSlug, sectionKey)`.

**Target location (Sprint Task S2):** `src/cms/registry.js`

```js
// Shape each entry MUST follow:
{
  pageSlug: "shop",
  sectionKey: "hero",
  sortOrder: 0,
  fields: [
    { key: "headline", label: "Headline", type: "text", hydrate: "hero.headline" },
    { key: "imageUrl", label: "Hero image", type: "url", media: true, hydrate: "hero.imageUrl", attr: "src" },
    { key: "ctaPrimary.label", label: "Primary CTA", type: "text", hydrate: "hero.ctaPrimary.label" },
  ],
  defaultContent: { /* mirrors stub */ },
}
```

**Field types (v1):** `text` · `textarea` · `url` · `number` · `boolean` · `json` (nested objects)

**Consumers:**
- `stubs.js` — generated or imported from registry defaults
- Admin UI — renders forms from `fields`
- `cms-hydrate.js` — optional future: auto-bind from `hydrate` paths (v2); v1 keeps manual `[data-cms]` in HTML

### 6. Storefront hydration contract

**Script:** `/public/js/cms-hydrate.js` (include on every CMS-managed page)

**Page binding:**

```html
<html lang="en" data-cms-page="shop">
```

**Slot binding:**

```html
<h1 data-cms="hero.headline">Fallback headline</h1>
<img data-cms="hero.imageUrl" data-cms-attr="src" src="/fallback.jpg" alt="">
<a data-cms="hero.ctaPrimary.href" data-cms-attr="href" href="#">Shop</a>
```

| Attribute | Meaning |
|-----------|---------|
| `data-cms-page` | Slug passed to API (`home`, `shop`, …) |
| `data-cms` | `{sectionKey}.{fieldPath}` — dot paths for nested JSON |
| `data-cms-attr` | DOM target: default `textContent`; also `src`, `href`, `innerHTML` |

**Preview:** Append `?preview=1` to storefront URL; fetch uses `credentials: "include"`.

**Success marker:** `<html class="cms-hydrated">`

### 7. Media contract

| Concern | Contract |
|---------|----------|
| **Storage** | R2 bucket `WEBSITE_ASSETS` |
| **Public URL** | `/media/{r2_key}` via Worker (`src/index.js`) |
| **Admin list** | `GET /api/admin/media` |
| **CMS usage** | Section fields with `media: true` store full URL or `/media/...` path in `content_json` |
| **CORS** | `scripts/r2-cors.json` — run `npm run r2:cors` after bucket policy changes |

### 8. Bindings contract

From `wrangler.toml` — CMS features MUST use these bindings only:

| Binding | Role in CMS |
|---------|-------------|
| `DB` | Pages, sections, media metadata |
| `CMS_CACHE` | Published snapshots (`cms:page:*`) |
| `WEBSITE_ASSETS` | Binary media |
| `ASSETS` | Static HTML + admin + hydrate script |

**Health:** `GET /api/health` reports binding presence.

### 9. Auth contract

| Surface | Auth |
|---------|------|
| Public CMS read | None |
| Preview mode | Admin session cookie |
| Admin CMS write | Admin session cookie |
| Admin static / SPA | Session gate in `src/index.js` |

### 10. Extension rules (how to add features without breaking E2E)

| Want to… | Do this |
|----------|---------|
| Add a new field to hero | Add to registry → update stub default → add `[data-cms]` slot in HTML → admin form auto-renders |
| Add a new section (e.g. `featured-grid`) | Registry entry + migration seed + HTML slots + stub default |
| Add a new page | v2: requires slug in registry + static HTML file + Worker route + seed |
| Change snapshot shape | Bump KV key to `:v2`; migrate publish on next `POST publish` |
| Wire SEO | Add `page_seo` table → extend publish snapshot → Worker injects `<head>` on HTML serve (Phase 2) |

---

## Sprint phases

### Phase 0 — Foundation ✅ (complete June 20)

- [x] D1 `pages` / `page_sections` schema
- [x] CMS API (public + admin)
- [x] KV publish cache
- [x] `cms-hydrate.js` on home, shop, about, community
- [x] Legacy admin pages list + editor
- [x] Stub fallback pipeline
- [x] Media library (R2 + D1)
- [x] Custom domain NS → Cloudflare (propagating)

### Phase 1 — Stabilize & contract (June 20–27)

**Objective:** Make the hero loop bulletproof on production; eliminate drift.

| ID | Task | Owner | DoD |
|----|------|-------|-----|
| S1 | Verify zone Active + smoke test publish on `fuelnfreetime.com` | Ops | Edit hero → publish → live slot updates |
| S2 | Create `src/cms/registry.js`; derive stubs + `pages-shared.js` from it | Dev | Single source for field defs |
| S3 | Fix theme-editor field parity (community stats) | Dev | All hero fields editable everywhere |
| S4 | Enforce publish-on-visible: PUT `status=published` must call `writePublishedSnapshot` | Dev | No stale KV after visibility toggle |
| S5 | Replace hero image `prompt()` picker with media drawer link | Dev | Pick from `/admin/content.html` |
| S6 | Document CMS in README (API table + pipeline diagram) | Dev | README matches contract |
| S7 | Add `npm run cms:seed` alias + post-deploy checklist | Dev | One command bootstraps remote D1 |

**Exit criteria:** Non-dev can edit shop hero headline + image, publish, and see change on production within 60s.

### Phase 2 — Expand content surface (June 28 – July 11)

**Objective:** More than hero — without rewriting the pipeline.

| ID | Task | DoD |
|----|------|-----|
| P2-1 | Add `page_seo` table + admin SEO panel | `<title>` + meta description from CMS |
| P2-2 | Section: `footer` (shared across pages) | One publish updates all pages using shared section |
| P2-3 | Section: `featured-collections` on shop | 3-up grid slots hydrated |
| P2-4 | Section: `stats-band` on about | Reuse community stat pattern |
| P2-5 | Worker `<head>` injection for SEO (no full SSR yet) | SEO live without duplicating HTML |
| P2-6 | Migrate Pages list + editor to `admin-ui` React | `/admin/pages`, `/admin/pages/:slug` clean URLs |

### Phase 3 — Commerce CMS bridge (July 12+)

**Objective:** Connect CMS to products/orders without Shopify dependency.

| ID | Task | DoD |
|----|------|-----|
| P3-1 | Product cards on shop page from D1 `products` table | CMS picks collection; products from API |
| P3-2 | `store_settings` → storefront (currency, announcement bar) | D1 + KV prefs reflected on shop |
| P3-3 | Remove Shopify CDN image dependencies | Hero + product images on R2 |
| P3-4 | Optional: Shopify Storefront API for checkout only | Buy button external; content fully CF |

---

## File map (contract implementation)

| Concern | Path |
|---------|------|
| Worker router | `src/index.js` |
| Public + admin CMS API | `src/cms/api.js` |
| Default content | `src/cms/stubs.js` |
| Section registry (S2) | `src/cms/registry.js` *(to create)* |
| Admin API router | `src/admin/api.js` |
| D1 schema | `db/schema.sql` |
| CMS seed | `db/seed-cms.sql` |
| Storefront hydration | `public/js/cms-hydrate.js` |
| Admin field UI | `public/admin/js/pages-shared.js` |
| Page list / editor | `public/admin/pages.html`, `page-edit.html` |
| Theme quick-edit | `public/admin/theme-editor.html` |
| Media admin | `public/admin/content.html`, `public/admin/js/media-library.js` |
| React admin (Phase 2) | `admin-ui/src/pages/` *(CMS TBD)* |
| Bindings | `wrangler.toml` |

---

## Commands

```bash
# Local dev
npm run dev                    # Worker + assets
npm run dev:admin              # Admin SPA HMR (analytics)

# Database
npm run db:migrate             # Apply schema (remote D1)
npm run db:migrate:local       # Local D1
npm run db:seed:cms            # Seed 4 pages + hero sections (remote)
npm run db:seed:cms:local      # Local seed

# Deploy
npm run build:admin            # Vite → public/admin/_spa/
npm run deploy                 # build + wrangler deploy

# Ops
npm run cf:status              # Zone + custom domain status
npm run dns:check              # Nameserver propagation
npm run r2:cors                # R2 CORS for media uploads
```

---

## Smoke test checklist (run after every CMS change)

```bash
# 1. Health
curl -s https://fuelnfreetime.com/api/health | jq .

# 2. Published read
curl -s https://fuelnfreetime.com/api/cms/pages/shop | jq '.page.sections[0].content.headline'

# 3. Admin publish flow (browser)
#    /admin/page-edit.html?slug=shop → edit headline → Save → Publish
#    Reload /shop.html → headline updated + <html class="cms-hydrated">

# 4. Preview (logged in)
#    /shop.html?preview=1 → draft visible before publish

# 5. Fallback
#    Break API temporarily → static HTML still renders (no blank page)
```

---

## Known gaps (don’t pretend these exist)

| Gap | Sprint phase |
|-----|--------------|
| Add custom page | P2+ (needs registry + route + HTML) |
| Rich text / blocks | P2+ |
| Per-section publish | Not planned v1 (atomic page publish) |
| Version history | P3+ |
| Full SSR | Out of scope — hydration + static HTML |
| CMS in React admin | P2-6 |
| Shopify checkout | P3-4 optional |

---

## Decision log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-20 | D1 + KV publish cache, not KV-only | Need draft state + audit trail |
| 2026-06-20 | Hydration over SSR | Static HTML ships fast; CMS slots are incremental |
| 2026-06-20 | Section registry as S2 priority | Stops stub/admin/HTML drift |
| 2026-06-20 | Legacy admin for Phase 1 | React migration after contract is stable |
| 2026-06-20 | Atomic page publish | Simpler mental model for non-dev editors |

---

*This document is the north star for FNF CMS work. Update it when the runtime contract changes (version bump, new binding, new API route).*
