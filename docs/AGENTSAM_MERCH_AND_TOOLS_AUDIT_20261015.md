# AgentSam merch, Completeful and tool-registry audit

Date: 2026-10-15 · Status: findings only (no executor work done) · Trackers: `tkt_13207989954e4171` (merch/tools), `tkt_a6482217d8ca4be4` (per-color mockups), `tkt_f7caf8bc4f124de8` (editor UX), `tkt_bbfcd5a741544bea` (3D viewer)

## Marker convention

Unfinished capability is marked in code with the literal string `#UNFINISHEDTOOLS` (grep for it). Anything the UI shows that is not backed by a real executor is marked `#UNFINISHEDTOOLS` at the call site. `#NOTDONE` is used for non-tool gaps (layout, tests, docs).

## Scope and method

Read from `main` and the working branch. Nothing was executed, built or tested. Files read: `packages/agentsam-merch/**`, `packages/media-kit/src/{preview,providers}.js`, `apps/ecommerce-cms-agentsam/bin/{assets,build-assets}.mjs`, `apps/*/agentsam.app.json`, `backend/completeful/{client,catalog,images}.js` (images.js and the tool adapter read in full), `backend/agentsam/{tools-registry,tool-handlers,core-tools,completeful-tools,ai-run}.js`, `backend/tools/{doctor.mjs,packs/*.ts}`, `backend/admin/{product-studio,media-background}.js`, the Completeful OpenAPI excerpt and the `completeful` / `on_brand_genmedia` skill text; plus `agentsam_tools` on the FNF and IAM D1 databases.

## Findings

### F1 — `agentsam-merch` is a sound preflight/planning core with no executor (HIGH)
- Real: profile schema/validation/registry, `evaluateManufacturingCompatibility` (format, raster/vector, color space, monochrome, gradients, closed paths, text outlines, alpha, effective PPI, max bytes; unverified profiles can never be `productionReady`), derivative role separation, `buildMerchPlan`, collection-lab state machine, Completeful adapter, CLI, tests.
- Missing: nothing consumes the `actions` the preflight emits (`rasterize:*`, `convert:*`, `convert_color_space:*`, `convert_monochrome`, `simplify_gradients`, `close_paths`, `outline_text`, `lossless_optimize`, `build_transparent_variant`, `replace_with_higher_resolution_master`). `planMediaDerivatives` returns descriptors, never pixels. No function inserts a refined, aligned image where it is needed.
- Real execution exists only outside the package: browser canvas in `StudioWorkspace.tsx` (`buildPreparedArtworkBlob`, `persistPlacementPreview`), Worker `removeMediaBackground` (CF Images segmentation), and `backend/assets/*` (storefront optimization).
- `product-spine.js` is correctly pure but is product-source/inventory grouping. It is not part of image prep and is misfiled in this package.

### F2 — Profiles are thin and partly inaccurate (HIGH)
- Three hand-written JSON profiles (DTG back-large, laser engraving, generic embroidery). All `verified:false` (the compatibility code reports this correctly).
- DTG profile says `preferredPrintWidthIn: 13`; Completeful's real tee area is 14x16 in on both front and back. No chest, left-chest or sleeve profiles. No embroidered-patch profile for the hat.
- Verified data facts: in `completeful_catalog_print_locations`, `file_width`/`file_height` are inches (14, 16; `unit='IN'`); `x/y/width/height` are artboard pixels (488/338/525/600 on 1500x1500); `dpi` is null/0. The studio assumes 300 dpi (4200x4800 px). The adapter passing `file_width` as `printWidthIn` is correct.
- Fix: generate profiles from provider print-location data (unit/dpi normalized, verification level `provider-declared`) plus curated overrides.

### F3 — Multi-location designs are unsupported end to end (HIGH)
- Drafts hold `print_location_ids:[one]`; `createDesign` sends one `artfile_url`. The Completeful API supports `print_files[]` (one artwork URL per `print_location_id`) on order lines and designs. The F&FT Graphic Tee (chest + back) cannot be produced through one draft.

### F4 — Tool registry: most asset tools are decorative (HIGH)
- `tool-handlers.js:isAgentSamToolExecutable` allows only: vectorize search, `CORE_EXECUTABLE_TOOL_KEYS` (orders/products/pages/media list, R2 list, models, ping, D1 query/write/delete), `admin_api` growth|mail, and Completeful operations `status, shops.*, catalog.list/get/read/search/semantic/sync, webhooks.list`.
- Registry rows without an executor are never offered to the model. In the FNF D1 this includes `fnf_image_optimize`, `fnf_image_variant_plan`, `fnf_brand_asset_audit`, `fnf_content_asset_link`, `fnf_media_library_sync`, `fnf_media_upload`, `fnf_asset_publish`, `fnf_video_thumbnail`.
- There is no tool for: artwork preflight, artwork prepare, merch plan, mockup render, design create/export, order quote, image generate/edit/upscale/background-remove.
- Two registration paths exist: typed packs (`backend/tools/packs/*.ts` via `defineTool`, verified by `doctor.mjs` against `CORE_EXECUTABLE_TOOL_KEYS`) and D1 rows with `handler_key: completeful` + `handler_config.operation`. `packs/media.ts` has two entries (`media.library.list`, `search.semantic`) and is the right place to add media tools; the doctor gate intentionally fails a pack entry that has no executor, so planned tools live in `packs/media.planned.ts` (not registered) until implemented.

