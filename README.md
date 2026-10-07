# Fuel & Free Time

Official Cloudflare Workers storefront and commerce/CMS administration system for **Fuel & Free Time (FNF)**.

This repository is also the customer-1 proving ground for `@inneranimalmedia/ecommerce-cms-agentsam`: one portable ecommerce/CMS product installed with FNF-specific brand, catalog, media, campaigns, provider connections, and business data.

**Production:** https://fuelnfreetime.com
**Canonical Worker:** `apps/ecommerce-cms-agentsam/backend/index.js`
**Canonical admin/CMS app:** `apps/ecommerce-cms-agentsam`

> **Status snapshot — October 2026:** this is no longer a small storefront plus a few admin pages. The repo now contains the storefront, product/variant/inventory/order systems, Product Studio, Content/Brand workspace, media derivatives, CMS/page editing, portable theme/section contracts, theme lifecycle work, growth/discounts/attribution, analytics, email, Completeful integration, Stripe checkout runtime, and an AgentSam platform with tools, workflows, skills, files, MCP and contextual workbenches.

---

## Product installation relationship

Fuel & Free Time is the first customer installation of `@inneranimalmedia/ecommerce-cms-agentsam`.

The portable product owns reusable ecommerce, CMS, media, AgentSam, theme, analytics, and provider contracts. FNF owns customer-specific state:

- company and brand identity;
- storefront content and page composition;
- products, variants, inventory, orders, collections and discounts;
- media, albums, production artwork and campaign assets;
- provider credentials and account connections;
- customer-specific preferences, review state and business data.

The theme model is intentionally additive. Installing or previewing a theme must not replace customer content, silently publish pages, or mutate another theme.

Current theme/section layers include:

- `@inneranimalmedia/heuristic-theme` — Current FNF storefront theme/preset;
- `@inneranimalmedia/revise-theme` — alternate packaged theme/donor implementation;
- `@inneranimalmedia/section-library` — renderer-backed reusable sections;
- `packages/theme-contract` — portable theme/template contracts and shared runtime;
- `packages/fnf-theme` — FNF-specific theme package material;
- first-class `store_themes`, `store_theme_pages`, and theme event contracts for isolated draft theme workspaces.

---

# Application sitemap

The route/code map below reflects the current app rather than the older June-era README. Canonical clean-route definitions live in:

- `apps/ecommerce-cms-agentsam/backend/lib/route-manifest.js`
- `apps/ecommerce-cms-agentsam/backend/lib/admin-routes.js`
- `apps/ecommerce-cms-agentsam/backend/index.js`
- `apps/ecommerce-cms-agentsam/frontend/src/App.tsx`

## Storefront

| Route | Surface |
|---|---|
| `/` | CMS-backed home |
| `/shop` | Store catalog |
| `/products/:slug` | Product detail |
| `/shop/collections` | Collections index |
| `/shop/collections/:slug` | Collection detail |
| `/about` | CMS-backed About |
| `/community` | CMS-backed Community |
| `/collaborate` | Collaboration page |
| `/cart` | Cart |
| `/order-confirmation` | Checkout completion/status surface |
| `/policies` | Policies |
| `/terms` | Terms |
| `/go` | Campaign/attribution short-link redirect |
| `/media/*` | R2-backed media delivery |

Legacy `.html`, `/pages/...`, and old collection routes are normalized by the Worker where supported.

## Admin — commerce and product operations

| Route | Surface |
|---|---|
| `/admin/login` | Admin authentication |
| `/admin/home` | Operations dashboard |
| `/admin/products` | Product catalog/admin list |
| `/admin/products/create` | Product Studio catalog + design creation |
| `/admin/products/create/:productId` | Restore/edit a Product Studio draft |
| `/admin/products/help/artwork` | Artwork/print preparation help |
| `/admin/product-edit?id=:id` | Commercial Product Editor: title, description, price, SEO, collections, media, variants and publish state |
| `/admin/inventory` | Variant inventory |
| `/admin/orders` | Orders |
| `/admin/subscribers` | Newsletter subscribers |
| `/admin/discounts` | Discounts and promotions |
| `/admin/growth` | Growth campaigns, attribution and campaign publishing |

