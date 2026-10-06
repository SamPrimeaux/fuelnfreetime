# Fuel & Free Time production polish plan

Date: 2026-10-05
Repository: SamPrimeaux/fuelnfreetime
Mode: launch polish first; reusable extraction second.

## Product rule

Preserve the current Fuel & Free Time storefront and admin visual direction.

Do not wholesale redesign the dashboard, storefront, Content library, Product Studio, AgentSam workspace, navigation, or theme editor merely to make them uniform. The existing surfaces are the starting product. Work should repair false/broken behavior, connect real data, improve responsive behavior, and polish interaction details.

Use the rule:

preserve -> repair -> connect -> polish -> prove -> package

## Current branch ownership

### feat/store-theme-library-v1

Owns the Shopify-like theme-library work already in progress, including Online Store active/draft theme behavior, store.html, backend/admin/store.js, theme workspace/editor routing, and theme persistence/migrations.

Do not make competing edits to those files from another branch.

### feat/theme-studio-universal-v1

Owns current theme-studio/schema exploration. Keep it separate from production bug fixes until its contracts are proven.

### feat/product-studio-merch-pipeline-2026-10-03

Owns current Product Studio / merch-pipeline work, including product-media preparation and related frontend flows.

### fix/fnf-production-polish-20261005

Narrow production correctness lane. First tranche:

- repair Brand workspace transport integration without changing the Brand UI;
- make /catalog-image request physical width derivatives instead of caching one original under multiple width keys;
- add focused regressions;
- no broad UI redesign.

## P0/P1 execution order

### 1. Make visible admin surfaces truthful

- Brand must load real company + media_assets authority.
- Online Store metrics must render explicit unavailable states rather than object-string output.
- Theme publish/draft behavior must correspond to persisted theme state.
- Remove stale demo/customer labels only when touching their owning surface.
- Any readiness/analytics score shown as intelligence must have real inputs and provenance.

### 2. Finish the current Shopify-like theme workflow

Keep the existing Online Store visual design.

Required behavior:

- one active theme;
- multiple drafts;
- publish draft -> draft becomes active;
- previous active theme -> draft;
- safe preview/edit before publish;
- page editing remains distinct from global theme selection;
- no hardcoded assumption that Shop is the universal theme-edit target.

### 3. Responsive polish without replacing the shell

Test each major workspace with:

- sidenav open / closed;
- AgentSam open / closed;
- inspector open / closed where applicable;
- normal desktop;
- large desktop;
- tablet;
- phone;
- empty / loading / error / large-data states.

Primary content must respond to the width it actually receives. Secondary panes collapse into drawers/overlays before they crush the primary task.

### 4. AgentSam polish

Preserve the dedicated /admin/agentsam experience.

For contextual/mini AgentSam:

- active accent/focus ring;
- upward send arrow;
- compact textarea with capped auto-grow;
- expand-to-review long prompts;
- selected-resource state;
- page/product/media/campaign context;
- overlay/bottom-sheet behavior when width is constrained.

AgentSam must operate on the same underlying admin contracts, not a hidden parallel state system.

### 5. Content and Artwork

Keep Content as the canonical media authority.

Artwork is a workflow over Content, not a new database:

submission -> inspect -> human review -> approved master -> prepared derivative -> product/storefront/campaign usage.

Preserve original identity and provenance.

### 6. Product Studio

Preserve the current Product Studio layout and visual character.

Make lineage visible:

approved artwork -> prepared print asset -> placement -> provider request -> mockup -> storefront media -> campaign usage.

### 7. Brand graduation

Do not discard the current Identity & Assets screen.

Grow Brand around it:

- Overview
- Foundation
- Audience & Positioning
- Voice & Messaging
- Identity & Assets
- Decisions / Guidelines

company remains runtime identity authority; Content/media remains asset authority.

### 8. Campaign vs Growth

Campaigns = planned/running work.
Growth = measurement and learning.

Campaigns consume approved Brand, products/inventory, Content assets, audience/objective, and historical signals. Reusable campaign code must not hardcode FNF tone/taglines.

## Media/image performance rule

Large originals remain masters.

Grid/catalog views should consume real derivatives.

For Completeful catalog images:

- sanitize provider origin;
- transform 320/640/1200 requests physically;
- negotiate AVIF/WebP where supported;
- cache width/format variants separately;
- expose original fallback distinctly so production checks can prove whether optimization is active.

Do not mirror the whole provider catalog into R2 without a demonstrated need.

## Promotion gate

Only extract a component into a reusable package when:

1. FNF uses it with real data.
2. It survives the responsive/state matrix.
3. customer/deployment assumptions are configurable.
4. styling is replaceable.
5. a fresh unrelated consumer can use it.
6. documentation describes contracts, not FNF internals.

## Immediate acceptance for the current polish branch

- Brand no longer fails because brand-workspace.js reparses the already-parsed adminFetch result.
- Catalog image requests pass physical transform options to Cloudflare.
- Cache variants distinguish width and negotiated format.
- Sanitized provider fallback remains intact.
- focused tests pass.
- frontend/backend source syntax checks pass.
- assembled asset boundary checks pass.
- no wholesale UI/IA change is included.
