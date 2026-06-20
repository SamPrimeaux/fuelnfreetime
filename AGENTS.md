# Agent guide — Fuel & Free Time

**Repo:** `fuelnfreetime`  
**Stack:** Cloudflare Workers · D1 · R2 · KV · Durable Objects · Workers AI  
**Production:** https://fuelnfreetime.com  
**Staging:** https://fuelnfreetime.meauxbility.workers.dev

This file is the entry point for human and AI collaborators (including Connor's agents). Follow the linked runtime contracts — do not bypass them.

---

## Before you change anything

1. Read the contract for your area (below).
2. Identify whether the change is **public storefront**, **admin API**, or **schema/migration**.
3. Prefer extending existing routes and tables over parallel implementations.
4. Never commit secrets — use `wrangler secret put` (see [`SECRETS.md`](SECRETS.md)).
5. Deploy with `npm run deploy` from repo root (builds admin SPA + Worker).

---

## Runtime contracts (source of truth)

| Domain | Document | Status |
|--------|----------|--------|
| **Commerce** — products, variants, inventory, media, cart, checkout, orders | [`docs/RUNTIME-CONTRACTS-COMMERCE.md`](docs/RUNTIME-CONTRACTS-COMMERCE.md) | Products/inventory live; Stripe **not wired** |
| **Stripe** — ordered implementation checklist | [`docs/RUNTIME-CONTRACTS-STRIPE.md`](docs/RUNTIME-CONTRACTS-STRIPE.md) | Not started |
| **CMS** — pages, sections, publish, KV, R2 bodies, live editor | [`docs/FNF-CMS-SPRINT-2026-06-20.md`](docs/FNF-CMS-SPRINT-2026-06-20.md) | Live |

If a feature does not fit an existing contract, **update the contract first** (or in the same PR), then implement.

---

## Key source files

| Area | Path |
|------|------|
| Worker router | `src/index.js` |
| Public store API | `src/store/api.js` |
| Admin API router | `src/admin/api.js` |
| Media library | `src/admin/media.js` |
| Store preferences | `src/admin/store.js` |
| Admin auth | `src/lib/auth.js` |
| Admin clean URLs | `src/lib/admin-routes.js` |
| D1 schema | `db/schema.sql` |
| Storefront JS | `public/js/store-catalog.js`, `store-product.js`, `store-cart.js` |
| Admin product editor | `public/admin/product-edit.html`, `public/admin/js/media-picker.js` |
| CMS | `src/cms/api.js`, `src/cms/registry.js`, `src/cms/r2-store.js` |

---

## Bindings (`wrangler.toml`)

| Binding | Purpose |
|---------|---------|
| `DB` | D1 — products, orders, CMS, auth, media index |
| `WEBSITE_ASSETS` | R2 — files served at `/media/{r2_key}` |
| `CMS_CACHE` | KV — published CMS snapshots, store prefs fallback |
| `ASSETS` | Static HTML + admin UI |
| `CMS_EDITOR` | Durable Object — live CMS WebSocket rooms |
| `AGENTSAM_WAI` | Workers AI — Agent Sam |

---

## Common commands

```bash
npm run dev                    # local Worker
npm run deploy                 # production deploy
npm run admin:create -- <email> <password>
npm run db:migrate             # apply schema.sql remote
npm run db:seed:tee            # sample product + variants
npm run cms:bootstrap          # seed CMS from registry
npm run cms:republish          # rebuild KV snapshots
npm run cf:status              # Cloudflare account sanity check
```

---

## Auth (admin)

- Session cookie: `fnf_admin_session` (HttpOnly, 7-day TTL)
- All `/api/admin/*` except `POST /api/admin/login` require a valid session → `401 { "error": "Unauthorized" }`
- Admin HTML under `/admin/*` redirects to `/admin/login` when unauthenticated

---

## What is stubbed (do not assume it works)

- **Stripe / payments** — checkout creates D1 orders only
- **Order confirmation email** — no Resend send on checkout
- **Store password / B2B gates** — saved in prefs, not enforced on storefront
- **Order detail admin API** — list only, no line items endpoint
- **Gmail OAuth** — mail UI exists; OAuth route not wired

See commerce contract § "Implementation status" for the full matrix.

---

## Agent Sam

- Admin-only: `POST /api/admin/agentsam/chat`
- Uses live D1 reads for inventory/products — do not invent counts in prompts
- Context builder: `src/admin/agentsam.js`

---

## PR checklist for agents

- [ ] Change matches a runtime contract section (or contract updated in same PR)
- [ ] No secrets in code or `wrangler.toml`
- [ ] Public API errors use `{ "error": "..." }` with appropriate HTTP status
- [ ] Inventory changes go through documented endpoints (no ad-hoc SQL in UI)
- [ ] Product visibility: only `status = 'active'` on public `/api/store/*`
- [ ] Media URLs stay `/media/{r2_key}` — R2 keys are not rewritten at runtime
