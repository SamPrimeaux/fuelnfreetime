# Fuel & Free Time — repository filetree map and buildout scaffold

Generated from the tracked checkout on 2026-09-23. This document separates canonical source from generated runtime output and gives the build/deploy path for the complete application.

## System shape

```text
Browser
  -> Cloudflare Worker: src/index.js
      -> public storefront and admin static assets
      -> /api/store/*       commerce, checkout, inventory, discounts
      -> /api/admin/*       auth-gated CMS, products, media, growth, mail, AgentSam
      -> /api/cms/*         published CMS reads
      -> /media/*           R2-backed assets
      -> Durable Object     src/do/CmsEditorRoom.js
      -> D1                 DB binding
      -> R2                 WEBSITE_ASSETS binding
      -> KV                 CMS_CACHE binding
      -> Workers AI         AGENTSAM_WAI binding
      -> Vectorize           FNF_VECTORIZE binding
```

## Canonical ownership

| Area | Canonical source | Generated or compatibility output |
| --- | --- | --- |
| Worker routing | `src/index.js` and `src/**` | `public/**` static assets are served by the Worker |
| AgentSam backend | `app/backend/admin/agentsam.js`, `app/backend/agentsam/**` | `src/admin/agentsam.js`, `src/agentsam/**` compatibility bridges |
| AgentSam frontend | `app/frontend/admin/agentsam/**`, `app/frontend/admin/home/**` | `public/admin/js/**`, `public/admin/agentsam.html`, `public/admin/css/**` |
| Ecommerce app package | `apps/ecommerce-cms-agentsam/**` | package scaffold consumed by AgentSam app tooling |
| CMS schema and registry | `src/cms/registry.js`, `src/cms/api.js`, `db/**` | KV published snapshots and R2 page bodies |
| Catalog/provider bridge | `src/completeful/**`, `src/admin/completeful.js`, `db/migrate-completeful.sql` | D1 catalog mirror and R2 payload archive |
| Admin SPA | `admin-ui/src/**` | built assets copied into `public/admin/**` |

## Buildout layers

### 1. Runtime and routing

- `src/index.js` is the Worker front door.
- `src/admin/api.js` dispatches authenticated admin APIs.
- `src/store/api.js` serves public catalog, checkout, discounts, and product reads.
- `src/cms/**` owns registry, publishing, KV, and R2-backed CMS content.
- `src/do/CmsEditorRoom.js` owns live editor collaboration.
- `src/webhooks/**` handles Completeful and Resend callbacks.

### 2. Commerce

- `src/store/**` contains product reads, inventory, orders, Stripe seams, and order email.
- `src/admin/completeful.js` exposes provider/catalog admin operations.
- `src/completeful/client.js` is the provider client.
- `src/completeful/catalog.js` owns resilient catalog synchronization and mirror state.
- `src/completeful/images.js` owns provider image proxy/cache behavior.
- `src/admin/media.js` and `public/admin/media-library.css` support the media library.
- `db/migrate-completeful.sql`, `db/migrate-media-library.sql`, and related migrations establish persistence.

### 3. Admin and AgentSam

- `admin-ui/src/layout/AdminLayout.tsx` mounts the app-owned shell and React content portal.
- `apps/ecommerce-cms-agentsam/frontend/shell.js` owns the reusable navigation shell.
- The shell contains two selectable navigation packages:
  - `persistent-frosted-rail`: desktop persistent sidenav with collapse/ghost reveal.
  - `mobile-glass-drawer`: right slide-over drawer with footer profile popup.
- `app/frontend/admin/agentsam/**` owns the full-page AgentSam surface.
- `app/backend/agentsam/**` owns conversations, tools, files, skills, context, vector search, workflows, and AI dispatch.
- `apps/ecommerce-cms-agentsam/bin/ecommerce.mjs` is the app-local CLI entry point.

### 4. Storefront and CMS

- `public/index.html`, `shop.html`, `product.html`, `cart.html`, `about.html`, and `community.html` are static storefront entry points.
- `public/js/**` contains storefront catalog, product, cart, attribution, CMS hydration, and shared behavior.
- `src/cms/registry.js` defines page sections and editable content contracts.
- `db/seed-cms.sql` and `db/seed-cms-full.sql` provide CMS seed data.
- `scripts/cms-post-deploy.mjs`, `cms-deploy-hook.mjs`, `warm-cms-cache.mjs`, and `republish-cms-kv.mjs` operate the publish/cache pipeline.

