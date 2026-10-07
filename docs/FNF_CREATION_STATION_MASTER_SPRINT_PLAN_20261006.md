# FNF Creation Station — Master Sprint Plan & Engineering Handoff

**Project:** Fuel & Free Time (FNF) · portable AgentSam Ecommerce/CMS  
**Planning baseline:** 2026-10-06 · `SamPrimeaux/fuelnfreetime` · `main` at `38c2e16` (source inspected)  
**Deliverable type:** implementation plan only; **not** evidence of shipped functionality  
**Target:** `apps/ecommerce-cms-agentsam`, reusing `packages/media-kit` and `packages/agentsam-workbench`  
**Implementation rule:** One existing Product Studio, one commerce data model, one media library, one authorized AgentSam infrastructure.  
**Approval policy:** Implement on feature branches; do not merge, publish, change provider orders, or deploy without explicit approval for those actions.

> **North star:** A merchant can select a blank, create or upload artwork, precisely place and edit it, see a trustworthy garment preview, save the design, and press **Next** to configure pricing, descriptions, SEO, variants, collections and fulfillment in the existing Product Editor. They should never need a developer or a second editor to finish an ordinary product.

---

## 0. Read this before writing code

### User-approved design direction

Keep FNF's restrained cream/charcoal/olive design language; borrow **workflows and ergonomics**, not Completeful's black/magenta colors or source code.

1. **Large center = editing artboard.** Prefer a flat, accurately scaled garment/print-area design surface with grid, rulers, guides, selection handles and precise coordinates. Do **not** use the full photographic person-with-shirt image as the primary editing coordinate system.
2. **Small right/bottom mini preview = realistic garment.** Reflect the selected color, side and design placement; use provider-supplied variant photography where authorized, or a clearly labeled local composite. A provider-approved render is separately labeled.
3. **Left rail remains compact and opens drawers on demand**; add **AI** while reusing existing assistant infrastructure, rather than mounting a second chat.
4. **Selected layer = contextual top-center toolbar.** Editing capabilities are real, non-destructive and correctly gated by asset type.
5. **Top right = Save / Next.** Save persists a design draft. Next **awaits a successful save** and routes using the real local product ID to the existing Product Editor; neither publishes.
6. **Artwork Help = file-question-mark icon** with contextual hover/focus tooltip or popover, not an oversized permanent link.
7. **Responsive on phone, tablet, laptop, 1920px and ultrawide.** A small screen is not compressed desktop; a large screen is not stretched mobile.
8. **Creative Partner stays in place.** Brainstorm, generate, revise, compare, accept/discard, then save. No surprise full-screen global AgentSam drawer and no silent overwrite of source artwork.

### Scope limits / anti-goals

- Do not build another CMS, Product Editor, Media Library, provider adapter, isolated assistant service or product-design document implementation.
- Do not put a Completeful-shaped or FNF-branded API inside a reusable package. Provider IDs remain adapter aliases, not UI authority.
- Do not advertise buttons that only simulate capabilities; mark unavailable operations clearly and omit them from primary actions.
- Do not treat a sample garment raster as a production master, a marketing AI image as a provider mockup, or review logos as manufacturer-approved artwork.
- Do not silently create a provider store product, approve production, purchase anything, change price or publish products as a side effect of editing the design.
- Do not grant a customer-facing agent access to dashboard chrome, source repositories, secrets, shell, infrastructure or arbitrary DOM mutation.
- Avoid simultaneous conflicting edits with other active FNF worktrees; refresh from main, compare branch ownership and keep commits scoped.

## 1. Grounded code map and findings (2026-10-06)

### Composer identification — this matters

The Product Studio composer visible beneath the main canvas (**“A creative partner, on your canvas.”**) is currently **inline JSX in**:

- `apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx` around lines **1273–1311**: `ps-composer` markup, textarea, **Brainstorm** and **Create artwork** buttons, reply presentation.
- Same file around lines **399–450**: `askAI(generate)` posts to `/api/admin/agentsam/chat`; generation requests include `task_type: image_generation`, `lane/mode: image` and `workflow_key: fnf_creative_studio`. When `ai.image_base64` arrives, it is immediately converted to a File and passed to `upload()`, which may select it into the design. **This must become a reviewable proposal**, not immediate replacement/placement.
- `apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css`: `.ps-composer`, `.ps-composer-actions`, responsive rules.
- `apps/ecommerce-cms-agentsam/backend/admin/agentsam.js`: existing assistant request processing. Determine which generation workflows actually return an image today; route request parameters alone do not prove a provider-capable image operation.

**Separate, existing portable miniAgentSam:** `packages/agentsam-workbench/src/{mini-agentsam.js,composer.js,index.js}` and FNF `frontend/inspector.js`. That host adapter currently delegates sending to the global AgentSam transport and can open the global drawer. Its initial concern is editable storefront preview selection, **not** the Studio-specific footer composer. Reconcile surfaces via shared contracts and authorized host adapters; do not collapse CMS section selection into Product Studio artwork selection.

