# Fuel & Free Time × AgentSam — productization north-star + next-wave handoff

**Status:** Canonical agent handoff (2026-09-27). Supersedes customer-named “FuelX” implementation plans and soft-pedaled Tauri framing.  
**Repos:** `fuelnfreetime` @ `da328e0` (or current `main` HEAD).  
**Proof customer:** Fuel & Free Time — first paying install of portable ecommerce + CMS + AgentSam machinery.  
**Not in scope for this doc:** Implementing product/inventory/CMS code. Execute lanes below in later passes.

Related (do not treat as authority over this file when they conflict):

| Doc | Role after this handoff |
| --- | --- |
| [`../AGENTSAM.md`](../AGENTSAM.md) | Runtime agent README for the FnF Worker — update bindings/DO notes when lanes land |
| [`FNF-INFRASTRUCTURE-AUDIT-2026-09-25.md`](./FNF-INFRASTRUCTURE-AUDIT-2026-09-25.md) | Production audit facts; DO section is **historical** — removal is now required |
| [`apps-ecommerce-cms-agentsam-rescaffold-plan.md`](./apps-ecommerce-cms-agentsam-rescaffold-plan.md) | Tree/move plan; keep path targets, drop any Fuel*-class naming |
| [`../ecommerce-cms-agentsam.md`](../ecommerce-cms-agentsam.md) | Product promise / packaging |
| `agentsam-sdk/docs/plans/LOCAL-STUDIO-GRADUATION-2026-09-26.md` | Desktop IDE graduation — **separate track** from Fuel Worker lanes |

---

## Agent warnings (read before any code)

1. **Portability is the product.** Fuel is the proof install, not a permanent special snowflake. Same generic ecommerce/CMS + generic AgentSam packages + customer BrandPack/config/content → `customerN.com` without reopening Settings, Vault, CMS, analytics, product editing, MCP management, assistant drawer, auth, or queue internals.
2. **Zero local dependencies after handoff.** When this build is fully complete and handed off, nuking **any/every local file** (laptop checkout, `heuristic-theme`, `dist/`, seeds on disk) must be **zero risk** to production or customer ops. Operational SSOT is Cloudflare only (Worker + D1 + R2 + KV + Queues + Vault). If the live site or dashboard still needs a local path, the handoff failed.
3. **No new `Fuel*` implementation files** for application behavior (hosts, adapters, drawers, vault, editors, runtimes). Customer layer = declarative config/content only.
4. **`WEBSITE_ASSETS` ≠ `ASSETS` / `STATIC_ASSETS`.** R2 = customer content authority (pages/sections/globals/media + publish artifacts). Workers Static Assets = **deployed** product runtime on Cloudflare (compose JS, section renderers, admin SPA) — not a laptop folder. Rename clarity: `ASSETS` → `STATIC_ASSETS`. Do not invent a third asset binding. Do not merge them. Local `packages/heuristic-theme` / `dist/assets` are **build inputs only**; they are not operational authority.
5. **Headless CMS bar:** a non-engineer on customer123 must create/compose/publish pages and edit globals/theme tokens from the **live dashboard** **without** `wrangler deploy`, without a local checkout, and without editing theme files on disk. Slot-hydration on fixed theme shells is not enough — lane B must deliver customer-owned page composition within the registered section library, with content authority in D1/R2/KV.
6. **Remove `CMS_EDITOR` / `CmsEditorRoom`.** It is WS broadcast only — not CMS authority, not AgentSam concurrency. Optimistic `page_revision` + REST. Do not add a DO for AgentSam.
7. **Webhook secrets live in Vault (D1 registry + `secret_ref`), not Wrangler.** Only infrastructure secret for vault crypto: `VAULT_MASTER_KEY`. Do not add another Wrangler webhook secret.
8. **Do not copy private SDK packages into Fuel.** Graduate/publish first, then install. Wrap `ASSET_JOBS` with public `agentsam-queue-control`; do not rewrite the pipeline.
9. **`commerce-analytics` must not ship fake/demo metrics.** Host is `CommerceAnalyticsHost`, not `FuelAnalytics*`.
10. **Settings host is real** against plugins/MCP/skills/vault/usage — never copy Local Studio `createFixtureSettingsHost`. Name: `CommerceSettingsHost` / `AppSettingsHost`.
11. **Local Studio / Tauri is a separate defect track.** Current `.app` redirect-to-remote is **not** acceptable product architecture. Do not conflate with Fuel Worker hardening. (Desktop is its own product; Fuel web handoff still must be cloud-only.)
12. **Sequencing:** A → B → C/E → D → G → F → H. Commerce integrity (A) first; CMS cloud-authority / serve-model honesty (B) next. Do not jump to polish UI (H) or Tauri before A.