### F5 — Image generation is not a tool and ignores options (HIGH)
- `ai-run.js:executeModel` hardcodes OpenAI `gpt-image-2`, `n:1`, `size:"1024x1024"`. Size/quality/background chosen in any UI are ignored. No edit (`/v1/images/edits`), no upscale, no variations.
- The IAM platform D1 (`inneranimalmedia-business`) already defines `imgx_generate_image` (active; providers openai|google|workers_ai; variations 1-4; size/quality/format), `imgx_edit_image` (defined, `is_active=0`), `imgx_list_providers` (inactive) and Meshy `meshy_image_to_3d`, `meshy_multi_image_to_3d`, `meshy_retexture` (active). No upscale tool found by name. Absence in the IAM repo / SDK packages is NOT proven (code search only scans about 80 files).

### F6 — `backend/completeful` is a catalog mirror plus an image proxy, not a full integration (MEDIUM)
- `catalog.js` (sync/mirror), `client.js` (request/auth/idempotency), `images.js` (see F7).
- Designs, mockup renders, order quote/create, exports, assets and webhook management are not modules. Design/mockup/render logic is inline in `backend/admin/product-studio.js`; `resolveMockup` picks one mockup from `selection.variants[0]`; the provider render path has never run in production (`completeful_render_status` NULL on both published products).
- OpenAPI surface not covered by our client: `POST /orders/quote`, order create, `POST /designs/{id}/exports`, webhook subscription CRUD, catalog assets, `print_files[]`, per-color `mockups/renders`.

### F7 — `backend/completeful/images.js` is a safe catalog image proxy, not sync (MEDIUM)
- Allowlisted origin, fixed pathname prefix, no query/credentials, widths 320/640/1200, Cloudflare Image Resizing with fallback, Cache API. Good SSRF posture.
- Default origin is a hardcoded provider storage host (`jvkydnvdajcfnqysmuwt.supabase.co`) overridable by `CATALOG_IMAGE_ORIGINS`. It is Completeful's public CDN, not a secret, but should be one named constant sourced from app config for clone-ability.
- It resizes; it does not select per-color imagery.

### F8 — The asset pipeline is real but solves a different problem (INFO)
- `bin/assets.mjs` + `backend/assets/*`: R2 optimize/promote/plan, Queue jobs, Sharp / jSquash, config read from the project's own `wrangler.toml`. Production-grade and portable.
- It optimizes for storefront delivery (WebP/AVIF, max width). It does not produce manufacturing derivatives. Its Worker/Node codecs are the right runtime layer for the future artwork-prep executor.

### F9 — Duplicate `mini-agentsam.js` (MEDIUM)
- `bin/build-assets.mjs` assembles `/admin/workbench` from the app-local `packages/agentsam-workbench/src` (the comment says release inputs must be app-local, not the monorepo). The production source is therefore the app-local copy; the root `packages/agentsam-workbench` copy is used by repo tests. They had diverged: root has `reposition()` and clamped placement; app-local has `iconUrl` and overlap-aware placement.
- A shim from the app copy to the root would break the standalone release build. Correct fix: publish `@inneranimalmedia/agentsam-workbench` and consume it through the same `installed()` path `build-assets.mjs` already uses for `revise-theme`. Until then both copies are kept feature-aligned and guarded by `tests/workbench-parity.test.mjs`.

### F10 — Contracts and skills have drifted (MEDIUM)
- `apps/product-studio/agentsam.app.json` listed only two frontend files and no studio modules, no artwork/mockup/image capabilities, and no event contract. Updated in this commit.
- The `completeful` skill text references `src/completeful/**`, `src/admin/completeful.js` and `src/webhooks/completeful.js`; the repo paths are `apps/ecommerce-cms-agentsam/backend/...`. `on_brand_genmedia` and `fnf_creative_studio` describe a workflow, not callable tools.
- `apps/completeful/agentsam.app.json` correctly lists `commerce.design.create`, `commerce.order.quote`, `commerce.order.create`, `commerce.product.sync`, `commerce.product.publish` as `registered_but_degraded`.

## Recommended build order

1. Pure core in `agentsam-merch`: `computePlacement` (percent placement + trim crop + rotate/flip to an exact pixel rect), `buildProfileFromPrintLocation` (provider-derived), real DTG / hat / patch profiles, golden tests.
2. Executor: `createArtworkPreparer({ runtime })` that runs preflight actions in order, then re-runs preflight to prove `ready`. Runtimes: browser canvas, Worker (`env.IMAGES` / jSquash), Node (Sharp). The studio then uses the same code so preview equals production derivative.
3. Multi-location designs (`print_files[]`) and the per-color mockup render loop (`tkt_a6482217d8ca4be4`).
4. Register real tools (start in `packs/media.ts` / `packs/commerce.ts`, then Completeful operations in `completeful-tools.js`): see `packs/media.planned.ts`.
5. Rebuild the studio Tools panel on those tools (the UI shell already exists and is marked `#UNFINISHEDTOOLS`).

## Open questions

1. Where does the upscale tool/provider live? 2. OK to activate `imgx_edit_image` in the IAM registry (production write affecting every agent)? 3. Confirm the 300 dpi assumption when provider dpi is null. 4. Should `product-spine.js` move to a commerce package?