### Product Studio/commerce/media owners

| Responsibility | Current code or contract | Verified / unfinished |
|---|---|---|
| Catalog blank and variants | `frontend/src/pages/products/ProductStudioPage.tsx`, `studio-model.ts` | Exists; provider IDs qualified through catalog model |
| Main studio, tool rail, actions, previews, composer | `frontend/src/pages/products/StudioWorkspace.tsx` | Exists; 1,300+ line component should be decomposed carefully |
| Studio icons | `frontend/src/pages/products/StudioIcon.tsx` | Local hand-drawn icon map; lacks file-question-mark and desired editing semantics |
| Studio styling | `frontend/src/styles/product-studio.css` | Existing, 1,600+ lines; consolidate rather than append endless overrides |
| Studio draft/Completeful workflow | `backend/admin/product-studio.js` | Existing local draft + provider association; don't rerun provider create on each Save |
| Store Product Editor | `frontend/static/product-edit.html`, `frontend/static/css/product-edit.css` | Existing Next destination and commercial SSOT |
| Store products, variants, SEO, collections | `backend/admin/api.js`, `backend/store/*`, D1 | Existing; PR #52 introduced improved commercial save and SEO |
| Product imagery and overlays | `frontend/src/pages/products/ProductImage.tsx`, `studio-model.ts` | Mini preview exists; large surface still uses realistic variant photo |
| Media Library and albums | `frontend/static/js/media-library.js`; `backend/admin/media.js` | Existing R2/D1 library; upload bug root cause still needs live verification |
| Media-neutral reusable kit | `packages/media-kit/src/*` | Source/version/collection separation; originals preserved |
| Portable mini workbench | `packages/agentsam-workbench/src/*` | Real package; editor-specific adapters and approval contract still required |
| Global AgentSam/dock | `frontend/static/js/agentsam.js`, `frontend/shell.js`, `packages/admin-dock` | Separate admin-wide surface; must not hijack Studio responses |
| CMS mini inspector | `frontend/inspector.js`, `frontend/static/js/theme-editor.js` | Potential competing selection handlers; separate Theme Editor QA |
| Feature descriptors | `features/product-studio/agentsam.feature.json`, `features/mini-agentsam-composer/agentsam.feature.json`, `apps/ecommerce-cms-agentsam/agentsam.app.json`, `.agentsam/app.json` | Existing descriptors, needs truthfulness check after capabilities land |

**Recent lineage:** PR #50 merged initial Studio/gallery polish; PR #52 merged draft-to-Product-Editor flow. Latest checked-out baseline `38c2e16` includes later draft error-recovery work. Older handoffs pointing to `b8c0171` are historical, not current main.