---

## North star

Fuel & Free Time proves that **AgentSam Ecommerce + CMS** is portable:

```
generic apps/ecommerce-cms-agentsam/{frontend,backend,contracts,adapters}
  + generic AgentSam packages (vault, settings, key-manager, queue-control, assistant, analytics)
  + customer deployment package: brand/ content/ config/ seed/ migrations/ deployment-manifest
  → customerN.com
```

Customer-specific surface is **declarative only**:

- `productName`, capabilities, BrandPack, company/settings, theme tokens, feature/app manifest
- Prefer stable shared API contracts over per-customer endpoint maps when the ecommerce CMS owns the contract:
  - `/api/admin/settings/*`
  - `/api/admin/vault/*`
  - `/api/admin/integrations/*`
  - `/api/admin/usage/*`

### Hard acceptance criterion (whole polishing pass)

> Same generic ecommerce/CMS machinery + generic AgentSam packages + Customer BrandPack/config/content deploys to **customerN.com** without reopening Settings, Vault, CMS, analytics, product editing, MCP management, assistant drawer, auth, or queue internals.

If a change requires a Fuel-named host/adapter to “make it work,” it fails the criterion.

### Hard acceptance criterion (headless CMS / customer123)

A non-engineer on customer123 can, from the **live** `apps/ecommerce-cms-agentsam/` dashboard only (browser → Cloudflare APIs):

1. Add a page, compose it from **shipped templates** + the **registered section library**, set SEO, publish
2. Change global header/footer/nav **content** and theme **tokens**, publish
3. See it live on `customer123.com` **without** anyone running `wrangler deploy`, opening `heuristic-theme`, or needing any local checkout

If any of those require a laptop filesystem, theme HTML on disk, or a Worker deploy, the CMS lane is not done.

**In bar:** Shopify Online Store 2.0–class section library + typed fields (canonical Site → Page → Section → Block).  
**Out of bar:** freeform Webflow-style invent-any-div authoring; inventing new section *types* or renderer JS from the dashboard (those remain rare **product** ships — and after ship, authority is still the deployed Worker on Cloudflare, not a local folder).

### Hard acceptance criterion (zero local dependencies)

After this application build is fully complete and handed off:

> An operator may delete **every** local copy of the repo, theme package, `dist/`, env files on disk, and laptop caches. Production (`fuelnfreetime.com` / `customerN.com`), admin dashboard, CMS publish, commerce, media, and AgentSam must keep working with **zero** risk.

| Allowed to depend on | Forbidden as operational dependency |
| --- | --- |
| Cloudflare Worker (deployed) | Local `packages/heuristic-theme/**` |
| D1 / R2 (`WEBSITE_ASSETS`) / KV (`CMS_CACHE`) / Queues | Local `dist/assets` as source of truth |
| Deployed Static Assets binding (bytes **on Cloudflare**) | Any path like `/Users/.../fuelnfreetime/...` |
| Dashboard ↔ `/api/admin/*` over HTTPS | “Must sync theme then deploy to change copy” |
| Vault / secrets **in** the Worker account | Secrets that only exist in a local `.env` and nowhere in CF |