**Product workflow:** catalog blank → Product Studio draft → artwork/preparation/preview → **Save design** ‒ **Next* ‒ Product Editor → explicit fulfillment connection → deliberate publish.

Product Studio owns the creative draft. Product Editor owns commercial fields. A Studio save must not overwrite price, description, SEO, collections or inventory.

## Admin — product, CMS and themes

| Route | Surface |
|---|---|
| `/admin/content` | Content Library + Brand workspace |
| `/admin/pages` | CMS page hub |
| `/admin/page-edit` | Page/section content editor |
| `/admin/theme-editor` | Current storefront Theme Studio |
| `/admin/theme-workspace` | Isolated package-theme draft workspace |
| `/admin/store` | Online Store overview, truthful live previews and theme lifecycle |
| `/admin/preferences` | Store, navigation, announcement, SEO/social and review preferences |
| `/admin/revise-atlas` | Authenticated reusable Revise section/source atlas |
| `/admin/scene-lab` | Authenticated scene review/workbench |
| `/admin/bridge-fly-preview` | Authenticated bridge-scene preview |

Theme/page publication boundaries are intentional:

- editing a CMS page does not implicitly publish a theme;
- previewing a packaged theme does not publish the storefront;
- package-theme draft pages are isolated from the active theme;
- theme activation is fail-closed until review/runtime readiness gates are satisfied.

## Admin — AgentSam, analytics and account

| Route | Surface |
|---|---|
| `/admin/agentsam` | Full AgentSam workspace |
| `/admin/email` | Resend-backed mail workspace |
| `/admin/analytics/overview` | Store analytics overview |
| `/admin/analytics/finance` | Finance analytics |
| `/admin/analytics/health` | Operational health |
| `/admin/account` | Account/profile settings |

AgentSam also appears contextually in supported admin surfaces through the dock, mini composer, inspector/workbench, and resource-scoped actions. Those surfaces must reuse the same authorization and resource contracts rather than inventing separate assistants.

---

# Major product capabilities

## Commerce

- D1-backed products, variants and product media.
- Store collections with many-to-many product membership.
- Inventory plus reservation-aware checkout handling.
- Orders and order items.
- Product slug redirects.
- Product SEO overrides.
- Discounts and redemption tracking.
- Newsletter subscribers.
- Completeful catalog/product/variant/print-area synchronization and provider links.
- Product Studio drafts with original/prepared/preview media separation.
- Stripe Checkout runtime, reservation flow, signed webhook handling and order-status polling.

### Stripe state

The codebase includes Stripe Checkout session creation, inventory reservations, webhook signature verification, payment completion/expiration handling, and order status polling.

Primary endpoints:

- `POST /api/store/checkout/session`
- `POST /api/store/webhooks/stripe`
- `GET /api/store/orders/status?session_id=...`

Stripe keys/webhook secrets remain runtime secrets. Code presence does **not** by itself prove that a particular production Stripe account or webhook is currently enabled.

## Product Studio / creation workflow

Current Product Studio includes:

- provider catalog and variant selection;
- print-location metadata;
- selected-color/product preview;
- neutral positioning artboard;
- safe-area/grid guidance;
- artwork upload and Content Library selection;
- placement size/X/Y/rotation controls;
- keyboard nudging;
- original versus prepared versus preview media identity;
- deterministic manufacturing compatibility/preflight checks;
- provider render workflow;
- Save Design → Next → Product Editor handoff.

Advanced Creation Station work is still in progress. True multi-layer/front-back scene documents, richer artwork transforms, the planned AI Create/Edit/Results drawer, and proposal-before-apply AI artwork flow are not marked complete here.

See `docs/FNF_CREATION_STATION_MASTER_SPRINT_PLAN_20261006.md` once that planning branch is folded into main.

## Content and media

The Content system is more than a file grid:

- R2-backed media with D1 retadata;
- images, video and supported rich media;
- albums and album membership;
- product/media relationships;
- upload, search, filtering, sorting and manual ordering;
- original/source versus derivative intent;
- storefront/gallery/thumbnail/manufacturing/mockup roles;
- asset jobs through Cloudflare Queues;
- contextual media workbench;
- review comments;
- safe deletion/dependency handling;
- shared media picker for products/themes;
- Brand workspace tied to the same media authority.

Reusable media contracts live in `packages/media-kit`.

## CMS and theme system

