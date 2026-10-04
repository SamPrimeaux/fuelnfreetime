# FNF responsive spec and admin dock plan

Date: 2026-10-04 · Branch: feat/admin-mobile-dock-2026-10-04
App: `apps/ecommerce-cms-agentsam` (`@inneranimalmedia/ecommerce-cms-agentsam`)
Dock package: `packages/admin-dock` (`@inneranimalmedia/admin-dock`, feature `admin.mobile-dock`)

State vocabulary follows `docs/operating/README.md`.

## 1. Goal

The client works mostly on iPhone and iPad. The owner works on a Mac and a large TV. One admin must be good on all of them, so phone and tablet work cannot erode the wide-screen layouts, and the reverse.

Rule: **width chooses the layout; pointer type chooses the sizing.** An iPad in landscape is wider than 900px but is still touch.

## 2. Responsive ladder

CSS px, not device pixels. Device widths are approximate and PROPOSED until measured (see section 6).

| Tier | Width | Typical devices | Shell | Bottom dock | Agent |
|---|---|---|---|---|---|
| phone | <= 639 | iPhone 360-440 | slide-in drawer, 1 column | full width, 16 margin | drawer overlay (the agent tab opens it) |
| tablet portrait | 640-900 | iPad mini 744, iPad 820/834 | slide-in drawer, 1 column | capped 560, centered | drawer overlay |
| tablet landscape / small laptop | 901-1199 | iPad landscape 1024-1194, iPad Pro 13 portrait | persistent rail | none | side dock 400 |
| desktop | 1200-1599 | MacBook default scaled 1280-1512 | rail | none | side dock 400 |
| wide | 1600-2199 | MacBook 16 (1728), 1080p external (1920) | rail, content centered to 1440 | none | side dock 440 |
| ultra / TV | >= 2200 | 1440p/4K external (2560+), TV | rail, content centered to 1760, larger type (TBD) | none | side dock 520 |

OBSERVED: the shell already switches at 900px (`admin.css`, `console.css`), and the dock reuses that boundary (`COMPACT_MAX_WIDTH`, guarded by a test). The 640 cap and everything >= 1200 is PROPOSED.

## 3. Size contract

Touch (`pointer: coarse`, any width):
- Tap targets >= 44 x 44. Primary actions 48.
- Inputs 16px font minimum (iOS zooms below that).
- Side margin 16 plus safe-area inset. Dock bottom offset `max(12px, safe-area)`.
- Text: body 15-16, secondary >= 12, labels >= 11.

Fine pointer (Mac, TV remote cursor):
- Targets >= 32. Body 14. Secondary >= 12.

Wide and TV (viewing distance is larger):
- Body >= 16, secondary >= 14 at >= 2200.
- Content never stretches edge to edge: forms and editors 1120 max (OBSERVED on product editor), dashboards 1440 max at >= 1600 and 1760 at >= 2200, centered.
- Stat grids use `auto-fill, minmax(220px, 1fr)` and cap at 4 columns (desktop) and 6 (wide).

Dock (OBSERVED, enforced by `tests/dock-responsive-smoke.mjs`): bar 64 tall, every dock target >= 44, handle 44, input 16px, margins >= 16, hidden above 900.

## 4. What this branch changed

**Root cause of the reported clipping (OBSERVED, reproduced in headless Chrome):** the product editor's Variants table (`.product-inventory-table`: six columns of inputs plus two buttons) was 769px wide inside a 375px column, and `.console-main` has `overflow-x: hidden`, so it was cut off instead of scrolling. The orders and products list tables clip the same way at 390px. The `1fr` grid and padding items below were real but secondary.

Mobile / compact shell:
- Variants and Inventory tables restack into labelled fields by **card width** (container query), so the same card works on a phone and on an iPad-landscape column beside the sidebar. A scroll fallback covers browsers without container queries.
- List tables (`admin-table`, `pages-table`) scroll inside their card at every width instead of being clipped.
- Every single-column grid uses `minmax(0, 1fr)` (18 places; a test forbids bare `1fr`).
- One padding source: the legacy 68px top padding and the per-page side padding no longer stack on the shell's. Pages (product editor, page editor, preferences, pages hub, media library, brand workspace) reserve dock clearance at the bottom.
- 44px tap targets at <= 900, and at any width on touch (`pointer: coarse`): topbar icons, rail items, buttons, and 16px inputs. This covers iPad landscape.
- `100vh` now has a `100dvh` twin everywhere it is a standalone declaration.
- `shell.js` adds `viewport-fit=cover` so safe-area insets resolve on every page.
- Home "Customize your storefront" panel stacks on phones.

Wide screens (new, needs eyes on the Mac and TV):
- At >= 1600 the page content centers to `--admin-content-max` (1440, then 1760 at >= 2200) with 40px minimum gutters. Bleed pages are untouched.
- The AgentSam side panel grows with `--admin-agent-w`: 400 / 440 / 520.