Local git is a **development/build tool**, not part of the running product. Seed/BrandPack on disk are **inputs to first deploy**; after handoff, live BrandPack/content live in cloud config/D1/R2.

---

## Naming / portability invariants

### Anti-list (WRONG — do not create or keep as app behavior)

| Wrong | Right |
| --- | --- |
| `FuelSettingsHost` | `CommerceSettingsHost` / `AppSettingsHost` |
| `FuelAnalyticsAdapter` / `FuelAnalyticsHost` | `CommerceAnalyticsHost` |
| `FuelCmsRuntime` | `CmsHost` (or existing CMS runtime module under ecommerce-cms-agentsam) |
| `FuelAgentDrawer` | `AgentSamDrawer` / `AgentSamAssistantHost` |
| `FuelVault` | `VaultHost` (backed by `@inneranimalmedia/agentsam-vault`) |
| `FuelProductEditor` | `ProductEditor` |

**Rule:** No new customer-named implementation file unless it represents **actual customer content/data**, not application behavior. `docs/brand/*`, seed JSON, BrandPack assets, and deployment manifests are OK to be Fuel-named. Hosts, adapters, drawers, and editors are not.

### Ideal layout trend

```
apps/ecommerce-cms-agentsam/
  frontend/
  backend/
  contracts/
  adapters/
deployment contributes (per customer):
  brand/  content/  config/  seed/  migrations/  deployment-manifest
```

---

## Binding truth (production Worker `fuelnfreetime`)

Verified from Cloudflare Settings (Production) and `wrangler.toml` @ HEAD. **This table is current infrastructure inventory — not the full product story.** See **Serve model** below for the headless target.

| Binding | Resource | Role today |
| --- | --- | --- |
| `WEBSITE_ASSETS` | R2 bucket `fuelnfreetime` | Media / CMS section JSON / AgentSam / Completeful imagery (**not** public HTML shells today) |
| `ASSETS` | Workers Static Assets `./dist/assets` | Built admin/storefront shells (`env.ASSETS.fetch`) — theme HTML/CSS/JS |
| `CMS_EDITOR` | DO `CmsEditorRoom` | **Remove** — WS section:patch/publish broadcast only |
| `ASSET_JOBS` | Queue `fnf-asset-jobs` | Asset pipeline — wrap via `agentsam-queue-control` |
| `CMS_CACHE` | KV `fuelinfreetime-cache` / `fuelnfreetime-cache` | Published CMS snapshots + short caches |
| `DB` | D1 `fuelnfreetime` | Authority for pages, commerce, agentsam_*, vault refs |
| `FNF_VECTORIZE` | `fnf-agentsam-bge-m3-1024` | Retrieval index (customer-scoped name OK for resource ID; code should not hardcode Fuel class names) |
| `AGENTSAM_WAI` | Workers AI Catalog | Inference binding |

**Secrets observed (dashboard):** `RESEND_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — migrate provider webhook secrets toward Vault registry; do not add more Wrangler webhook secrets.

### Preferred rename (clarity, not deletion)

- `ASSETS` → **`STATIC_ASSETS`**
- Update all `env.ASSETS.fetch` call sites to `env.STATIC_ASSETS.fetch`
- Keep `[assets]` Workers Static Assets feature; only rename the binding
- **Do not** invent another asset binding; **do not** merge R2 and static assets

### Keep for now / migrate later

| Item | Guidance |
| --- | --- |
| `ALLOWED_ORIGINS` | Keep — media CORS only |
| `CMS_WARM_SECRET` | Prefer publish + lazy rebuild / admin warm; eventually `agentsam_hook` (or vault-backed hook), not a magic forever env secret. Publish itself must write the live snapshot so warm is maintenance, not the only path to correctness. |

---

## Serve model: cloud authority (R2/D1/KV) vs deployed runtime

### Zero-local end state (lock this)

```
Operational product (after handoff) — 100% Cloudflare
─────────────────────────────────────────────────────
  Worker script
  STATIC_ASSETS binding  ← bytes already uploaded to CF (not your laptop)
  WEBSITE_ASSETS (R2)    ← pages/sections/globals/media/artifacts
  DB (D1)                ← metadata, revisions, commerce, vault refs
  CMS_CACHE (KV)         ← published snapshots
  Queues / AI / secrets