The CMS includes:

- D1 pages and ordered page sections;
- draft/published page state;
- immutable/versioned draft behavior where required;
- KV published snapshots;
- page preview;
- live-source reconciliation for existing storefront sections;
- portable renderer-backed sections;
- repeatable blocks;
- section visibility/order/duplicate/remove mutations;
- global site/header/footer content;
- theme-specific preview runtime without copying merchant content;
- Revise source atlas and donor-section harvesting;
- package-theme workspace adapters;
- additive first-class store theme lifecycle.

Public CMS reads do not intentionally fall back to fabricated content.

## AgentSam platform

The app has a real AgentSam backend rather than only a chat widget. Current modules cover:

- AI/provider registry and runs;
- prompt registry, fragments, cache and usage;
- conversations and threads;
- file attachments;
- tools, tool policies, tool traces and tool analytics;
- skills and skill revisions;
- workflows and workflow nodes;
- selected-resource/context authority;
- MCP server/workflow integration;
- GitHub integration;
- semantic/vector context;
- quick actions;
- Completeful tools;
- webhooks/hook execution;
- compaction and analytics;
- contextual miniAgentSam/workbench surfaces.

Reusable interaction pieces live in `packages/agentsam-workbench`; global admin placement lives separately in the dock/shell.

## Growth, attribution and communications

- Growth campaign CRUD and campaign artifacts.
- UTM/attribution visit tracking.
- Order attribution attachment.
- `/go` campaign redirects.
- Resend-backed outbound/inbound mail.
- Mailboxes and mail settings.
- Newsletter subscribers.
- Campaign + email workflow hooks.

## Analytics and operations

- React analytics SPA.
- Overview, finance and health surfaces.
- AgentSam analytics and tool-call summaries.
- Platform binding inspection.
- Asset-job retry/recovery.
- Scheduled compaction and stale asset-job recovery.
- Cloudflare observability logs.

---

# Architecture

```text
Browser
  │
  ├─ Storefront routes
  │    ├─ CMS/page composition
  │    ├─ product / collection / cart runtime
  │    └─ Stripe checkout + order status
  │
  └─ Admin routes
       ├─ Commerce / Product Studio / Inventory / Orders
       ├─ Content / Brand / Media
       ├─ CMS / Theme Studio / package-theme workspace
       ├─ Growth / Discounts / Analytics / Email
       └─ AgentSam dock + workbenches
              │
              ▼
Cloudflare Worker
apps/ecommerce-cms-agentsam/backend/index.js
  │
  ├─ backend/admin/*          session-gated admin APIs
  ├─ backend/store/*          public commerce runtime
  ├─ backend/cms/*            page authority, publish, R2/KV bridge
  ├─ backend/agentsam/*       AI/tools/workflows/skills/MCP/context
  ├─ backend/completeful/*    provider catalog/images/client
  ├─ backend/media/*          media contracts
  └─ backend/webhooks/*       Completeful / Resend
  │
  ├─ D1: DB
  ├─ R2: WEBSITE_ASSETS
  ├─ KV: CMS_CACHE
  ├─ Workers AI: AGENTSAM_WAI
  ├─ Vectorize: FNF_VECTORIZE
  ├─ Queue: ASSET_JOBS
  └─ Static assets: ASSETS
```

## Content publication pipeline

```text
Merchant edit
   ↓
D1 draft / versioned section state
   ↓ explicit publish
published snapshot / storefront authority
   ↓
storefront renderer + shared section runtime
```

## Product creation pipeline

    Completeful/catalog source
       |
       v
    Product Studio design draft
       |- original artwork
       |- prepared manufacturing derivative
       +- placement/provider preview
       |
       v  Save / Next
    local storefront product (draft)
       |
       v
    Product Editor
       |- title / copy / price / SEO
       |- collections / media
       +- variants / inventory
       |
       v  explicit provider connection + readiness
    fulfillment mapping
       |
       v  explicit activation
    storefront

---

# Cloudflare runtime

wrangler.toml currently declares:

