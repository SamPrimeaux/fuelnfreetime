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

## Start here tomorrow
1. Trace question 1 (grep readSectionContent / draftKey / content_r2_key usage).
2. Do Phase 1 (small, mechanical), test both editors, then Phase 2.