### 5. Persistence and operations

- `db/schema.sql` is the base schema.
- `db/migrate-*.sql` files are additive migrations; apply them in dependency order documented by the runtime contracts.
- `db/seed-*.sql` files install platform, CMS, AgentSam, mail, product, and test data.
- `wrangler.toml` defines Worker entry, assets, D1, R2, KV, Durable Object, AI, and Vectorize bindings.
- `scripts/with-cf-admin-env.sh` is the credential boundary for Cloudflare admin commands.
- `SECRETS.md` documents secret installation without committing values.

## Build and deploy scaffold

```bash
# install and sync
npm install
npm run app:frontend:sync

# local runtime
npm run dev

# admin SPA build + runtime asset sync
npm run build

# production release
npm run deploy

# lightweight Worker-only release when the admin bundle is already built
npm run deploy:plain

# smoke checks
npm run cf:status
curl -sS https://fuelnfreetime.com/api/health
```

## Data and CMS scaffold

```bash
npm run db:migrate
npm run db:migrate:completeful
npm run db:seed:cms:full
npm run cms:bootstrap
npm run cms:republish
npm run cms:post-deploy
npm run cms:warm
```

## Admin route scaffold

| Route | Ownership |
| --- | --- |
| `/admin/home` | admin dashboard and creative studio launchpad |
| `/admin/products` | product list/catalog mirror |
| `/admin/products/create` | catalog selection and product creation flow |
| `/admin/product-edit` | product editor, variants, pricing, media |
| `/admin/inventory` | variant inventory |
| `/admin/orders` | order list |
| `/admin/content` | media library |
| `/admin/pages` | CMS page list |
| `/admin/page-edit` | section editor and publish |
| `/admin/growth` | campaigns, attribution, publish packs |
| `/admin/discounts` | discount CRUD and redemption ledger |
| `/admin/email` | Resend-backed inbox and mailboxes |
| `/admin/analytics/*` | React analytics/finance SPA |
| `/admin/agentsam` | full-page AgentSam |

## Generated asset flow

`npm run app:frontend:sync` copies these canonical files into runtime output:

```text
apps/ecommerce-cms-agentsam/frontend/shell.js     -> public/admin/js/shell.js
apps/ecommerce-cms-agentsam/frontend/inspector.js -> public/admin/js/inspector.js
app/frontend/admin/agentsam/agentsam.html         -> public/admin/agentsam.html
app/frontend/admin/agentsam/agentsam-page.css     -> public/admin/css/agentsam-page.css
app/frontend/admin/agentsam/agentsam-page.js      -> public/admin/js/agentsam-page.js
```

Do not hand-edit the generated copies when the source file exists in the mapping above.

## Complete tracked filetree

The following tree is generated from `git ls-files` and includes the full tracked repository, including the checked-in skill/reference material under `.cursor/`.