Local disk after handoff — optional, disposable
─────────────────────────────────────────────────────
  git clone, heuristic-theme, dist/, .env, IDE
  → may be deleted with 0 risk
```

`STATIC_ASSETS` means **the Cloudflare Workers Static Assets binding** (deployed artifact). It does **not** mean “keep relying on local theme files forever.” Local theme → sync → `dist/` is only how engineers **ship a product runtime upgrade**. Day-to-day site ops never touch that path.

### Product roles

| Binding | Product role | After handoff |
| --- | --- | --- |
| `WEBSITE_ASSETS` (+ D1 + `CMS_CACHE`) | **Customer content authority** — pages, sections, blocks, `site_globals`, theme tokens, media, published artifacts | Dashboard edit → publish; **no local files; no redeploy** |
| `STATIC_ASSETS` (today `ASSETS`) | **Deployed product runtime** on CF — compose JS, registered section/block renderers, admin SPA, commerce templates | Already on Cloudflare; laptop optional |

**Never merge bindings.** Do not treat local `packages/heuristic-theme` or local `dist/assets` as “the website.” Do not require moving admin SPA into R2 as the primary model. Do not leave customer chrome/copy trapped in a compile path that only exists on an engineer’s machine.

### Honest gap today (Fuel) — why it still feels wrong

```
Public request → Worker → STATIC_ASSETS shell (deployed, but still theme-shaped)
                      → hydrate from KV ← R2 section JSON
Dashboard publish → R2 + KV for slot fields only
```

| Already cloud / no-deploy | Still wrong for handoff |
| --- | --- |
| Slot field publish → R2 + KV | New pages / layouts still need local theme + deploy |
| Media in R2 | `PAGE_REGISTRY` / section schemas gated in code, not customer data |
| Worker running on CF | Operator mental model still “edit local HTML then ship” |

Today = **content hydration on fixed shells**. Target = **customer-owned page composition** with **all operational authority in Cloudflare**. Nuking local must not matter.

### Target serve flow

```
Rare product ship (CI / engineer laptop → Cloudflare once):
  build compose + renderers + admin → upload STATIC_ASSETS + Worker
  (after upload, local build tree is disposable)

Daily customer ops (browser only):
  pages / sections / site_globals / media / publish
        ↓
  D1 + R2 + KV  (all on Cloudflare)
        ↓