| Binding/runtime | Purpose |
|---|---|
| DB | D1 authority for commerce, CMS, AgentSam, mail, media metadata and configuration |
| WEBSITE_ASSETS | R2 customer/media asset bucket |
| CMS_CACHE | KV cache/snapshot layer for CMS |
| ASSETS | assembled storefront/admin static assets |
| AGENTSAM_WAI | Workers AI binding |
| FNF_VECTORIZE | semantic/vector context index |
| ASSET_JOBS | media/asset processing queue |
| Cron triggers | AgentSam compaction + stale asset-job recovery |

The Worker runs on the custom fuelnfreetime.com and www.fuelnfreetime.com domains.

---

# D1 domain map

The schema is migration-heavy; the important domains are:

| Domain | Representative tables |
|---|---|
| Commerce | products, product_variants, product_images, product_slug_redirects |
| Collections | store_collections, store_collection_products |
| Orders | orders, order_items, inventory_reservations |
| Discounts | discounts, discount_redemptions |
| Product Studio / Completeful | product_studio_drafts, completeful_* |
| CMS | pages, page_sections, cms_studio_bridge_nonces |
| Theme lifecycle | store_themes, store_theme_pages, store_theme_events |
| Media | media_assets, media_albums, media_album_assets, media_asset_jobs, asset_relationships |
| Store/brand | company, store_settings |
| Growth/attribution | growth_campaigns, attribution_visits |
| Auth/accounts | auth_users*, auth_sessions*, accounts, account_memberships* |
| Mail | mail_mailboxes, mail_messages, mail_settings |
| AgentSam | agentsam_* tool, prompt, conversation, workflow, skill, MCP, webhook, analytics and context tables |

Migration files are the authority for whether a particular table exists in a given environment. Do not infer that a newly committed migration has already been applied remotely.

---

# API map

This is a domain map, not an exhaustive endpoint dump.

## Public/store APIs

