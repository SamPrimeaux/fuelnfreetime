# Commerce CMS convergence — one customer-ready product

**Decision:** Continue the existing account-scoped CMS and Theme Studio. Do not introduce another page catalog, theme page database, shell, editor, or replacement frontend. Heuristic, Revise, and FNF are **complete design systems/themes**, not sample cards or interchangeable section labels. Each must preserve its own full-page structure, visual styling, header/footer, responsive behavior and section implementation.

## Authority and data contract

| Responsibility | Existing authority | Required behavior |
| --- | --- | --- |
| Merchant account/session | app auth/session; account memberships | Session-gate editing/preview; never select the account from global defaults |
| Page identity | `cms_pages` | Stable ID, slug, page type, template mapping, status, ownership |
| Sections and blocks | `cms_page_sections` / `cms_section_blocks` | Create/list/read/reorder/update/duplicate/hide/delete, optimistic revisions |
| Brand/site/theme settings | `cms_globals` | Account-scoped overrides, reset/inheritance, revision history |
| Installed theme bundles | `cms_artifacts` | Immutable package/version provenance; source theme != permission to publish |
| Drafts/publication | Existing CMS D1 authoring + R2 revision/snapshots + publish gate | Private preview reads draft; published route reads explicitly published snapshot |
| Theme visual implementation | `@inneranimalmedia/heuristic-theme`, `@inneranimalmedia/revise-theme`, `@inneranimalmedia/fnf-theme` | Source-faithful site renderers; no generic fallback masquerading as a complete theme |
| Editor/UI | Existing `/admin/theme-editor` and shared `frontend/shell.js` | Exactly one toolbar/shell; mounted current page and section selection |

**Do not resurrect:** `store_theme_pages` / legacy `theme-workspace` as a second owner. Its schema is absent in production and its routes are marked retired. Mine only proven presentation ideas, and implement them over the canonical data family.

## Observed production facts (read-only audit 2026-10-27)

- `cms_pages` has the account-scoped documents `about`, `bridge-fly`, `campaigns`, `community`, `home`, `ideas`, `products`, `shop`, `site`, `stories`.
- `campaigns`, `ideas`, `products`, `stories` have `template_key='revise'`. That is a template-authoring hint, not a requirement that a public URL already exist.
- `cms_artifacts` has a ready `theme/revise` bundle at version `0.2.0+f6b40d147e64`; Heuristic has its existing built-in runtime; FNF exists as a source package but isn't yet an account-installed theme artifact.
- `store_theme_pages` is absent in production as expected. Don't add it to solve missing preview.
- Heuristic has 12 authored storefront HTML source documents, real styles and runtime. Revise has packaged full theme/layout CSS and renderer-backed section library. FNF has its own tokens, layouts, shell, section implementations and home template.
- The old Theme Studio used a public route to decide whether Heuristic was previewable. This is an invalid coupling: drafts need authenticated preview before publication.

## Independent implementation tracks for multiple agents

**A — CMS data and lifecycle** (own `backend/cms`, schema, R2 contract, API tests): Prove per-account page/section/block full CRUD with revision conflict checks; store and retrieve styles as versioned theme settings and section data; preserve published snapshot while editing draft; solve any remaining legacy-to-canonical read/write mismatch without destructive migration. Do not create tables just to avoid aligning existing ones.

**B — Full theme renderer parity** (own `packages/heuristic-theme`, `packages/fnf-theme`, `packages/theme-contract`, integration with installed `@inneranimalmedia/revise-theme`): Prove Heuristic, Revise, and FNF render the *entire* actual authored page at desktop/tablet/phone, with real CSS, media, header, footer and behavior. Support theme-specific template mapping for pages such as `products` without silently substituting an unrelated page or simplifying a complete theme to generic cards. Use one adapter contract `render(theme, document, settings, media, revision)`.

**C — Theme Studio experience** (own `frontend/static/js/theme-editor.js`, `frontend/static/css/theme-editor.css`, shared `frontend/shell.js`): One shell, compact inline navigation search, existing Add Section UI with complete implementation-backed presets, true block and section editing, media selector, undo/redo, drafts and private preview links. Do not hide installed/source themes because publish verification is pending.

**D — Merchant acceptance/release** (own test suite, browser smoke, docs): Exercise signed-in pages with realistic D1/R2 data; 390/768/1440 layouts; add/duplicate/reorder/edit/remove section and blocks, save/reload, preview via authenticated URL before public route, publish only via reviewed gate, rollback and confirm storefront. Stop merge if screenshot or behavior regresses. Test same contract against another merchant configuration.

Agents must coordinate via one integration branch/main and small, independently verified changes; keep file ownership disjoint and merge only proven capabilities. No automatic mass package version bump and no blind production D1 migration.

## Current scoped progress

- Added small navigation search inside the existing persistent/mobile sidenav; global command palette retained.
- Exposed packaged theme previews independently of artifact installation, while preserving server-side publication gates.
- Added authenticated `/admin/cms-preview?slug=...&theme=...` **read-only viewer** using existing CMS endpoints/renderers; no public page route needed and no duplication of page state. It is not a replacement editor.
- Heuristic matching source documents and their CSS are copied under authenticated preview assets; newly authored slugs still need explicit source-theme template mappings.
- Route and private-viewer contract tests added; build gate passed.

## Definition of finished

All three full themes have source-faithful private previews and shared real CRUD for representative original/new pages; merchant edits persist across save and reload; pre-publication preview URL is authenticated and noindexed; active storefront stays unchanged until reviewed publication; no duplicate shell/header; no artificial no-route blockers; all preview/editor functionality and checkout are exercised in a signed-in browser. Source/unit tests alone do **not** certify this state.