Dock (`packages/admin-dock`):
- Nav / edit / compose modes in one capsule; the agent is a tab inside it (middle slot), not a separate button. Swipe the capsule down to tuck it away, swipe the handle up (or tap) to bring it back; keyboard lift via `visualViewport`; route scope chips.
- Config has one source: the manifest `dock` block (mirrored in `.agentsam/app.json`, enforced by a test). `scripts/sync-app-frontend.mjs` emits `dock.config.json`. No env vars.
- The agent tab reuses the existing AgentSam drawer; the dock owns no transport or sessions.
- Product editor, page editor and preferences publish save state through `window.publishDockEdit`; their own fixed save bars hide while the dock shows edit mode, and return as the fallback when the dock is tucked away. Discard hides when a page supplies none.
- Full-bleed tool pages (mail, analytics, AgentSam, theme editor, growth, discounts) set `admin-dock-off`, because they own the whole viewport and have not reserved clearance. The topbar sparkle still opens the agent there.
- Scope and `context.dock_scope` are hints; the server still authorizes any resource.

Tests (all Node stdlib, Chrome tests skip cleanly without Chrome):

| Command | Covers |
|---|---|
| `npm run test:admin-dock` | route/scope matching, manifest twin equality, store-neutral config |
| `npm run test:admin-css` | no bare `1fr`, every `100vh` has a `dvh` twin, shared rules defined once, save bars hide under the dock |
| `npm run test:admin-dock:smoke` | dock size contract at 360-900px, hidden above 900 |
| `npm run test:admin-layout` | 9 real admin pages x 6 widths (390-2560): no clipping, one padding source, wide tiers centered |

## 5. Not done yet (polish pass input)

| # | Item | State |
|---|---|---|
| 1 | Verify on a real iPhone and iPad (Safari and standalone): dock over Safari's own bottom bar, scroll feel of list tables, restacked variant cards | TBD |
| 2 | PWA: manifest, icons, `apple-mobile-web-app` meta. Manifest must be on the public allowlist, or linked with `crossorigin="use-credentials"`, because the dashboard is session-gated. Needs real icon PNGs. Standalone removes the Safari bar collision | PROPOSED |
| 3 | Full-bleed pages: decide per page whether to reserve clearance and show the dock (`admin-dock-off` is the safe default) | TBD |
| 4 | List tables (orders, products, pages) as stacked cards on phones, like the variant tables. Needs `data-label` on generated rows | PROPOSED |
| 5 | TV type scale (>= 2200): body >= 16, secondary >= 14. Decide between px to rem conversion and `zoom`; measure first (section 6) | PROPOSED |
| 6 | Wide dashboards beyond centering: stat grids 4 to 6 columns, multi-pane layouts | PROPOSED |
| 7 | Remaining inline-style layouts in page HTML (the home panel was one) found by running the layout test on more pages and data shapes | PROPOSED |
| 8 | Scope chip widen/narrow, and the Review/Undo toast. Blocked on the missing general CMS mutation tool; chat replies must not claim they mutate the page | BLOCKED |
| 9 | Docs drift: `ecommerce-cms-agentsam.md` says the dashboard does not mount `mobile-glass-drawer`, but `shell.js` tags the drawer with `data-nav-package="mobile-glass-drawer"` when `includeMobileDrawer` is true | OBSERVED |
| 10 | Reusability debt: default `NAV` and the "Fuel & Free Time" profile label in `shell.js` are store-specific. The dock avoids this; the shell does not yet | OBSERVED |
| 11 | `npm run agentsam:skills:install-cf` still writes to `.cursor/skills/`, but vendored skills now live in `skills/` (the sync script reads both) | OBSERVED |
| 12 | Dock icon set is small (home, products, orders, menu). Extend as the host needs | PROPOSED |

Decided: the product editor stays single column on iPad portrait. At 744-834px the main column would be under 450px beside a 300px sidebar. It goes two-column from 981px.

Launch-gate items FNF-010 and FNF-018 in the audit ledger remain P0 and are not affected by this work.

## 6. Measure the real wide screens

The TV tier is a guess until measured. On each screen, open the admin and run this in the console, or save it as a bookmarklet:

    alert(innerWidth + " x " + innerHeight + " @" + devicePixelRatio)

Record Mac built-in, Mac plus TV, and the client's iPhone and iPad (portrait and landscape). Replace the "approximate" widths in section 2 with those numbers, then set the 1600 and 2200 boundaries from them.

## 7. Verify

    npm run build:admin:skip
    npm run test:admin-dock
    npm run test:admin-css
    npm run test:admin-dock:smoke
    npm run test:admin-layout
    npm run test:admin-boundary

The two smoke tests need Chrome and skip cleanly without it.