**Prior documentation availability:** `AGENTS.md` and `docs/operating/FNF-RESPONSIVE-SPEC-AND-DOCK-PLAN-2026-10-04.md` exist in the inspected checkout. The earlier handoff cites `docs/FNF-ADMIN-DOCK-AND-AGENT-UX-POLISH-HANDOFF-2026-10-04.md` and `docs/design/agent-in-place-states.html`, but those two paths were **not present on main** at inspection. Find their PR history (including open PR #30) before treating them as live requirements. Their substantive design principles are incorporated here.

### Visible deficiencies from the October 6 screenshots

- FNF main editing area is dominated by a large lifestyle photograph with the print rectangle overlaid. Completeful's large surface is a **flat garment/production-oriented artboard** with the high-fidelity photo in the mini preview.
- FNF mini preview is present, but its compositing proportions, front/back accuracy, and mapping to draft state are not fully verified.
- FNF currently exposes an elementary text artwork toolbar only after selecting artwork; Completeful exposes positioned selection handles, crop/edit, resize with dimensions, recolor, flip, rotate, resolution information, fit and centering.
- FNF canvas zoom exists, but it is not synonymous with physical artwork dimensions; the distinction must be evident in UI.
- The Studio uses individual `scale/x/y/rotation` and a single set of original/prepared/preview IDs. **Independent front/back placement and multi-layer persistence are not proven**; current draft `placement_json` is too simple for the eventual full scene graph.
- Product creation and commercial fields are now separated, but the source artwork, finished mockup, pricing, stock and publishing must remain distinct identities.
- The existing bottom composer is visually disconnected from the editing context. It needs a corresponding AI drawer and a safe proposal/apply lifecycle.
- Previous Content Library uploads sometimes returned HTML instead of JSON. Better error messaging exists; **root cause has not been established**.
- Gallery contains six FNF identity review PNGs. Their `/media/` URLs are public even if the admin album requires authentication. Do not imply confidentiality or manufacturing approval.

## 2. Proposed experience and layout contract

### Desktop / large screens

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← Products  Product / active blank     [?] Help   [Save] [Next →]       │
├───────┬──────────────────────┬────────────────────────────────────────────┤
│Tool   │ OPTIONAL INSPECTOR   │ CONTEXT TOOLBAR (when a layer is selected) │
│rail   │                      ├────────────────────────────────────────────┤
│       │ Options / Upload /   │                                            │
│       │ Designs / Layers /   │     FLAT, PRECISE DESIGN ARTBOARD          │
│       │ AI / Tools           │     printable area, grid, snapping        │
│       │                      │     handles, rulers, measurements         │
│       │ drawer can collapse  │                                            │
│       │ entirely             │                               ┌─────────┐│
│       │                      │                               │ garment ││
│       │                      │                               │ preview ││
│       │                      │                               └─────────┘│
│       │                      ├────────────────────────────────────────────┤
│       │                      │ [Front] [Back]   Zoom • Fit • Grid • Undo │
│       │                      ├────────────────────────────────────────────┤
│       │                      │ compact Creative Partner / reply peek     │
└───────┴──────────────────────┴────────────────────────────────────────────┘
```

- Design canvas is a **coordinate editor**, not simply an image with overlays.
- Mini preview may dock bottom-right; hide/show should not change artwork coordinates. Keep a useful preview visible when the left panel opens and in large-screen fullscreen/focus mode.
- Center toolbar floats at predictable coordinates, does not cover safe-area placement and responds to selection state.
- Left inspector is collapsed at entry, expands only for the selected tool; reopen preserves tab and scroll where appropriate.
- Keep product choice/color/front-back selectors visible without clutter; avoid burying the two sides behind arbitrary settings.

### Product mini preview semantics

1. **Placement approximation:** variant-specific product image + transparent artwork overlay, labeled “Placement preview”; informative only.
2. **Provider render:** exact Completeful render result for this saved draft, selected variant and print side, labeled “Completeful render”; never silently reuse after an edit invalidates it.
3. **Verified product photography:** a separate merchant-uploaded image with provenance.
4. **Generated marketing concept:** separate AI-created asset explicitly marked as concept; never pass as a supplier-confirmed mockup.

The mini preview should follow selected side, variant/color, artwork transforms, crop/recolor derivatives and active layer visibility. Display comparison front/back without conflating coordinates. If any variant has no reliable imagery, show a graceful fallback **with an accuracy notice**, not a misleading cross-color photo.

### Header, icons and visual polish

- Replace permanent “Artwork help” text with an accessible **file-question-mark** icon near Save/Next. Tooltip: “Artwork help · print sizes, DPI, transparent files, safe area.” Click/tap opens existing help; hover, keyboard focus and touch are supported. Use user-specified Lucide `file-question-mark` geometry:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
     stroke-linejoin="round">
  <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
  <path d="M12 17h.01"/>
  <path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/>
</svg>
```

- **Save** (secondary, frosted/glass treatment) = save design draft, accurately report saving/saved/unsaved/error; preserve current editor context.
- **Next →** (primary, polished glass/raised finish) = save successfully, then route to **`/admin/product-edit?id=<persisted-local-product-id>`**. Never route on failure, create duplicate local products or publish. On desktop align right; on phone keep actionable above dock/keyboard.
- Glass styling is controlled restraint: subtle transparency, border and blur with **solid accessible fallback**, clear focus rings, readable text on mixed backgrounds and hover/touch targets ≥44 CSS px.
- Consolidate `StudioIcon.tsx` to named consistent Lucide-equivalent paths or an existing icon abstraction; no decorative text glyphs posing as working tools. Use tooltip descriptions for icon-only controls.
- Preserve FNF tokens and product-specific styling. Avoid copying Completeful branding.

## 3. Authoritative design model: required before advanced editing

### Existing identity boundaries — preserve

```text
Catalog Blank / Variant (provider read)
    ↓ selects
Local Studio Draft (design state, artwork, print areas)
    ├─ Original media assets (immutable)
    ├─ Prepared derivatives / proposals / composite previews (versioned)
    ├─ Local store product_id (draft status)
    ↓ Save / Next
Product Editor (commercial price, title, SEO, collections, media, inventory)
    ↓ explicit Connect Completeful fulfillment
Provider store product + variant mapping
    ↓ explicit publish with readiness gates
Storefront listing
```

### Required next-generation document (PROPOSED; not a current schema)

Use one versioned, server-validated design document inside the existing draft authority (or a closely associated versioned child table). **Do not add a parallel Product Studio database.**

- `draft_id`, `product_id`, catalog product ID, design document revision and editor revision/ETag.
- `variants_enabled[]`; active preview variant/color is ephemeral UI selection **unless deliberately saved as a preference**.
- `print_areas` keyed by **stable catalog print-location ID**. Front and back are independent; each contains layers and placements. Never reassign a back image onto the front on a toggle.
- `layers[]` with unique stable ID, media source ID, optional derivative ID, asset role, order, visibility, lock state, selected transform, crop/mask/recolor filters and revision.
- Placement transform with normalized anchor, width/height/rotation/flip; derive physical dimensions from provider print area in inches/mm. Never persist browser screenshot pixels as production coordinates.
- `original_media_asset_id` vs `prepared_media_asset_id` vs `preview_media_asset_id` vs `provider_render`: separate provenance and signatures.
- `selected_layer_id` and open drawer may remain UI state, but operations must carry draft revision and target layer identity.
- `mockup_revision_signature`/variant/location IDs so a stale provider render becomes visibly outdated after edits.
- Additive migration with backfill from existing `placement_json` / single asset IDs; preserve existing draft and product row IDs; no destructive rebuild.

**Invariant:** canvas, mini preview, saved/reopened draft and provider rendering consume the **same validated placement and layer model**. When any transform changes, selectors and previews must rerender coherently. Render a “stale” state rather than displaying a previous render as current.

## 4. Sprint backlog — execute in this order

Status legend: **VERIFIED EXISTING** / **REPAIR** / **NEW** / **NEEDS LIVE VALIDATION**. Each sprint should conclude with a reviewable demonstration and runnable tests, not a screenshot-only “done.”

### Sprint 0 — Baseline, contracts and observable defects (P0)

**Purpose:** Prevent more drift and parallel-agent collisions.

- [ ] Fetch latest `main`, inspect `AGENTS.md`, product, media, AgentSam and commerce feature manifests, and existing open PRs/worktrees.
- [ ] Inventory existing Studio, Product Editor, Media, AI router, `packages/agentsam-workbench` and admin dock; mark each proposed operation implemented/partial/missing.
- [ ] Reproduce and capture **HTML-not-JSON upload** failure: request path, status, content-type, auth redirects, multipart size/field parsing, Worker route, R2 put, D1 insert and subsequent GET; distinguish login HTML, SPA fallback, proxy error and upload size limits.
- [ ] Capture actual blank/variant source images and print specification metadata for black, Brick, Denim, Ivory, Moss and Pepper; determine whether flat artboards exist per product/print side.
- [ ] Verify existing draft save and reopen behavior on a disposable test draft; verify original and prepared media IDs, provider render identity and commercial product ID.
- [ ] Establish capability truth table for AI image generation and editable image operations. A request flag does not establish that a real model/provider or tool is available.
- [ ] Check feature descriptor drift between `agentsam.app.json` and `.agentsam/app.json`. Missing handoff files remain historical references until found.
- [ ] Record branch ownership, migration requirements and deployment readiness before writing features.

**Exit:** audit table, reproducible bugs or explicitly marked unverified hypotheses, committed baseline test fixtures, single owner for each relevant state/API.

### Sprint 1 — Flat edit canvas + reliable mini preview (P0)

**Purpose:** Make the correct thing large.

- [ ] Separate `DesignArtboard` from `ProductMiniPreview` in the existing Studio React tree. Only refactor enough to remove composition confusion; don't launch a second editor.
- [ ] Primary center = flat, zoomable shirt silhouette / verified provider artboard plus correctly dimensioned print region. Respect whether selection is front/back. Never put a photo of a person behind the production grid.
- [ ] If provider flat artboard absent, use a clearly labeled generic neutral silhouette **for design positioning only**, preserving provider measurements; don't invent per-garment geometry that implies production fidelity.
- [ ] Mini preview = realistic selected garment imagery with synchronized composited artwork; render pending/stale state distinguishable from provider mockup.
- [ ] Front/back selection visible near bottom center; switching does not erase either side's saved layers.
- [ ] Separate `canvasZoom`/pan from `artworkWidth`/height/position and proof that zoom does **not** change saved physical placement.
- [ ] Retain a collapsed-by-default inspector and left tool rail. Keep canvas wide on ordinary laptops and deliberate max dimensions on ultrawide monitors.
- [ ] Improve image loading fallbacks, avoid wrong-color photo fallthrough, eliminate unbounded “Provider references (12)” distraction; move to collapsible compact thumbnail gallery.

**Exit:** sample design on two colors and both sides; artboard stays geometrically stable while realistic mini preview reflects the selected combination. Round-trip save/reopen proves it.

### Sprint 2 — Precision placement, grids and layer model (P0)

**Purpose:** Replace eyeballing with measured editing.

- [ ] Implement documented coordinate system: print-area dimensions, units (in/mm), pixel output target, top-left/center origin and selected artwork anchor.
- [ ] Optional **grid** with adjustable spacing (e.g. physical 0.25in or 5mm intervals), major/minor lines, safe-area outlines and centerlines. Grid is visual guidance, never baked into a production asset.
- [ ] **Snapping** to center, safe-area margins, other visible layers, grid and rulers; configurable tolerance in screen px converted through zoom. Show snap feedback and allow temporary disable.
- [ ] Transform handles to move/resize/rotate with keyboard nudges, Shift constraints, mouse/touch interactions, minimum touch sizes and accessible alternatives.
- [ ] Numeric inspector: X/Y, physical W/H, uniform scale, lock aspect ratio, rotation in degrees, horizontal/vertical flip, reset placement, “Center horizontally/vertically.”
- [ ] **Fit artwork to print area** is separate from **Fit artboard to viewport**. “Fill” may crop; preview consequences and never silently destroy content. Explicitly label both functions.
- [ ] Layer stack: selectable rows, hide/show, lock/unlock, ordering, duplicate, remove from placement (not delete media master), restore/undo. Make currently selected layer obvious on artboard and in panel.
- [ ] Preserve independent front/back layers and revision history in a backward-compatible persisted document. Derive preview from that state, not parallel CSS-only positions.
- [ ] Accurate print quality: source pixel dimensions / output print width in inches = effective DPI. Recalculate for resize/crop and provide factual severity bands based on real provider limits; no hard-coded “379 DPI” badge.
- [ ] Undo/redo across transforms and layer operations. Undo stack must not silently undo unrelated commercial Product Editor changes.

**Exit:** numeric placement persists exactly across save/reopen/viewport zoom; both sides remain independently editable; snap/grid can be disabled; no duplicate or lost layers.

### Sprint 3 — Contextual toolbar and non-destructive artwork operations (P1)

**Purpose:** Make Completeful-style visible actions genuinely useful, without cloning their UI.

When **no layer selected**, hide/disable contextual operations and show a friendly “Select artwork to edit.” When a layer is selected, display a compact **top-middle toolbar** in this suggested order:

| Control | Expected real behavior | Drawer/popover / data rules |
|---|---|---|
| **Edit** | Opens image-editing workspace for selected asset | Crop, adjustments, edge inspection and before/after |
| **Cut out** | Prepare transparent cutout when supported | Opt-in, preview original vs derivative, preserve master; report algorithm/provider |
| **Resize** | W/H physical and px equivalents, aspect lock | Precise controls, apply transform to selected layer |
| **Color swatch** | Opens clean color drawer | Swatch palette, HEX/RGB, eyedropper where supported, original vs recolor |
| **Rotate 90°** | Rotate selected layer clockwise **90 degrees** | Immediate, undoable; do not confuse 90 degrees with “90%” |
| **Fit to print area** | Fit inside selected provider print boundary | Different from canvas “Fit viewport”; never silently upscale raster quality |
| **Corner radius** | Non-destructive rectangle/mask corner rounding | Works where shape/crop mask supports it; image-edge transparency; no garment rounding |
| **Flip** | Horizontal or vertical selected artwork | Preserve source; mirrored text warnings |
| **Align / Center** | Snap artwork to middle/guides | Affects exact layer coordinates |
| **Duplicate / Delete layer** | Add a copy or remove placement | Never delete R2 original without separate Media Library confirmation |
| **Quality** | Real effective DPI / safe-area warnings | Badge from current print spec and transform only |

- [ ] Color drawer: direct #HEX + RGB, common palette, recent colors, color replacement UI and preview. For SVG/limited-color vector assets support specific fill targets; for raster images do not claim global single-color recolor is the same as proper vector editing. Show capability/safety boundaries.
- [ ] Image Editor modal: clean crop with free, 1:1, 4:3 and 9:16 presets; pixel dimensions, reset, adjustment panels, before/after and Apply/Cancel. Crop creates a derivative, never destroys the original.
- [ ] Cutout preview: clearly distinguish transparent edges, white background, alpha mask, trim bounds, and unsupported complex background removals.
- [ ] Rotation, flip, size and placement stored with the design document and reflected in mini preview, print-preparation export and undo stack.
- [ ] Context toolbar has keyboard focus navigation, helpful tooltips, no fake DPI and placement never hidden behind it.
- [ ] Preserve originals and provenance when preparing transformed production artwork; maintain actual derivative media records through `packages/media-kit` + existing R2/D1.

**Exit:** for a selected sample logo, crop, recolor (supported SVG/asset), rotate 90°, flip, fit, round corners (where supported), compare, undo, save/reopen and reproduce the correct render and resulting derivative identity. Unsupported operations are visibly unavailable rather than silently pretending success.

### Sprint 4 — AI drawer + contextual Creative Partner (P1)

**Purpose:** One assistant with an editor-specific experience, not two unsynchronized chats.

**Left rail:** add an **AI** icon and drawer next to Upload/Designs/Layers; keep the global AgentSam dock independent. Suggested tabs:

1. **Create** — prompt + explicit **Upload/Choose reference** entry; mode New logo / Artwork / Mockup concept (capability-gated), optional style/color/transparency/aspect/output guidance; provider availability and approval before generation, especially paid processing. File can come from existing Media Library or a new upload. Selected garment/print area are context, not writable authorization.
2. **Edit / Remaster** — selected source thumbnail, optional reference asset, user instruction, supported transformations/upscale/cutout/variation, and side-by-side source versus proposal. Reuse actual media derivatives and tool capabilities, not ad-hoc uncontrolled prompts.
3. **Results** — generated/proposed assets tied to the draft, status, source and revisions; a compact grid for reviewing, comparing and selecting approved output. Persist through existing Media Library albums/relationships, not another files database.

**Same interaction state, multiple presentations:**

- Compact in-place composer lives on/near the editor (current bottom `ps-composer`, refined); opening AI reveals a fuller drawer **for the same prompt, attachment selection, conversation and results**.
- Reply = nonblocking four-line peek card; click expands to review sheet; full conversation opens **only on explicit request**. Do not automatically open `openAgentsamDrawer()` on reply.
- Existing portable `@inneranimalmedia/agentsam-workbench` owns reusable composer, attachment, preview and approval interaction. Product Studio provides a React/host adapter to authorized product-editing actions. CMS preview selection remains a separate adapter.
- Build server-authorized resource descriptors keyed by draft, product, variant, print location, selected layer and revision; validate all resource IDs server-side. **The client cannot grant capability by supplying a flag.**
- Lifecycle: **Ask → Propose → Approve generation/execute → Candidate asset → Compare → Accept/Discard → Save draft.**
- A model reply is not proof of file creation. Generation must return an actual saved candidate ID, provenance, MIME/size, and review result, or report not available.
- **Critical repair:** remove current `askAI()` auto-selection of generated `image_base64`. Create/store pending candidate derivative safely and apply to active layer **only after Accept**. Keep original master and previous layer placement.
- Detect stale responses when draft revision, variant, active side or selected layer changes while generation runs. Prevent auto-apply and require re-target/review.
- Separate **Brainstorm** (text only) from **Create artwork** (image-capable provider + consent), **Remaster** (reference image + proposal), and **Create mockup concept** (marketing asset explicitly not a supplier render).
- Show real progress states and failures from the backend; no fabricated percentages, phantom streaming or inert buttons.
- Extend portable host permissions per editable resource: read, propose, generate with approval, apply with approval, save via editor. No full DOM, admin chrome, deployment or arbitrary database authority.
- Align model/key discovery with installed/authorized provider tooling; do not hardcode a model catalog or use platform fallback keys.
- Prompt attachments support paste, drag/drop and file/library picker, with MIME/size guardrails; upload error feedback is actionable.

**Exit:** user uploads a logo, asks to recolor/remaster, sees original and new proposal, declines with zero mutation; retries and accepts an actual derivative, sees canvas + mini preview update, saves and reloads it. No surprise drawer opening and no source overwrite.

### Sprint 5 — Gallery, brand assets, uploads and Product Editor handoff (P0/P1)

**Purpose:** The editor can use real managed assets end-to-end.

- [ ] Fix Content Media Library HTML upload response at its source; test auth, multipart, Worker route, R2, D1, metadata and post-reload access. Do not add a second upload implementation.
- [ ] Verify six **FNF Identity — Review v1** logo variants are visible in Content gallery and selectable from Studio Upload/Designs and AI references; avoid duplicates by R2 key / media identity.
- [ ] Display source/derivative/usage and review/approved status. **Do not auto-assign review logo packs as official branding or production masters.**
- [ ] Media asset picker includes search, albums, recent designs, originals versus derivatives, and thumbnail roles. Don't mix existing mockup photos with transparent art master thumbnails.
- [ ] Album deletion and bulk deletion remain confirmable and safe. Refuse deletion of referenced source without explicit warnings/dependency handling and tests.
- [ ] Save design stores an immutable source reference + current layer document + optional composite; auto-attached composite is labeled as approximation until merchant replaces it with provider render or approved image.
- [ ] Top-right **Save** and **Next** consume the same save function. Next navigates using persisted local product ID only after success. Product Editor must display the associated design, allow **Edit design**, and never clobber design media when saving title/SEO.
- [ ] Commercial data **lives in Product Editor**: title, description, pricing, inventory, collections, SEO, media order and publish status. No reintroducing these controls into Studio Options.
- [ ] Keep Completeful fulfillment connection explicit, idempotent, with real catalog variant mapping and no accidental provider writes from Save.
- [ ] Verify Product Editor, Inventory and collections use existing product/variant and membership tables, avoiding duplicated collection systems.
- [ ] Prepare two distinct image roles on storefront products: real mockup/approved imagery versus original production artwork; block inappropriate publishing of draft-only composites where production guarantees require it.

**Exit:** upload/select actual stored logo → edit with precise placement → save → reload → Next → product details → commercial edit/save/reload → explicit Completeful connection and mockup → readiness checks; no unexpected publishing.

### Sprint 6 — Responsive, accessibility and visual finish (P1)

**Purpose:** A genuinely polished creation station across devices.

- [ ] Test CSS widths **320, 360, 390, 430, 744, 834, 900, 1024, 1280, 1440, 1920, 2560+**; Safari/iOS in addition to Chromium desktop.
- [ ] Width controls layout, pointer type controls touch sizing. Tablet portrait is a deliberate design, not a zoomed phone; large desktop uses additional room intelligently.
- [ ] Mobile: canvas stays visible during selection and AgentSam peek. AI drawer uses a dismissible half-sheet/sheet that respects safe-area insets, dynamic viewport and the on-screen keyboard; avoid tool rails, dock, composer and save bar all fighting for one bottom area.
- [ ] Compact peek / expanded half-sheet / explicit full conversation share state and do not lose the design on open/close, keyboard activation or orientation change.
- [ ] Desktop: rail can collapse, selected inspector anchors cleanly, big artboard stays central, toolbar does not overlap mini preview, compact Creative Partner doesn't shove the product off-screen.
- [ ] Long product names truncate gracefully; controls remain visible around 1024–1440 laptop viewport; ultrawides avoid tiny centered product within huge empty margins.
- [ ] Better hover/focus/pressed semantics for toolbar and rail, WCAG contrast, reduced-motion fallback for glass effects, semantic tooltips, aria-labels and keyboard operations.
- [ ] Product grid, provider references and artwork galleries have bounded height and do not trigger nested scrolling traps.
- [ ] Header Save/Next uses FNF tokens, restrained glassmorphism and readable solid fallback; no unapproved theme redesign.
- [ ] Show disabled/processing state with explicit reason, not a gray button that gives no feedback.

**Exit:** recorded screenshots **and actual interaction traces** at representative sizes; no hidden canvas, blocked buttons, broken keyboard focus, scroll lock, accidental double submissions or unsaved-state loss.

### Sprint 7 — Security, production parity, regression and release (P0)

**Purpose:** Demonstrably trustworthy, not just attractive.

- [ ] Exhaustive draft document migration and round-trip tests across legacy + new drafts; no blanking existing garments, side placements, media or variants.
- [ ] Test snapping/physical dimensions against provider print specifications; compare selected variant color, placement, front/back and artwork against provider render (within documented differences).
- [ ] Generation/recolor/upscale/crop/corner masks preserve original source and store versioned derivatives with content hash/provenance and permission checks.
- [ ] Product owner reviews candidate photos/mockups before live product publication; no mistaken source art as storefront photo.
- [ ] Authorization checks for all AI tool calls and media mutations; stale revision rejects and replay/idempotency support where providers create paid resources.
- [ ] Disallow admin shell/back-end config selection through mini workbench; CMS uses stable section/block/field IDs; store-scoped resource validation and actions.
- [ ] Test browser and API error recovery, retries, cancel when supported, media failure, expired auth, variant mismatch, provider outage and partial operation receipts.
- [ ] Verify work across actual FNF app and extraction readiness for reuse in another ecommerce host; portability does **not** mean forcing distinct customer UIs to look identical.
- [ ] Update feature manifests only after capabilities exist; mark “implemented,” “preview,” “proposed” separately, validate schemas and sync SDK-facing app descriptors.
- [ ] No hidden deploy; PR with diff/test/known-limits report. Deploy only after required approvals and report resulting Worker version + actual live authenticated acceptance.

**Exit:** owner-reviewed working flow; all blockers categorized; no release claim without real backend and browser evidence.

## 5. Tests and release gates

### Highest-value automated checks (must include real state)

| Test | Assertion |
|---|---|
| Design coordinate mapping | Artboard zoom does not change persisted artwork x/y/W/H |
| Variant color | Select Black → Brick → Moss; flat editing geometry stays stable, mini photo changes correctly |
| Front/back | Change artwork independently; save and reopen both with exact placement |
| Layer operations | Select, move, nudge, resize, rotate, flip, reorder, hide; undo/redo and reload |
| Grid and snapping | Physical grid, guides and safe area align with real provider specs; disable override works |
| Precision / DPI | Effective DPI computed from output size and source pixels; warns on poor quality |
| Crop / cutout / recolor / corners | Original untouched, accepted derivative traceable, rejected proposal no mutation |
| AI image proposal | Generation requires authorization, returns real saved result, only acceptance applies |
| Stale AI proposal | Switching variant/side/draft prevents old result from overwriting new selection |
| Media upload | Multipart upload → R2 stored → D1 row → gallery reload → Studio picker opens it |
| Album deletion | Confirmed album delete preserves underlying media; referenced master deletion guarded |
| Save and Next | Save failure blocks navigation; success passes valid local product ID and stays draft |
| Commercial isolation | Studio saves preserve Product Editor title, price, description, SEO, collections and stock |
| Provider idempotency | Repeated fulfillment connection does not duplicate store products/variant links |
| Product mini preview | Accurate placement approximation vs provider render badge; stale render invalidated |
| Global/mini composer | No automatic full chat; same conversation context without conflicting mutations |
| Resource security | Unapproved operations and cross-store or admin-shell resource IDs rejected server-side |
| Accessibility/responsiveness | Keyboard focus, tooltip, mobile keyboard, iPad rotation, 2560px canvas usable |

### Manual acceptance route

1. Start with a real catalog blank (use the existing Comfort Colors 1717 test example only as a fixture).
2. Select a color and **Front**; add an existing review artwork preview to the canvas (not publish).
3. Enable grid and snap. Enter exact physical size, place a chest logo, nudge/rotate, zoom, undo and redo.
4. Switch to **Back**, add a different large design, return to Front and confirm no placement loss.
5. Open AI → Create. Upload/choose a reference; request a variation. Review and reject; try again, approve, accept and confirm derivative ID and media history.
6. Verify matching large flat artboard and small realistic product preview for Black, Brick and Denim. Toggle front/back and compare with provider render when available.
7. Save, reload the same draft, verify coordinates, sides, layers, source and version history.
8. Press **Next**; land on correct actual Product Editor ID and verify no publication.
9. Edit description/price/SEO/collections/inventory; save, refresh, edit design again, return and ensure commercial fields are unchanged.
10. Connect Completeful deliberately only after readiness; check mapped variants, provider render and publisher consent before activation.
11. Repeat editor/AI/dock interactions on iPhone Safari, iPad portrait and landscape, laptop and wide display.

**Live test evidence required:** URL, commit SHA, Worker version, timestamp, account/environment, tested product/draft ID (redacted in public reports as needed), browser/device, request status and error text, screenshots, backend receipts. Never report a test as complete based only on static render or a unit-test regex.

## 6. Dependencies, boundaries and ownership

**Do not work out of stale baseline or over another agent's worktree.** Latest inspected main `38c2e16`, but **recheck before each sprint**. Other active worktrees exist for CMS theme fidelity, brand workspace, content gallery, launch workboard, product merch pipeline and dock; coordinate ownership.

Suggested work packages (can be executed sequentially on focused branches):

1. **Canvas data model + frontend projection** — `StudioWorkspace.tsx`, new co-located artboard/layer components, `studio-model.ts`, Studio CSS, additive draft persistence.
2. **Production transforms + media** — `backend/admin/product-studio.js`, `backend/admin/media.js`, `packages/media-kit`, D1 migration and tests.
3. **Contextual AI adapter** — `packages/agentsam-workbench`, Studio React integration, `backend/admin/agentsam.js`, authorized tools and request receipt API.
4. **Commerce lifecycle** — existing `product-edit.html` + `backend/admin/api.js`, provider links and publishing gates.
5. **Responsive and manifests** — current dock/shell, Studio styles, feature descriptors only when real code is validated.

If the existing provider/workbench can’t support an operation, create a capability contract and mark it **proposed**, rather than introducing a silently disconnected UI.

## 7. Suggested implementation artifacts per sprint

Every sprint PR or handoff should include:

- Scope and **specific unchanged functionality**.
- Exact files changed, add/remove decisions and data ownership.
- Schema change/backfill/rollback if relevant.
- Test command + counts + failing/blocked cases.
- Before/after snapshots at laptop and representative phone/tablet sizes.
- Direct merchant task walkthrough and live backend results.
- Feature capability truth table (newly executable versus shown as preview).
- PR URL, branch/commit, deploy status (if approved), tested Worker version.
- Next sprint dependencies and unresolved issues.

**Sprint completion is not identical to Git push, a green build, a mockup, or a deployed Worker.** Feature acceptance is based on real persisted workflows, trusted artifact provenance and reproducible interactions.

## 8. Parked concerns / deliberately not claimed as complete

- Live cause of HTML upload responses: requires reproducing the actual request path.
- Multi-placement/front-back document model: **proposed**; current single placement implementation is insufficient for arbitrary multilayer design.
- Full artwork editing (SVG recolor, accurate cutouts, crops, masks, corner rounding): **not proven implemented**; toolbar must be capability-gated.
- AgentSam image capability: request routing and base64 handling exist, but production generation/provider availability and approval flow require verification.
- AI mockup generation ≠ authorized provider garment render.
- Canvas size/shape source for every Completeful catalog blank: must be verified from real metadata, not assumed from screenshot.
- Two historical responsive/AgentSam handoff paths were missing from current `main` checkout; open PR #30/repo history must be reviewed, not quietly copied as deployed code.
- Provider-side image DPI and printability need selected provider measurements, alpha, actual output pixels and a real production spec.
- FNF brand gallery preview assets are review-stage and publicly addressable; do not silently treat them as private, final logo masters or print approval.
- Full authenticated end-to-end product order/fulfillment/live mobile Safari has **not** been demonstrated by the existing merge/build checks.

## 9. Definition of done — final Creation Station

A nontechnical merchant can open Product Studio, pick a garment, identify its real supported colors and print areas, place multiple editable layers on front and back using precise guides, inspect the same design on a realistic mini preview, ask AgentSam to create or revise artwork without losing the selected object, review and accept a versioned result, save and reliably reopen the design, press **Next** to commercial Product Details, complete SEO/price/variants/collections/media/inventory, explicitly connect supported fulfillment, and deliberately publish.

The **product**, **design**, **media sources and derivatives**, **provider association**, **preview**, and **AI assistant** remain coherent and portable without spawning another disconnected app.

**Release decision:** hold until the tested Definition of Done is met or each gap is visibly marked unsupported; do not present the plan itself as implementation.