```text
fuelnfreetime/
├── .cursor
│   └── skills
│       ├── agents-sdk
│       │   ├── references
│       │   │   ├── callable.md
│       │   │   ├── codemode.md
│       │   │   ├── email.md
│       │   │   ├── mcp.md
│       │   │   ├── state-scheduling.md
│       │   │   ├── streaming-chat.md
│       │   │   └── workflows.md
│       │   └── SKILL.md
│       ├── building-ai-agent-on-cloudflare
│       │   ├── references
│       │   │   ├── agent-patterns.md
│       │   │   ├── examples.md
│       │   │   ├── state-patterns.md
│       │   │   └── troubleshooting.md
│       │   └── SKILL.md
│       ├── building-mcp-server-on-cloudflare
│       │   ├── references
│       │   │   ├── examples.md
│       │   │   ├── oauth-setup.md
│       │   │   └── troubleshooting.md
│       │   └── SKILL.md
│       ├── cloudflare
│       │   ├── references
│       │   │   ├── agents-sdk
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── ai-gateway
│       │   │   │   ├── configuration.md
│       │   │   │   ├── dynamic-routing.md
│       │   │   │   ├── features.md
│       │   │   │   ├── README.md
│       │   │   │   ├── sdk-integration.md
│       │   │   │   └── troubleshooting.md
│       │   │   ├── ai-search
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── analytics-engine
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── api
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── api-shield
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── argo-smart-routing
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── bindings
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── bot-management
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── browser-rendering
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── c3
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── cache-reserve
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── containers
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── cron-triggers
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── d1
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── ddos
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── do-storage
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   ├── README.md
│       │   │   │   └── testing.md
│       │   │   ├── durable-objects
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── email-routing
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── email-workers
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── hyperdrive
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── images
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── kv
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── miniflare
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── network-interconnect
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── observability
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── pages
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── pages-functions
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── pipelines
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── pulumi
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── queues
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── r2
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── r2-data-catalog
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── r2-sql
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   ├── README.md
│       │   │   │   └── SKILL.md.backup
│       │   │   ├── realtime-sfu
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── realtimekit
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── sandbox
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── secrets-store
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── smart-placement
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── snippets
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── spectrum
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── static-assets
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── stream
│       │   │   │   ├── api-live.md
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── tail-workers
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── terraform
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── tunnel
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── networking.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── turn
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── turnstile
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── vectorize
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── waf
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── web-analytics
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── integration.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── workerd
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── workers
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── frameworks.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── workers-ai
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── workers-for-platforms
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── workers-playground
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── workers-vpc
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── workflows
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   ├── wrangler
│       │   │   │   ├── api.md
│       │   │   │   ├── configuration.md
│       │   │   │   ├── gotchas.md
│       │   │   │   ├── patterns.md
│       │   │   │   └── README.md
│       │   │   └── zaraz
│       │   │       ├── api.md
│       │   │       ├── configuration.md
│       │   │       ├── gotchas.md
│       │   │       ├── IMPLEMENTATION_SUMMARY.md
│       │   │       ├── patterns.md
│       │   │       └── README.md
│       │   └── SKILL.md
│       ├── durable-objects
│       │   ├── references
│       │   │   ├── rules.md
│       │   │   ├── testing.md
│       │   │   └── workers.md
│       │   └── SKILL.md
│       ├── fnf-cloudflare-runtime
│       │   └── SKILL.md
│       ├── stripe-best-practices
│       │   ├── references
│       │   │   ├── billing.md
│       │   │   ├── connect.md
│       │   │   ├── payments.md
│       │   │   ├── security.md
│       │   │   ├── tax.md
│       │   │   └── treasury.md
│       │   └── SKILL.md
│       ├── stripe-directory
│       │   └── SKILL.md
│       ├── stripe-projects
│       │   └── SKILL.md
│       ├── upgrade-stripe
│       │   └── SKILL.md
│       ├── web-perf
│       │   └── SKILL.md
│       ├── workers-best-practices
│       │   ├── references
│       │   │   ├── review.md
│       │   │   └── rules.md
│       │   └── SKILL.md
│       ├── wrangler
│       │   └── SKILL.md
│       └── README.md
├── admin-ui
│   ├── public
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src
│   │   ├── assets
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components
│   │   │   └── analytics-ui.tsx
│   │   ├── layout
│   │   │   └── AdminLayout.tsx
│   │   ├── lib
│   │   │   ├── api.ts
│   │   │   ├── format.ts
│   │   │   └── types.ts
│   │   ├── pages
│   │   │   ├── account
│   │   │   │   └── AccountPage.tsx
│   │   │   ├── analytics
│   │   │   │   ├── AnalyticsShell.tsx
│   │   │   │   ├── FinancePage.tsx
│   │   │   │   ├── HealthPage.tsx
│   │   │   │   └── OverviewPage.tsx
│   │   │   └── products
│   │   │       ├── ProductImage.tsx
│   │   │       ├── ProductStudioPage.tsx
│   │   │       ├── studio-model.ts
│   │   │       ├── StudioIcon.tsx
│   │   │       └── StudioWorkspace.tsx
│   │   ├── styles
│   │   │   ├── analytics-shell.css
│   │   │   ├── analytics.css
│   │   │   └── product-studio.css
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── SOURCE_MAP.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── app
│   ├── backend
│   │   ├── admin
│   │   │   └── agentsam.js
│   │   ├── agentsam
│   │   │   ├── ai-registry.js
│   │   │   ├── ai-run.js
│   │   │   ├── analytics.js
│   │   │   ├── attachments.js
│   │   │   ├── compaction.js
│   │   │   ├── completeful-tools.js
│   │   │   ├── constants.js
│   │   │   ├── context-cache.js
│   │   │   ├── conversations.js
│   │   │   ├── feature-gates.js
│   │   │   ├── files.js
│   │   │   ├── fnf-vectorize.js
│   │   │   ├── github-client.js
│   │   │   ├── mcp-client.js
│   │   │   ├── mcp-servers.js
│   │   │   ├── prompt-cache.js
│   │   │   ├── prompt-registry.js
│   │   │   ├── quick-actions.js
│   │   │   ├── router.js
│   │   │   ├── skill-r2.js
│   │   │   ├── skills.js
│   │   │   ├── threads.js
│   │   │   ├── tool-handlers.js
│   │   │   ├── tool-traces.js
│   │   │   ├── tools-registry.js
│   │   │   ├── vectorize-adapter.js
│   │   │   └── webhook-events.js
│   │   └── lib
│   │       └── auth.js
│   └── frontend
│       └── admin
│           ├── agentsam
│           │   ├── assets
│           │   │   └── completeful-icon.webp
│           │   ├── agentsam-page.css
│           │   ├── agentsam-page.js
│           │   └── agentsam.html
│           └── home
│               └── home-donor.html
├── apps
│   └── ecommerce-cms-agentsam
│       ├── bin
│       │   └── ecommerce.mjs
│       ├── frontend
│       │   ├── inspector.js
│       │   └── shell.js
│       ├── agentsam.app.json
│       ├── package.json
│       └── README.md
├── db
│   ├── migrate-admin-github-oauth.sql
│   ├── migrate-agentsam-ai.sql
│   ├── migrate-agentsam-analytics.sql
│   ├── migrate-agentsam-attachments.sql
│   ├── migrate-agentsam-compaction.sql
│   ├── migrate-agentsam-conversations.sql
│   ├── migrate-agentsam-platform.sql
│   ├── migrate-agentsam-project-context.sql
│   ├── migrate-agentsam-prompts.sql
│   ├── migrate-agentsam-skill-revisions.sql
│   ├── migrate-agentsam-skills.sql
│   ├── migrate-agentsam-tools.sql
│   ├── migrate-agentsam-workflows-v2.sql
│   ├── migrate-agentsam-workflows.sql
│   ├── migrate-attribution.sql
│   ├── migrate-auth-users-finalize.sql
│   ├── migrate-auth-users-slim.sql
│   ├── migrate-auth-users.sql
│   ├── migrate-cms-r2.sql
│   ├── migrate-completeful.sql
│   ├── migrate-discounts.sql
│   ├── migrate-growth-campaigns.sql
│   ├── migrate-mail-inbox.sql
│   ├── migrate-mail-mailboxes-v2.sql
│   ├── migrate-mail-mailboxes.sql
│   ├── migrate-media-library.sql
│   ├── migrate-media-placement.sql
│   ├── migrate-stripe.sql
│   ├── patch-agentsam-disable-research-tools.sql
│   ├── patch-agentsam-prompts-feature-gates.sql
│   ├── patch-agentsam-skills-sync-invalidate.sql
│   ├── patch-agentsam-tools-fnf-scope.sql
│   ├── schema.sql
│   ├── seed-agentsam-ai.sql
│   ├── seed-agentsam-fnf-hooks-webhooks-v2.sql
│   ├── seed-agentsam-models.sql
│   ├── seed-agentsam-platform.sql
│   ├── seed-agentsam-prompts.sql
│   ├── seed-agentsam-skills.sql
│   ├── seed-agentsam-tools-vectorize.sql
│   ├── seed-agentsam-tools.sql
│   ├── seed-agentsam-workflow-nodes-studio.sql
│   ├── seed-agentsam-workflows-studio.sql
│   ├── seed-agentsam-workflows.sql
│   ├── seed-auth-display-names.sql
│   ├── seed-cms-full.sql
│   ├── seed-cms.sql
│   ├── seed-ctx-fuelnfreetime-iam.sql
│   ├── seed-ctx-fuelnfreetime-worker.sql
│   ├── seed-dev-session-2026-06-21.sql
│   ├── seed-mail-mailboxes.sql
│   ├── seed-platform.sql
│   └── seed-tee.sql
├── design
│   └── admin-console
│       ├── uploads
│       │   ├── Screenshot 2026-06-20 at 9.04.42 am.png
│       │   └── Screenshot 2026-06-20 at 9.04.56 am.png
│       ├── Admin Console.dc.html
│       ├── README.md
│       └── support.js
├── docs
│   ├── brand
│   │   ├── business-brand-dossier.md
│   │   └── Fuel_and_Free_Time_Business_Brand_Dossier.docx
│   ├── providers
│   │   └── completeful
│   │       ├── openapi.json
│   │       ├── openapi.snapshot.md
│   │       ├── README.md
│   │       └── reference.snapshot.md
│   ├── admin-platform-template-plan.md
│   ├── AGENTSAM-COMPACTION.md
│   ├── AGENTSAM-FEATURE-GATES.md
│   ├── AGENTSAM-GITHUB.md
│   ├── AGENTSAM-PROMPT-SYSTEM.md
│   ├── AGENTSAM-SKILLS.md
│   ├── apps-ecommerce-cms-agentsam-rescaffold-plan.md
│   ├── cms-deploy-hooks.md
│   ├── FNF-CMS-SPRINT-2026-06-20.md
│   ├── FNF-RUNTIME-OPS-2026-06-21.md
│   ├── RUNTIME-CONTRACTS-AGENTSAM.md
│   ├── RUNTIME-CONTRACTS-COMMERCE.md
│   ├── RUNTIME-CONTRACTS-COMPLETEFUL.md
│   └── RUNTIME-CONTRACTS-STRIPE.md
├── FuelnFreeTime
│   ├── app
│   │   └── frontend
│   │       ├── auth
│   │       │   ├── login.html
│   │       │   ├── reset.html
│   │       │   └── signup.html
│   │       ├── dashboard
│   │       │   └── index.html
│   │       └── shared
│   │           └── company-branding.js
│   ├── backend
│   │   └── src
│   │       └── index.js
│   ├── migrations
│   │   └── 0001_identity_core.sql
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── README.md
│   └── wrangler.toml
├── legacy
│   ├── about.html
│   ├── community.html
│   ├── index.html
│   ├── README.md
│   └── shop.html
├── public
│   ├── admin
│   │   ├── _spa
│   │   │   ├── assets
│   │   │   │   ├── index-CtZ7s03d.css
│   │   │   │   ├── index-Dij-oxd5.js
│   │   │   │   └── index-Dij-oxd5.js.map
│   │   │   ├── favicon.svg
│   │   │   ├── icons.svg
│   │   │   └── index.html
│   │   ├── analytics
│   │   │   ├── assets
│   │   │   │   ├── 0776a419-ddeb-45e7-be18-d5f8cd76da9e.js
│   │   │   │   ├── 111a6d5a-856b-4c9b-bfea-2d42462e1948.js
│   │   │   │   ├── 244140b3-93ba-47fa-9cc6-257337755d4e.woff2
│   │   │   │   ├── 25fb0ba9-fcb0-4f95-908c-022294da338c.woff2
│   │   │   │   ├── 27bec9b0-34ca-4c3b-a9bb-8a5e7e9040db.woff2
│   │   │   │   ├── 2e781dd1-1171-40b6-89aa-534f57a771fc.woff2
│   │   │   │   ├── 3d7adce5-05a3-4b4e-b5fc-ffa9c285f87c.woff2
│   │   │   │   ├── 40428855-2474-46c4-8c72-29dc788e98e5.woff2
│   │   │   │   ├── 8304895d-d55a-46ad-a3a8-af53194d4423.woff2
│   │   │   │   ├── 86f69386-4f84-40a8-b358-29ff5c28b76c.woff2
│   │   │   │   ├── 94426871-cf24-4578-8b4f-3e12b3ad6363.woff2
│   │   │   │   ├── 98b26e01-8bb8-4a43-b3db-55326925c916.js
│   │   │   │   ├── ab9573c2-3cbc-4053-bf19-beb07f32cfaa.js
│   │   │   │   ├── ac0bb828-1140-4564-87b0-6da752887759.woff2
│   │   │   │   ├── b3ebf5b6-3b36-4355-9055-bf46b687ff8a.js
│   │   │   │   ├── bd69ac09-5087-41a1-9f85-73b30655b43f.woff2
│   │   │   │   ├── cc20c761-d717-4df3-aafd-03c0be627412.js
│   │   │   │   ├── cfca5d09-e5b1-4ccd-abe2-a2a0c1bea115.woff2
│   │   │   │   ├── d4b5f3b1-05df-4f31-b16a-95fc47c9dc8b.woff2
│   │   │   │   ├── d4bbf6c3-a1e4-4426-90c2-e4cc9bdc562a.js
│   │   │   │   └── e6f8636f-e68b-40d3-aff3-a0e72e3b2a4d.js
│   │   │   ├── analytics-shell.css
│   │   │   ├── analytics.css
│   │   │   ├── embed.html
│   │   │   ├── finance.html
│   │   │   ├── health.html
│   │   │   └── overview.html
│   │   ├── css
│   │   │   ├── account-mail.css
│   │   │   ├── admin.css
│   │   │   ├── agentsam.css
│   │   │   ├── console.css
│   │   │   ├── discounts.css
│   │   │   ├── growth.css
│   │   │   ├── mail.css
│   │   │   ├── media-library.css
│   │   │   ├── media-picker.css
│   │   │   ├── pages.css
│   │   │   ├── preferences.css
│   │   │   └── product-edit.css
│   │   ├── dashboard
│   │   │   ├── analytics.html
│   │   │   ├── email.html
│   │   │   ├── finance.html
│   │   │   └── overview.html
│   │   ├── js
│   │   │   ├── account-settings.js
│   │   │   ├── agentsam.js
│   │   │   ├── analytics-boot.js
│   │   │   ├── cms-live.js
│   │   │   ├── discounts.js
│   │   │   ├── growth.js
│   │   │   ├── inspector.js
│   │   │   ├── mail.js
│   │   │   ├── media-library.js
│   │   │   ├── media-picker.js
│   │   │   ├── pages-shared.js
│   │   │   └── shell.js
│   │   ├── partials
│   │   │   ├── discounts-app.html
│   │   │   ├── growth-app.html
│   │   │   └── mail-app.html
│   │   ├── account.html
│   │   ├── content.html
│   │   ├── dashboard.html
│   │   ├── discounts.html
│   │   ├── growth.html
│   │   ├── home.html
│   │   ├── inventory.html
│   │   ├── login.html
│   │   ├── media.html
│   │   ├── orders.html
│   │   ├── page-edit.html
│   │   ├── pages.html
│   │   ├── preferences.html
│   │   ├── product-edit.html
│   │   ├── products.html
│   │   ├── scaffold.html
│   │   ├── store.html
│   │   ├── subscribers.html
│   │   └── theme-editor.html
│   ├── css
│   │   ├── shop-hero.css
│   │   ├── store-cart.css
│   │   ├── store-pdp.css
│   │   └── store-shell.css
│   ├── js
│   │   ├── cms-hydrate.js
│   │   ├── fnf-attribution.js
│   │   ├── fnf-head.js
│   │   ├── fnf-newsletter.js
│   │   ├── order-confirmation.js
│   │   ├── shop-hero.js
│   │   ├── store-cart.js
│   │   ├── store-catalog.js
│   │   ├── store-product.js
│   │   └── store-shell.js
│   ├── about.html
│   ├── cart.html
│   ├── community.html
│   ├── index.html
│   ├── order-confirmation.html
│   ├── product.html
│   └── shop.html
├── scripts
│   ├── agentsam-compact.mjs
│   ├── agentsam-rollup.mjs
│   ├── apply-agentsam-workflow-nodes-table.sh
│   ├── apply-agentsam-workflows-v2.sh
│   ├── backfill-inbound-mail.mjs
│   ├── cf-builds-deploy.sh
│   ├── cf-builds-sync.sh
│   ├── cf-status.mjs
│   ├── check-dns.mjs
│   ├── cms-deploy-hook.mjs
│   ├── cms-post-deploy.mjs
│   ├── create-admin.mjs
│   ├── create-completeful-product.mjs
│   ├── embed-fnf-content.mjs
│   ├── embed-mail-template.mjs
│   ├── generate-cms-seed.mjs
│   ├── hydrate-inbound-bodies.mjs
│   ├── install-cloudflare-skills.mjs
│   ├── port-analytics-pages.mjs
│   ├── provision-mailboxes.mjs
│   ├── r2-cors.json
│   ├── register-completeful-webhooks.mjs
│   ├── republish-cms-kv.mjs
│   ├── send-mail-e2e.mjs
│   ├── set-resend-secrets.sh
│   ├── setup-resend-dns.mjs
│   ├── sync-agentsam-skills.mjs
│   ├── sync-app-frontend.mjs
│   ├── unpack-analytics.mjs
│   ├── warm-cms-cache.mjs
│   └── with-cf-admin-env.sh
├── skills
│   ├── completeful
│   │   └── SKILL.md
│   └── on_brand_genmedia
│       └── SKILL.md
├── src
│   ├── admin
│   │   ├── agentsam-github.js
│   │   ├── agentsam.js
│   │   ├── analytics-finance.js
│   │   ├── api.js
│   │   ├── completeful.js
│   │   ├── discounts.js
│   │   ├── growth.js
│   │   ├── mail.js
│   │   ├── media.js
│   │   ├── store.js
│   │   └── team.js
│   ├── agentsam
│   │   ├── ai-registry.js
│   │   ├── ai-run.js
│   │   ├── analytics.js
│   │   ├── attachments.js
│   │   ├── compaction.js
│   │   ├── constants.js
│   │   ├── context-cache.js
│   │   ├── conversations.js
│   │   ├── feature-gates.js
│   │   ├── files.js
│   │   ├── fnf-vectorize.js
│   │   ├── github-client.js
│   │   ├── mcp-client.js
│   │   ├── mcp-servers.js
│   │   ├── prompt-cache.js
│   │   ├── prompt-registry.js
│   │   ├── quick-actions.js
│   │   ├── router.js
│   │   ├── skill-r2.js
│   │   ├── skills.js
│   │   ├── threads.js
│   │   ├── tool-handlers.js
│   │   ├── tool-traces.js
│   │   ├── tools-registry.js
│   │   └── webhook-events.js
│   ├── attribution
│   │   └── api.js
│   ├── cms
│   │   ├── api.js
│   │   ├── deploy.js
│   │   ├── edge-hydrate.js
│   │   ├── html-rewriter.js
│   │   ├── media-paths.js
│   │   ├── r2-store.js
│   │   ├── registry.js
│   │   └── stubs.js
│   ├── completeful
│   │   ├── catalog.js
│   │   ├── client.js
│   │   └── images.js
│   ├── do
│   │   └── CmsEditorRoom.js
│   ├── lib
│   │   ├── admin-routes.js
│   │   ├── attribution.js
│   │   ├── auth.js
│   │   ├── discounts.js
│   │   ├── mail-mailboxes.js
│   │   ├── resend.js
│   │   ├── routes.js
│   │   └── site-nav.js
│   ├── store
│   │   ├── api.js
│   │   ├── inventory.js
│   │   ├── order-email.js
│   │   ├── stripe-webhook.js
│   │   └── stripe.js
│   ├── webhooks
│   │   ├── completeful.js
│   │   └── resend.js
│   └── index.js
├── test
│   └── catalog-resilience.test.mjs
├── .env.cloudflare.example
├── .gitignore
├── AGENTS.md
├── AGENTSAM.md
├── analytics-3pt-dashboard-buildin.html
├── ecommerce-cms-agentsam.md
├── package-lock.json
├── package.json
├── README.md
├── SECRETS.md
└── wrangler.toml

```

## Current local-only boundaries

- `.fnf-backups/` is intentionally ignored as local rollback snapshots.
- `.env*`, `.dev.vars`, Cloudflare environment files, and provider credentials stay outside version control.
- `node_modules/`, `.wrangler/`, and build caches are workspace output, not source ownership.

## Contract references

Start with these before changing behavior:

- `AGENTS.md`
- `README.md`
- `docs/RUNTIME-CONTRACTS-COMMERCE.md`
- `docs/RUNTIME-CONTRACTS-AGENTSAM.md`
- `docs/RUNTIME-CONTRACTS-COMPLETEFUL.md`
- `docs/RUNTIME-CONTRACTS-STRIPE.md`
- `docs/FNF-CMS-SPRINT-2026-06-20.md`
- `docs/AGENTSAM-SKILLS.md`
- `SECRETS.md`
