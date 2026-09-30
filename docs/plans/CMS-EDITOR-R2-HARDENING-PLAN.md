# Plan: Remove CMS editor Durable Object + harden R2/D1 content pipeline

Branch: `feat/cms-editor-do-removal-r2-hardening-20260929`
Created: 2026-09-29 from `main` @ e9e7932
Status: PLAN ONLY - no code changed yet

## Goal
Customers (non-technical) get a seamless in-app logged-in editor to create/update pages,
content, and products. It must scale and stay stable, and customization must be data
(registry/config rows), never per-customer code forks.

## Decisions already made
- Remove the `CmsEditorRoom` Durable Object. It is a thin WebSocket wrapper over
  `updateSection()` / `publishPage()`; full REST equivalents already exist. It stores no
  state. Only feature lost: live cross-tab sync (not needed for single-owner editing).
- Architecture stays R2-primary, D1-as-index. This is ALREADY how the code works:
  `WRITE_D1_CONTENT_JSON = false`, D1 holds `{}` placeholder + `content_r2_key`,
  `content_version`, `content_hash`; R2 holds draft/, published/, history/ per section
  plus page `meta.json`. Do NOT move content into D1.
- AgentSam edits must go through the same REST endpoints (same validation/versioning),
  land as drafts only, and never auto-publish.

- miniAgentSam composer is scoped to the editor surfaces ONLY (CMS page/section/block
  editing, content creation, product creation). It never touches the shell, backend, or
  source code, and customers never get repo/db/r2/shell/deploy tools. Enforced server-side,
  fail-closed. See "miniAgentSam composer scope" below.

## Verified gaps (from reading backend/cms/api.js + cms/r2-store.js)
1. Save race: `persistSectionDraft` reads `content_version`, writes R2, then updates D1
   unconditionally. Concurrent saves both compute vN+1, collide on the same
   `history/{section}.v{n}.json` key; last D1 write wins silently. Client sends no
   expected version.
2. Mutable pointer: `content_r2_key` points at `draft/{section}.json`, overwritten in
   place. D1 update failing after the R2 put leaves draft newer than recorded
   version/hash.
3. Non-atomic publish: each section is written to its own `published/{section}.json`,
   then D1 statuses flip, then KV snapshot rebuilds. Partial failure = half-published page.
4. Sequential reads: `loadSectionsFromR2` awaits one R2 GET per section in a loop.
5. No restore endpoint in the CMS route list (history is written but not usable).
6. `db/schema.sql` lacks `content_r2_key/content_version/content_hash` (come from
   `migrate-cms-r2.sql`); schema file is not a complete picture of prod.

## Phases

### Phase 1 - Remove the DO, switch editor to REST (low risk, do first)
Touch points:
- `wrangler.toml`: remove `[[durable_objects.bindings]] CMS_EDITOR`; KEEP the v1 migration
  entry and ADD:
  `[[migrations]]  tag = "v2-remove-cms-editor"  deleted_classes = ["CmsEditorRoom"]`
- `backend/index.js:44` remove `export { CmsEditorRoom }`; `:224` remove `cmsEditor` health flag
- `backend/admin/api.js:739-750` remove `/api/admin/cms/live/:slug` route
- delete `backend/do/CmsEditorRoom.js`
- `frontend/static/js/cms-live.js`: replace WebSocket client with REST
  (`PUT /api/admin/cms/pages/:slug/sections/:key`, `POST .../publish`), debounced autosave,
  visible saved/saving/error state
- callers: `static/js/theme-editor.js` (connectLive ~1066, 1268, 1403), `static/page-edit.html` (:14, :515)
Acceptance: no `CMS_EDITOR`/`CmsEditorRoom` references remain; both editors save+publish
via REST; deploy applies the deleted_classes migration cleanly; storefront unaffected.

### Phase 1b - Composer scope lock-down (MUST land before any customer install)
See "miniAgentSam composer scope" below. Split feature gates into `customer` vs `operator`
profiles, make tool access fail-closed, add per-surface tool allowlist, extend selected
resource scoping, add contract tests.

### Phase 2 - Safe saves (backend only)
- Client sends `expected_version`; server returns 409 on mismatch; UI shows
  "someone else edited this - reload".
- Write immutable versioned R2 object FIRST, then commit via D1 compare-and-swap:
  `UPDATE page_sections SET ... WHERE id=? AND content_version=?`. D1 update is the commit;
  failures leave only orphan objects (sweepable).
- Point `content_r2_key` at the immutable versioned key; retire in-place `draft/` overwrite.
- Backfill script for existing rows. Add R2 lifecycle rule to prune old history.

### Phase 3 - Atomic publish + fast reads (backend only)
- Publish writes ONE immutable page manifest (e.g. `published/{slug}/v{n}.json`) and flips
  a single pointer (D1 `pages` column + KV). KV written ONLY on publish, never on autosave.
- Reads: read the manifest (one GET); at minimum `Promise.all` section reads.
- Watch KV eventual consistency: use versioned keys / Cache API so publish is visible quickly.

### Phase 4 - Restore
- Endpoints: list revisions, restore revision (creates a new version, never rewrites history).
- Minimal UI: revision list + restore in the editor.

