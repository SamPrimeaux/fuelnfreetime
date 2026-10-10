# Component authority and legacy editability audit

**Rule:** PR #92 merge/CI does not prove every legacy section fully editable. Preserve source markup, page composition, media and animation. Audit the existing installed component before adding any control; only meaningful, working controls count.

## What the inventory actually covers

A read-only JSDOM scan of `packages/heuristic-theme/storefront/*.html` against the existing `registryForAdmin()` and `getRegistryPage()` ran on the local repository (local mirror branch; remote `main` is newer). A PR #92 CI test separately checks the registered Heuristic section and nested-block slot contract.

| Source page | Explicit source sections | Registered | CMS-marked slots | Nested block slots | Link/button candidates without own CMS annotation or annotated descendant |
| --- | ---: | ---: | ---: | ---: | ---: |
| Shop | 5 | 5 | 35 | 21 | 5 |
| About | 9 | 9 | 64 | 41 | 0 |
| Community | 6 | 6 | 89 | 68 | 0 |
| Collaborate | 3 | 3 | 16 | 0 | 1 |
| Policies | 2 | 2 | 13 | 0 | 1 |
| Terms | 2 | 2 | 15 | 0 | 0 |
| **Explicitly marked subtotal** | **27** | **27** | **232** | **130** | **7** |

Twelve Heuristic HTML files were scanned. Other source files — Home, Product, Collection, Collections, Cart and Order Confirmation — contain **no `data-cms-section` region in this scan**. This is not proof that their routes are unused or uneditable: several are dynamic commerce-rendering templates and require separate route/resource-template coverage.

No scanned explicitly annotated section or nested block had an unresolved field key. However, a valid `data-cms` binding establishes a **name/path**, not an actual field-specific inspector, persistence, visual styling update, responsive control or publication receipt. Not all seven unannotated buttons/links should automatically be made editable; review their intent and role first.

## Required status taxonomy

- **Registered/rendered:** source and definition resolve. Does not imply selecting it works.
- **Selectable:** canvas or section tree identifies the correct source instance and nested field.
- **Editable:** inspector presents meaningful controls appropriate to that source.
- **Persistable:** merchant override survives Save and a fresh authorized read.
- **Previewable:** the actual authored scene applies that draft setting, without clobbering source styles.
- **Publishable:** approved test-resource publication renders the selected settings live.
- **Resettable:** resets an individual value to inherited theme/component default and removes its override.

Each of these is a separate gate. Record evidence individually; **never upgrade the entire component to Complete** from one green slot test.

## Initial capability matrix

| Component family | What code/CI supports | What remains unproven |
| --- | --- | --- |
| Heuristic Shop/About Hero text | PR #92 contextual font size, weight, line-height, tracking, alignment, case, color, background, padding, radius; sparse override/reset browser proof | Authenticated live editor feedback, fresh D1 read, publication/rollback, responsive field overrides, full rich-text controls |
| Section-level layout | Existing width/alignment, spacing, appearance, motion, visibility; PR #92 added four-sided spacing, margins/radius and original-style reset | Appropriate control applicability per section, full responsive layout and margin effects, actual CMS revision/rollback |
| CTA/button/link | Existing label/destination and PR #92 selected-slot visual overrides; Shop Chrome test preserves original CTA shape/icon | Link target, hover/focus states, border stroke, disabled state, per-button responsive controls, full click/save/publish proof |
| Collection/editorial cards | 130 nested source slots resolved against block instances/definitions | Actual block select/edit/reorder/duplicate/hide/remove/reload on all designs, responsive layouts and dynamic bindings |
| Images/background/video | Existing CMS field binding and library chooser; PR #91 added typed `model3d` and GLB filtering | Crop/fit/focal/overlays, thumbnail/version handling, non-destructive R2 receipt, 3D field rendering/preview fidelity |
| Global header/footer | Existing `site` section authority and registered controls | All logo, nav, announcement, drawer, breakpoint and header visual settings; global save/publish scopes tested end to end |
| Generated and imported content | D1 definitions/artifacts, schema typing and generated control paths exist | Same full contextual styling, block nesting, mutation, revert and publication operations as native components |
| Metaobjects/dynamic sources/templates | Architectural distinction established in proposals | Storage, template assignment, picker, binding and merchant CRUD coverage not verified in this audit |
| Theme Settings (18) | Consistent accordion/layout browser review and isolated session-state preview | D1-backed merchant values, inheritance, fresh read, live preview, reset, publish/rollback |
| MiniAgentSam | PR #92 shared SVG and selected-element anchor preservation | DOM-verified proximity after selection change, mobile collisions, real AgentSam request/proposal/approval continuation |

## Exact functional tests for acceptance

For each **representative** legacy element first (then broader catalog):

1. Select the original authored element in Shop/ About preview and verify the right inspector, selected path and appropriate field labels.
2. Change text/appearance/media in place; confirm the exact intended element changes and original neighboring CSS/media/motion stays intact.
3. Confirm Save is actionable immediately, commits one draft, then reload the page and fetch canonical data again.
4. Confirm authorized draft preview uses that saved revision; ensure deployed public page does not change before Publish.
5. Publish **only with explicit approval on a designated test resource**, verify live, then restore/reset and verify the original authored style survives.
6. Repeat for a nested collection/editorial block, CTA, image, global Header/Footer setting, imported/generated section, and a `model3d` asset where applicable.
7. Repeat at approximately 390px, 768px, 1440px, including tab/keyboard focus, tooltips, overflow and MiniAgentSam placement.

**Tests that are not yet present are requirements, not purported passes.** Live browser access and screenshot capture are currently blocked; see [WIP_AND_RELEASE.md](WIP_AND_RELEASE.md).

## Source ownership (extend, never fork into another implementation)

| Contract | Existing authority |
| --- | --- |
| Source HTML and original motion | `packages/heuristic-theme/storefront/*`, source theme packages |
| Catalog/section defaults | `apps/ecommerce-cms-agentsam/backend/cms/registry.js` |
| Installed typed definitions | `backend/cms/definition-registry.mjs`, `cms_definitions`, `theme/authoring.contract.json` |
| Selection/inspector | `frontend/static/js/theme-editor.js`, existing editor host |
| Storefront hydration | `packages/heuristic-theme/storefront/js/cms-hydrate.js`, existing edge hydration |
| Draft mutations/publishing | `backend/cms/api.js`, current canonical CMS D1/R2 model |
| Global theme values | `cms_globals` and installed theme contract; `theme-settings-panel.js` is currently only isolated preview |
| Media | Existing backend media/R2 asset contracts and media library |
| AI contextual selection | Existing MiniAgentSam and Side Assistant proposal/approval pipeline |

Acceptance must not be padded with meaningless switches or duplicate data authorities. A theme is a professional **starting point**, not a restriction on merchant design freedom. Overrides are sparse and reversible.