| Area | Examples |
|---|---|
| Products | GET /api/store/products; GET /api/store/products/:slug |
| Collections | GET /api/store/collections; GET /api/store/collections/:slug |
| Navigation/SEO | GET /api/store/nav; GET /api/store/meta |
| Discounts | POST /api/store/discounts/validate |
| Checkout | POST /api/store/checkout; POST /api/store/checkout/session |
| Order status | GET /api/store/orders/status |
| Stripe | POST /api/store/webhooks/stripe |
| CMS | /api/cms/* |
| Attribution | /api/attribution/* |
| Newsletter | POST /api/newsletter |

## Admin APIs

Major session-gated families include:

- /api/admin/products, variants, inventory, collections and product images;
- /api/admin/orders, subscribers and overview;
- /api/admin/media, albums, batch actions, comments, reorder and sync;
- /api/admin/brand;
- /api/admin/cms/*;
- /api/admin/store/preferences;
- /api/admin/store/themes/* and package-theme preview/page APIs;
- /api/admin/growth/*;
- /api/admin/discounts/*;
- /api/admin/mail/*;
- /api/admin/agentsam/*;
- /api/admin/analytics/*;
- /api/admin/platform/bindings.

---

# Repository map

    fuelnfreetime/
    |- apps/
    |  +- ecommerce-cms-agentsam/
    |     |- backend/
    |     |  |- admin/          commerce/admin/brand/media/store APIs
    |     |  |- agentsam/       AI, tools, workflows, skills, MCP, files/context
    |     |  |- cms/            page authority, publish, hydration/R2 bridge
    |     |  |- completeful/    provider catalog/client/images
    |     |  |- media/          provider-neutral media contracts
    |     |  |- store/          catalog, collections, inventory, Stripe
    |     |  |- webhooks/       provider webhooks
    |     |  +- index.js        Worker entry/router
    |     |- frontend/
    |     |  |- src/            React analytics/account/Product Studio
    |     |  |- static/         admin workspaces/pages
    |     |  |- theme-editor/   portable editor bridge/adapters
    |     |  |- inspector.js    contextual selection/miniAgentSam host
    |     |  +- shell.js        admin shell integration
    |     |- fixtures/
    |     |- agentsam.app.json
    |     +- package.json
    |- packages/
    |  |- agentsam-merch/       manufacturing profiles/preflight/product spine
    |  |- agentsam-workbench/   portable contextual assistant/media workbench
    |  |- media-kit/            media source/transform/delivery contracts
    |  |- theme-contract/       theme/template contracts + shared renderer runtime
    |  |- heuristic-theme/      current storefront theme/preset/runtime
    |  |- fnf-theme/            FNF theme package components
    |  |- commerce-analytics/   analytics contracts/UI
    |  |- admin-dock/           portable admin dock
    |  +- admin-profile-popup/  portable profile UI
    |- db/                      base schema, additive migrations, seeds and patches
    |- docs/                    architecture, runtime contracts, brand, ops and plans
    |- features/                machine-readable feature descriptors
    |- lib/assets/              asset classification/processing pipeline
    |- scripts/                 build, sync, import, migration and operational scripts
    |- skills/                  project-local AgentSam/Cloudflare/provider skills
    |- tests/                   unit/integration/browser contract suite
    |- public/                  storefront/static source assets
    |- wrangler.toml            Cloudflare Worker/runtime bindings
    +- package.json             build, DB, CMS, deploy and operational scripts

A recent AgentSam codebase index reported 898 files, 5,402 chunks, 14,289 symbols and 26,949 edges. Treat those as a point-in-time index snapshot, not a hard-coded repository contract.

---

# Development and verification

    npm install

    # Build canonical admin + assemble Worker assets + boundary checks
    npm run build:admin

    # Local Worker
    npm run dev

    # Core test suite examples
    node --test tests/*.test.mjs

    # Cloudflare status / DNS
    npm run cf:status
    npm run dns:check

Important operational rules:

- use additive migrations; do not rewrite production data casually;
- provider writes must be explicit and idempotent;
- a build is not the same as a deployed/verified feature;
- a preview is not the same as a provider-approved mockup;
- an AI-generated asset is not automatically approved production artwork;
- do not introduce a second media database, CMS editor, Product Studio, or collection authority to solve a local UI issue.

## CMS/theme verification

Theme/CMS changes should prove, at minimum:

- shared portable section rendering in public + editor contexts;
- real merchant edit/reload/publish behavior;
- no preview renderer fork;
- truthful live storefront desktop/mobile preview;
- package-theme draft isolation;
- no theme activation until readiness gates pass;
- responsive Theme Studio behavior.

---

# Key documentation

| Document | Purpose |
|---|---|
| AGENTS.md | Repository/operator guidance |
| AGENTSAM.md | AgentSam/repo context |
| docs/REPOSITORY-FILETREE-MAP.md | Repository map |
| docs/RUNTIME-CONTRACTS-COMMERCE.md | Commerce runtime |
| docs/RUNTIME-CONTRACTS-COMPLETEFUL.md | Completeful runtime |
| docs/RUNTIME-CONTRACTS-STRIPE.md | Stripe runtime |
| docs/STOREFRONT-CONTRACTS.md | Storefront contracts |
| docs/FNF_PRODUCT_WORKFLOW_CREATIVE_TO_COMMERCE_20261006.md | Product Studio -> Product Editor lifecycle |
| docs/FNF-PRODUCT-THEME-INTEGRATION-2026-10-06.md | Product/theme integration |
| docs/CMS_THEME_EDITOR_CONTEXTUAL_UX_20261006.md | Theme editor UX |
| docs/operating/FNF-MEDIA-AGENT-WORKBENCH-20261006.md | Media + AgentSam workbench |
| docs/operating/FNF-RESPONSIVE-SPEC-AND-DOCK-PLAN-2026-10-04.md | Responsive/dock contract |

---

# Current work / remaining gates

The platform is broad, but several areas remain intentionally unfinished or gated:

- Creation Station advanced layer model and artwork editing;
- Product Studio AI Create/Edit/Results experience and proposal-before-apply workflow;
- full provider-render parity/production acceptance for every catalog blank;
- final authenticated end-to-end order/fulfillment acceptance across all live integrations;
- package-theme lifecycle migration/review/runtime activation in environments where the additive migration has not yet been applied;
- final mobile/tablet acceptance on complex editor surfaces;
- release-level cleanup of old compatibility paths after the new authorities are proven.

Do not interpret an implementation branch, schema file, or UI control as proof that the corresponding production operation has been enabled.

---

# Deployment

Normal deployment:

    npm run deploy

That performs the admin build, boundary checks, Worker deploy and CMS post-deploy hook.

Remote migrations/seeds are explicit operations and are not assumed merely because migration files exist in Git.

The production deployment target and customer data are private to Inner Animals LLC / Fuel & Free Time.