### Phase 5 - React registry-driven editor + generic resource contract
- Block library from `cms/registry.js`, drag reorder (existing `move` endpoint), iframe
  draft preview via postMessage, publish button.
- One resource contract (list/get/create/update/delete/publish/revisions) with
  schema-driven forms so pages, products, discounts share it. New content type = config row.

(Phase 5 addendum) miniAgentSam composer becomes a client of the same resource contract:
  propose patch -> diff preview -> user Apply -> revision written -> Undo via restore.

## miniAgentSam composer scope

### Boundary
The composer helps end users edit and build content in realtime, but ONLY inside:
- CMS editor (pages, sections, blocks)
- content creation areas
- product creation / product editor interfaces
It must never rewrite the outer shell, backend, config, or source code. Customers must
not be able to break their own site through it, and a hallucinating composer must not be
able to reach anything outside editable content.

### Two profiles (never mixed)
- `customer_composer` - what installed customers get. Content tools only.
- `operator` - Sam only (GitHub, D1 query, R2, MCP bridge, deploy hooks, terminal). Not
  present in customer builds; gated by role check AND a build/deploy flag.

### Current state (verified 2026-09-29, backend/agentsam/feature-gates.js)
- `FNF_AGENT_FEATURES` is one global flat object with `github_repo`, `mcp_bridge`,
  `d1_tools`, `r2_tools`, `store_tools`, `cms_tools` ALL true.
- `isToolKeyAllowed()` is fail-OPEN: returns true by default, denies only by name regex
  (web/research/pdf), and always allows anything matching /github|repo_list/.
- `fnf_d1_query` and GitHub repo tools are on the explicit allowlist. Admin GitHub OAuth
  routes exist (`backend/admin/agentsam-github.js`).
- Good primitives already exist: `agentsam_tools` has `risk_level`, `requires_approval`,
  `requires_confirmation`, `modes_json`, `max_calls_per_session`, `token_budget_per_call`,
  per-tool `input_schema`; `selected-resource.js` verifies a selected section belongs to
  the store (currently only `section` on `theme-studio`); tool traces exist.
- Not inspected: actual rows in prod `agentsam_tools` and which are reachable today.

### Enforcement (server-side; prompts are not a security boundary)
1. Fail-closed tool access: no allowlist row = not callable. Replace regex denylist.
   Add per-surface allowlist (`surface_scope` column or `agentsam_surface_tools`
   table: surface + tool_key). Surfaces: `cms-editor`, `product-editor`.
2. Surface and resource come from the authenticated route + server-side resolution,
   never from client-claimed strings. Extend `resolveSelectedResource` to page, section,
   block, product, each with store-ownership checks.
3. Composer toolset (customer): read page/section/product, propose section patch,
   insert/reorder block, propose product field update, list own media, (gated) image gen.
   No: github, d1, r2 raw, mcp_bridge, shell, deploy, config, code, arbitrary fetch.
4. Draft-only writes through the SAME service functions/REST as the UI
   (`updateSection` etc. with `expected_version`). Composer can never publish; publish is
   a human-only button. Price/inventory edits: read-only or confirm-required (open question).
5. Structured output only: patches validated against registry block/field schemas;
   content sanitized (no script tags, no arbitrary HTML/JS, image URLs limited to own
   media). Invalid output is rejected, not repaired silently.
6. Anti-hallucination: composer must read the resource first and its patch carries the
   version it read; stale patches fail with 409 instead of clobbering newer edits.
7. Propose -> diff preview -> user Apply -> revision written -> one-click Undo (needs
   Phase 4 restore).
8. Limits: default `max_calls_per_session`, token budget per call, per-store daily budget,
   per-store kill switch and read-only mode.
9. Audit: every proposal/apply traced (user, resource, version, revision id) via
   existing tool traces.
10. Remove/disable in customer builds: GitHub OAuth routes, `github_repo`, `mcp_bridge`,
    `d1_tools`, `r2_tools`, post-deploy/mail tools.

### Tests (contract tests, add to tests/)
- customer profile exposes ONLY allowlisted tools; unknown tool = denied
- forged surface / resource id from another store = rejected
- no composer tool can write published content or anything outside draft content/product fields
- no code/config/repo/db tool reachable under customer profile
- invalid/unsafe content patch rejected

## Rules for this work
- Any D1 schema change: ship a migration file AND apply it to prod D1 BEFORE merging to
  main (main push auto-deploys; the product_studio_drafts table was missed this way).
  Use `./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote ...`
- Back up before deleting/rewriting (git bundle + refs manifest pattern used 2026-09-29).
- Merge by fast-forward to main only after smoke test in the admin.

## Open questions (unverified)
1. Do any storefront paths read R2 `draft/` objects directly? (decides how invasive Phase 2 is)
2. Any customer relying on live multi-tab sync?
3. R2 history retention period?
4. KV vs Cache API for the published pointer.
5. What rows are in prod `agentsam_tools` and which are reachable by the composer today?
6. Should composer be allowed to change price/inventory, or read-only/confirm-required?

## Start here tomorrow
1. Trace question 1 (grep readSectionContent / draftKey / content_r2_key usage).
2. Do Phase 1 (small, mechanical), test both editors, then Phase 2.
