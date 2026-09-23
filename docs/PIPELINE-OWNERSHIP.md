# Application and product pipeline

## Canonical ownership

- `apps/ecommerce-cms-agentsam/frontend`: React source, dashboard static pages, AgentSam, shell and store-specific annotation adapter.
- `apps/ecommerce-cms-agentsam/backend`: Worker entry, APIs, authentication, commerce, CMS and AgentSam runtime. No browser imports of backend modules.
- `packages/heuristic-theme`: extracted storefront presentation, preserving the current design.
- `packages/agentsam-workbench`: reusable miniAgentSam UI and composer contracts.
- `db`: installation migrations; registry migrations are shared by both catalog databases.
- `public`: supplementary public storefront assets only.
- `dist/assets`: disposable assembled deployment output. Never edit or commit it.

Build the dashboard with Vite, then assemble public/theme/admin assets. Deploy only this assembled output. Existing URL routes remain stable. Authentication is enforced by the Worker, not directory naming. Login assets are public; other dashboard routes remain session gated.

## UI refinement contract

Preserve click-controlled navigation and the current storefront design. miniAgentSam is a dark glass pill with purple selection/send/thinking accents. It can annotate ordinary admin UI as context, while only store-owned CMS resources may be promoted to editable resources after server-side authorization. The selected canvas resource, local composer, and response/generation surfaces have separate responsibilities. Generation animation reflects execution events, never prompt keyword guesses. The full drawer owns transport and sessions. DOM selection never grants edit authority.

## Live CMS editor and agentic generation

`CMS_EDITOR` binds the `CmsEditorRoom` Durable Object as the per-page live authoring room. It is the coordination plane, not the LLM execution engine: the room sequences section patches, broadcasts updates to connected editor/preview clients, and coordinates publish events. It is also the right place to evolve presence, optimistic version checks, conflict handling, revision notifications, and agent phase/draft events that must be seen consistently by every client editing the same page.

Agentic generation stays in the AgentSam/Worker execution path. The intended flow is: miniAgentSam or the full composer identifies context → AgentSam produces a structured CMS operation → the server resolves and authorizes the selected resource and validates the operation → the accepted patch is applied through the page's `CmsEditorRoom` → connected editor/preview clients receive the live update → publish remains an explicit authoring action. Heavy model/tool execution must not be held inside the Durable Object.

Today `CmsEditorRoom` already handles WebSocket `section:patch`, `publish`, and broadcast/ping traffic for the human editor. AgentSam-selected CMS resources are already server-resolved against D1, but the AgentSam tool registry does not yet expose a general CMS mutation handler. Wiring a structured CMS authoring tool through the same room is the remaining backend step for true live agentic edits; do not claim chat replies alone mutate the page.

## Registry contract

`agentsam_products` describes things created by us or by users through AgentSam: packages, applications, themes, components, solutions, generated products, collections and product lines. Completeful imported merchandise remains in commerce/provider tables. No catalog synchronization from those tables is permitted.

Resolve `repository_id` through `code_repositories` by provider and full repository name. Fail if missing or ambiguous. It identifies the repository currently containing canonical code. Generated store resources may have no repository and use an explicit `source_type`/`source_id` pair. `asset_relationships` expresses `defined_in`, `sourced_from`, `consumed_by`, `packaged_as`, `contains`, and `depends_on`; edges read source → relation → target. Preserve provenance when ownership changes.

Both databases share the product/relationship schema, not their tenant data. Only developer-authored reusable assets are intentionally registered in both. User-created Fuel & Free Time products remain in that database. Never copy IAM accounts, credentials or unrelated catalog rows into a store database.

## Reproducible catalog operations

`npm run db:migrate:catalog:all` applies `db/migrate-agentsam-catalog.sql` to the store and IAM configurations. The store holds only the necessary repository identity projection; IAM remains the account/repository registry authority. `scripts/register-catalog.mjs <registry-database-id> <target-database-id>` reads Git origin, resolves its registered repository, verifies every path in `catalog-products.json`, and upserts products and edges. Run it through the existing credential wrapper. Database IDs are explicit operator inputs; product/repository IDs are never manufactured by callers.

The migration preserves rows and is tested on repeat application. Keep the migration file intact; future schema changes should get a new migration. No provider merchandise source is read. Created store resources can use `backend/agentsam/product-catalog.js` after their owning application authorizes and persists the resource.

## Verified scope and remaining integration

miniAgentSam and the full-page composer share capability-menu and attachment-controller modules. The host supplies optional voice support; the current annotation adapter does not enable voice. The generation preview works with actual host phase events and is verified in an isolated host. The current commerce chat endpoint returns replies and does not execute arbitrary page-code edits or generation-phase events. Saving AgentSam-generated blocks as normal CMS objects remains a separate backend authoring integration, not something this extraction claims to deliver.

Heuristic retains Fuel & Free Time branding/media references. The package exports the existing storefront; brand-neutral configuration is a subsequent theme enhancement. The app remains one Worker deployment with separate source/build ownership; this change does not introduce independently deployed services.
