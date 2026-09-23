# Current source and build ownership

See `docs/PIPELINE-OWNERSHIP.md` for the complete authority map. Build assets are assembled into `dist/assets`; root `public/` contains supplementary public assets only.

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
| **Commerce** — products, variants, inventory, media, cart, checkout, orders | [`docs/RUNTIME-CONTRACTS-COMMERCE.md`](docs/RUNTIME-CONTRACTS-COMMERCE.md) | Products/inventory + Stripe Checkout live |
| **Stripe** — implementation/history checklist | [`docs/RUNTIME-CONTRACTS-STRIPE.md`](docs/RUNTIME-CONTRACTS-STRIPE.md) | Checkout session + signed webhook + reservation flow implemented |
| **Completeful** — provider/catalog/fulfillment bridge | [`docs/RUNTIME-CONTRACTS-COMPLETEFUL.md`](docs/RUNTIME-CONTRACTS-COMPLETEFUL.md) | Phase A runtime coded; CAPP_KEY + first provider sync pending |
| **AgentSam app/runtime/UI** — Chat, Work, composer, tools, frontend/backend source authority | [`docs/RUNTIME-CONTRACTS-AGENTSAM.md`](docs/RUNTIME-CONTRACTS-AGENTSAM.md) | `apps/ecommerce-cms-agentsam/` is canonical; canonical frontend/backend ownership |
| **Agent Sam skills (R2 + D1)** | [`docs/AGENTSAM-SKILLS.md`](docs/AGENTSAM-SKILLS.md) | Sync with `npm run agentsam:skills:sync` |
| **Project context** | D1 `agentsam_project_context.id = ctx_fuelnfreetime` | Worker + IAM registry — `npm run db:seed:ctx-fuelnfreetime:all` |
| **CMS** — pages, sections, publish, KV, R2 bodies, live editor | [`docs/FNF-CMS-SPRINT-2026-06-20.md`](docs/FNF-CMS-SPRINT-2026-06-20.md) | Live |

If a feature does not fit an existing contract, **update the contract first** (or in the same PR), then implement.

---

## Key source files

| Area | Path |
|------|------|
| Worker router | `apps/ecommerce-cms-agentsam/backend/index.js` |
| Public store API | `apps/ecommerce-cms-agentsam/backend/store/api.js` |
| Admin API router | `apps/ecommerce-cms-agentsam/backend/admin/api.js` |
| Completeful admin API | `apps/ecommerce-cms-agentsam/backend/admin/completeful.js` |
| Completeful provider client / catalog mirror | `apps/ecommerce-cms-agentsam/backend/completeful/client.js`, `apps/ecommerce-cms-agentsam/backend/completeful/catalog.js` |
| AgentSam frontend | `apps/ecommerce-cms-agentsam/frontend/static/` |
| AgentSam backend handler | `apps/ecommerce-cms-agentsam/backend/admin/agentsam.js` |
| AgentSam runtime modules | `apps/ecommerce-cms-agentsam/backend/agentsam/` |
| Media library | `apps/ecommerce-cms-agentsam/backend/admin/media.js` |
| Store preferences | `apps/ecommerce-cms-agentsam/backend/admin/store.js` |
| Admin auth | `apps/ecommerce-cms-agentsam/backend/lib/auth.js` |
| Admin clean URLs | `apps/ecommerce-cms-agentsam/backend/lib/admin-routes.js` |
| D1 schema / migrations | `db/schema.sql` + `db/migrate-*.sql` |
| Storefront JS | `packages/heuristic-theme/storefront/js/` |
| Admin product editor | `apps/ecommerce-cms-agentsam/frontend/static/product-edit.html`, `apps/ecommerce-cms-agentsam/frontend/static/js/media-picker.js` |
| CMS | `apps/ecommerce-cms-agentsam/backend/cms/api.js`, `apps/ecommerce-cms-agentsam/backend/cms/registry.js`, `apps/ecommerce-cms-agentsam/backend/cms/r2-store.js` |

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
npm run app:frontend:sync       # assemble built frontend and theme into dist/assets
npm run dev                    # local Worker
npm run deploy                 # production deploy
npm run admin:create -- <email> <password>
npm run db:migrate             # apply schema.sql remote
npm run db:migrate:completeful # ensure Completeful mirror/link schema exists
npm run db:seed:tee            # sample product + variants
npm run cms:bootstrap          # seed CMS from registry
npm run cms:republish          # rebuild KV snapshots
npm run cms:post-deploy        # warm KV after deploy (uses CMS_WARM_SECRET)
npm run cms:deploy-hook        # trigger Workers Builds deploy hook (CMS_DEPLOY_HOOK_URL)
npm run cf:status              # Cloudflare account sanity check
```

---

## Auth (admin)

- Session cookie: `fnf_admin_session` (HttpOnly, 7-day TTL)
- All `/api/admin/*` except `POST /api/admin/login` require a valid session → `401 { "error": "Unauthorized" }`
- Admin HTML under `/admin/*` redirects to `/admin/login` when unauthenticated

---

## What is stubbed (do not assume it works)

- **Completeful fulfillment runtime** — Phase A client/catalog sync is implemented in code; CAPP_KEY still must be installed before provider sync can run
- **Order confirmation email** — no Resend send on checkout
- **Store password / B2B gates** — saved in prefs, not enforced on storefront
- **Order detail admin API** — list only, no line items endpoint
- **Gmail OAuth** — mail UI exists; OAuth route not wired

See commerce contract § "Implementation status" for the full matrix.

---

## Agent Sam

- Admin-only: `POST /api/admin/agentsam/chat`
- Uses live D1 reads for inventory/products — do not invent counts in prompts
- Frontend source authority: `apps/ecommerce-cms-agentsam/frontend/static/`
- Backend source authority: `apps/ecommerce-cms-agentsam/backend/admin/agentsam.js` + `apps/ecommerce-cms-agentsam/backend/agentsam/`
- These frontend and backend paths are canonical implementation targets. Only `dist/assets/` is generated runtime output; the old root source and compatibility bridges have been retired.
- **Skills:** D1 `agentsam_skill` registry + R2 `agentsam/skills/` markdown — see [`docs/AGENTSAM-SKILLS.md`](docs/AGENTSAM-SKILLS.md)

---

## PR checklist for agents

- [ ] Change matches a runtime contract section (or contract updated in same PR)
- [ ] No secrets in code or `wrangler.toml`
- [ ] Public API errors use `{ "error": "..." }` with appropriate HTTP status
- [ ] Inventory changes go through documented endpoints (no ad-hoc SQL in UI)
- [ ] Product visibility: only `status = 'active'` on public `/api/store/*`
- [ ] Media URLs stay `/media/{r2_key}` — R2 keys are not rewritten at runtime