Public GET /slug → Worker → deployed runtime + cloud content → live HTML
```

**Styles split:** theme tokens / brand vars → D1/R2. Compiled CSS for section renderers → **deployed** `STATIC_ASSETS`. Changing a hex or logo ≠ deploy and ≠ local files. Changing how Hero *renders* = rare product ship to Cloudflare (then local can be deleted again).

**Published HTML in R2:** allowed as a **publish artifact**. Authority remains structured Page → Section → Block in D1 + R2 JSON — not hand-edited public HTML, and not local theme HTML.

Canonical domain: IAM `src/core/agentsam/cms/`. Fuel Worker is the live hybrid until lane B closes the cloud-composition gap.

---

## Durable Object removal (`CMS_EDITOR` / `CmsEditorRoom`)

**Fact:** `CmsEditorRoom` is only WebSocket broadcast for `section:patch` / publish. It is not AgentSam authority and not required for CMS CRUD.

**Pointers today:**

- Class: `apps/ecommerce-cms-agentsam/backend/do/CmsEditorRoom.js`
- Export: `apps/ecommerce-cms-agentsam/backend/index.js` (`export { CmsEditorRoom }`)
- Client WS: `apps/ecommerce-cms-agentsam/frontend/static/js/cms-live.js`
- Wrangler: `[[durable_objects.bindings]]` + migration `v1-cms-editor` / `new_sqlite_classes = ["CmsEditorRoom"]`

**Replace with:**

- REST `PATCH` / `PUT` for section/page edits
- Explicit publish endpoint
- Preview refetch after publish
- Optional later SSE for multi-tab awareness
- Concurrency: optimistic **`page_revision`** (D1), not a DO

**Removal sequence (mandatory order):**

1. Stop WS clients (remove or no-op `cms-live.js` usage; ship REST path first)
2. Deploy and observe **zero** DO/WebSocket traffic
3. Remove `CMS_EDITOR` binding, class export, and `CmsEditorRoom` source
4. Add Wrangler **`deleted_classes`** migration for `CmsEditorRoom`
5. Do **not** solve AgentSam concurrency with a Durable Object

### Lane B expands beyond DO exit (CMS architecture)

Lane B is **not** “delete the DO and stop.” After REST + revision + DO removal, B must close the headless + **zero-local** gap:

1. **Data-driven pages** — create/list/publish as D1(+R2) data on Cloudflare, not code `PAGE_REGISTRY` / local theme routes. New customer pages from shipped templates without local files or deploy.
2. **`site_globals` / HEADER|FOOTER** — editable cloud authority for header/footer/nav + theme tokens; not local theme-JS chrome with CMS copy bolted on.
3. **Registered sections** — add/reorder/hide/configure from the library in the live dashboard; theme editor driven by **page-type schema** (normal vs scene). Scene pages get scene/poster/camera/reduced-motion fields — never a fake homepage because the editor assumes Home.
4. **Publish writes the live snapshot** — complete public snapshot to KV and/or R2 on publish; lazy rebuild OK; warm is maintenance, not magic correctness; snapshot must not require a local rebuild.
5. **Preview refresh** — refetch/reload after mutation; no DO room required.
6. **bridge-fly / Community path truth** — Community is a real CMS page; scene experience lazy-loads; must not masquerade as `/`.
7. **Handoff proof** — after B, deleting the local Fuel checkout must not break storefront or CMS admin (only a new *product runtime* ship would need a clone again).

**Lane B non-goals:** inventing a third asset binding; merging R2 with Static Assets; treating local `dist/` as SSOT; AgentSam chat via DO; freeform executable HTML as content SSOT; “just keep the theme package forever.”

---

## Vault / webhooks

- Registry: `agentsam_webhooks` (+ related) with `secret_ref` → `user_secrets` (Vault)
- Multiple Completeful subscriptions = **multiple rows**, not multiple Wrangler secrets
- Infrastructure secret allowed for crypto: **`VAULT_MASTER_KEY`** only (for this concern)
- **Do not** add another Wrangler webhook secret for Completeful/Resend/etc. as the long-term design
- Stripe/Resend secrets currently on the Worker are migration debt — move verification secrets behind Vault refs as lanes allow

Packages (graduate then install — do not vendor into Fuel):

| Package | Path (SDK) | Note |
| --- | --- | --- |
| `@inneranimalmedia/agentsam-vault` | `agentsam-sdk/packages/agentsam-vault` | private today |
| `@inneranimalmedia/agentsam-key-manager` | `agentsam-sdk/packages/agentsam-key-manager` | private today |
| `@inneranimalmedia/agentsam-settings` | `agentsam-sdk/packages/agentsam-settings` | private today |
| `agentsam-queue-control` | `agentsam-sdk/packages/agentsam-queue-control` | already public — wrap `ASSET_JOBS` |

---

## Analytics / Growth / Settings

- **Analytics:** `fuelnfreetime/packages/commerce-analytics` exists. Overview/Health must not ship fake metrics from the package. Adapter/host name: **`CommerceAnalyticsHost`**.
- **Growth:** Real backend already exists — productize integrity/UI; do not rebuild.
- **Settings:** Implement **`CommerceSettingsHost` / `AppSettingsHost`** against `agentsam_plugins` / MCP / skills / vault / usage. **Do not** copy Local Studio fixture settings host patterns into Fuel.

---

## Parallel lanes A–H (generic naming)

Sequence: **A → B → C/E → D → G → F → H**. Tauri/Local Studio is **out of band** (see next section).

| Lane | Name (generic) | Owns | Explicit non-goals |
| --- | --- | --- | --- |
| **A** | Commerce integrity | Catalog/orders/inventory truth, provider write gates, webhook verify via Vault refs, no fake admin numbers | No Fuel* hosts; no DO work; no Tauri |
| **B** | CMS composition + DO exit | REST patch/publish/preview; `page_revision`; stop WS → remove `CMS_EDITOR`; **data-driven pages**; **site_globals**; registered sections + page-type schemas; publish writes full **cloud** snapshot; Community/bridge-fly path truth; **prove nuke-local = 0 risk** | No AgentSam DO; no R2/static merge; local theme not SSOT; no freeform HTML SSOT |
| **C** | Vault + webhooks registry | `agentsam_webhooks` + `secret_ref` → secrets; graduate vault packages | No new Wrangler webhook secrets |
| **E** | Queue control wrap | Wire `ASSET_JOBS` through `agentsam-queue-control`; observe/retry UI | No pipeline rewrite |
| **D** | Settings / MCP / skills host | `CommerceSettingsHost` / `AppSettingsHost` on real D1/MCP/vault/usage APIs | No fixture host copy; not `FuelSettingsHost` |
| **G** | Analytics host | `CommerceAnalyticsHost`; kill demo metrics in package consumers | No `FuelAnalytics*` |
| **F** | Assistant drawer | `AgentSamDrawer` / `AgentSamAssistantHost`; annotation context | No `FuelAgentDrawer` |
| **H** | BrandPack + deploy portability | Customer `brand/ content/ config/ seed/ migrations/ manifest`; doctor/scaffold | No reopening A–G internals |

### Suggested file ownership (Fuel repo unless noted)

| Lane | Primary paths |
| --- | --- |
| A | `apps/ecommerce-cms-agentsam/backend/` commerce + Completeful/Stripe handlers; D1 migrations under `db/` |
| B | `backend/cms/*` (api, registry, r2-store, html-rewriter, edge-hydrate, deploy/warm); `backend/do/CmsEditorRoom.js` (delete after); `frontend/static/js/cms-live.js`; theme-editor/pages admin; `wrangler.toml`; converge toward IAM `src/core/agentsam/cms/` contracts |
| C | Vault integration under `adapters/` + SDK packages; `agentsam_webhooks` SQL |
| E | Queue producer/consumer + `agentsam-queue-control` consumer adapter |
| D | Admin settings SPA routes + `/api/admin/settings|vault|integrations|usage` |
| G | `packages/commerce-analytics` + `frontend` analytics pages |
| F | Assistant shell/drawer under ecommerce frontend + AgentSam packages |
| H | `docs/brand/`, seed, deployment manifest, `bin/ecommerce.mjs` doctor/scaffold |

---

## Local Studio / Tauri truth (separate track — CRITICAL)

**Canonical contract (SDK):** `/Users/samprimeaux/agentsam-sdk/docs/plans/LOCAL-STUDIO-REAL-APP-CONTRACT-ADDENDUM-2026-09-27.md` — bundled Studio client + agentsamd; no product-critical `location.href` to hosted Studio; Content Studio Media must land as Sites → Media with desktop runtime (not Nitro-only optimize).

**Product intent:** Tauri exists so Local Studio is a **real local app** — real SQLite/DB editor, real terminal/PTY, real local bridges via `invoke`, agentsamd sidecar — not a thin wrapper that boots offline chrome and then dumps the user onto a remote origin.

**Current defect (do not soft-pedal):**

```
Tauri shell → offline bootstrap (desktop-boot.html)
  → "Open Studio UI" → https://agentsam.inneranimalmedia.com/...
  → remote page tries invoke("local_sqlite_bridge")
  → Tauri rejects (webview is no longer the privileged local document)
```

That redirect/remote-host pattern is a **defect relative to product intent**. Framing it as a “sane boundary” is rejected.

### What must actually work locally (via Tauri `invoke`)

Registered today in `agentsam-sdk/packages/agentsam-desktop-shell/src-tauri/src/main.rs`:

- `local_sqlite_bridge` — `commands/local_sqlite.rs` (Node bridge script under `packages/agentsam-database-editor/scripts/local-sqlite-bridge.mjs`)
- `local_content_bridge` — `commands/local_content.rs`
- `ensure_agentsamd` / `agentsamd_health` — `commands/agentsamd.rs`
- Keychain token get/set/delete
- Desktop OAuth: `start_agentsam_pkce_login`, `start_google_desktop_login`, `start_cloudflare_oauth_login`
- Deep link + updater

**UI that must be local (bundled), not remote-only:**

- Database editor using `local_sqlite_bridge`
- Terminal / PTY over agentsamd (see graduation plan: real xterm, not virtual-only)
- Workspace FS / Monaco / file tree wired to local bridges
- Offline shell that stays on `frontendDist` content — `tauri.conf.json` already sets `"url": "index.html"`; **`desktop-boot.html` still navigates away**

### Concrete file pointers for the next desktop agent

| Path | Why |
| --- | --- |
| `agentsam-sdk/packages/agentsam-desktop-shell/scripts/desktop-boot.html` | Defect: `STUDIO_UI = 'https://agentsam.inneranimalmedia.com/agentsam'`; Open Studio UI does `location.href = STUDIO_UI` |
| `agentsam-sdk/packages/agentsam-desktop-shell/src-tauri/tauri.conf.json` | `frontendDist: ../dist`, window `url: index.html` |
| `agentsam-sdk/packages/agentsam-desktop-shell/src-tauri/src/main.rs` | Invoke handler allowlist |
| `agentsam-sdk/packages/agentsam-desktop-shell/src-tauri/src/commands/local_sqlite.rs` | `local_sqlite_bridge` implementation |
| `agentsam-sdk/packages/agentsam-desktop-shell/manifests/local-studio.json` | Brand/manifest for Local Studio build |
| `agentsam-sdk/apps/local-studio/` | Product UI that must ship **into** shell `dist/`, not only as remote Worker page |
| `agentsam-sdk/docs/plans/LOCAL-STUDIO-GRADUATION-2026-09-26.md` | Graduation plan (already notes remote-URL-only shell) |

### Separation rule

- **Fuel Worker lanes A–H** never block on Tauri and must not “fix” Local Studio by pointing at remote IAM pages.
- **Local Studio / Tauri** never uses Fuel CMS DO removal or commerce integrity as a substitute for bundling real local UI.

---

## Recommended first execution lane

**Lane A — Commerce integrity** (generic naming only).

Prove catalog/orders/inventory and provider webhook verification without inventing `Fuel*` hosts. Establish Vault-backed secret resolution pattern that lanes C/E reuse. Leave CMS DO, Settings UI polish, analytics charts, and Tauri untouched in that pass.

**Lane B next** — CMS composition + DO exit (see Serve model + Lane B expands). Agents must not treat local theme / `ASSETS` shells as “the website.” Customer content authority is R2/D1/KV on Cloudflare after publish. Handoff proof: delete local checkout → site + dashboard still work.

---

## Doc maintenance

- This file is the **north-star + handoff SSOT** for productization polishing (including headless serve model and **zero local dependencies**).
- When a lane ships, append a short “Shipped” subsection with commit hash — do not fork a second north-star.
- Update `AGENTSAM.md` Worker bindings table when `STATIC_ASSETS` rename or `CMS_EDITOR` removal lands in production.
- Binding inventory rows describe **today**; Serve model describes **product goal**. Do not collapse them. “Local theme” is never operational SSOT after handoff.
