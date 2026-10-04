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
| phone | <= 639 | iPhone 360-440 | slide-in drawer, 1 column | full width, 16 margin | drawer overlay (orb opens it) |
| tablet portrait | 640-900 | iPad mini 744, iPad 820/834 | slide-in drawer, 1 column | capped 560, centered | drawer overlay |
| tablet landscape / small laptop | 901-1199 | iPad landscape 1024-1194, iPad Pro 13 portrait | persistent rail | none | side dock 360 |
| desktop | 1200-1599 | MacBook default scaled 1280-1512 | rail | none | side dock 380 |
| wide | 1600-2199 | MacBook 16 (1728), 1080p external (1920) | rail, content max-width, multi-column | none | side dock 420 |
| ultra / TV | >= 2200 | 1440p/4K external (2560+), TV | rail, content max-width, larger type | none | side dock 480 |

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

Dock (OBSERVED, enforced by `tests/dock-responsive-smoke.mjs`): bar 64 tall, orb 56, every dock target >= 44, input 16px, margins >= 16, hidden above 900.

## 4. What this branch changed

Mobile pass (OBSERVED in code, verified by reading CSS; not yet seen on a device):
- `product-edit.css`: at <= 980 the grid was `1fr` (= `minmax(auto, 1fr)`), so a wide child could push the track past the screen. Now `minmax(0, 1fr)` plus `min-width: 0` on grid children. `.console-main` has `overflow-x: hidden`, which is why the overflow clipped instead of scrolling. REPORTED symptom, probable cause.
- `console.css`: at <= 900 the legacy `.admin-main` padding (68px top) predates the in-flow topbar and double counted it, and the product editor added its own side padding on top of the shell's. One padding source now (16 + safe area), plus dock clearance at the bottom.
- `console.css`: `.btn` min-height 44 at <= 900 (the Duplicate/View/dashboard chips were `btn ghost small`).
- `shell.js`: adds `viewport-fit=cover` at runtime so `env(safe-area-inset-*)` resolves on every admin page without editing each HTML file.

Dock:
- `packages/admin-dock`: nav / edit / compose modes, detached agent orb, keyboard lift via `visualViewport`, route scope chips.
- Config has one source: the manifest `dock` block (`agentsam.app.json`, mirrored in `.agentsam/app.json`; a test fails if they diverge). `scripts/sync-app-frontend.mjs` emits `dist/assets/admin/dock/dock.config.json` from it. No env vars.
- The orb reuses the existing AgentSam drawer (`sendAgentsamMessage`, `openAgentsamDrawer`). The dock owns no transport or sessions.
- `product-edit.html` publishes its save state to the dock; the sticky save bar hides while the dock shows edit mode.
- Scope and `context.dock_scope` are hints. The server still authorizes any resource (DOM selection never grants edit authority).

Tests: `npm run test:admin-dock` (routing and manifest), `npm run test:admin-dock:smoke` (Chrome, real iframe widths 360-2560).

## 5. Not done yet (polish pass input)

| # | Item | State |
|---|---|---|
| 1 | Verify on a real iPhone and iPad (Safari and standalone): overflow, top gap, dock over Safari's own bottom bar | TBD |
| 2 | PWA: manifest, icons, `apple-mobile-web-app` meta. Manifest must be on the public allowlist, or linked with `crossorigin="use-credentials"`, because the dashboard is session-gated. Standalone removes the Safari bar collision | PROPOSED |
| 3 | Bleed pages (mail, analytics, AgentSam page, theme editor, media library) pad 0 and use full height; the dock overlays their bottom edge. Decide per page: reserve clearance or hide the dock | TBD |
| 4 | Other pages with their own sticky save bars (page editor, theme editor, discounts, preferences) adopt the `admin-dock:edit` contract | PROPOSED |
| 5 | Remaining `100vh` (`admin.css` shell, analytics iframe) to `100dvh` where visible on mobile | PROPOSED |
| 6 | Wide/TV layouts from section 3: content max-widths, stat grids, side-dock widths, TV type scale. Decide between rem conversion and `zoom` for the TV tier | PROPOSED |
| 7 | `pointer: coarse` sizing for iPad landscape (>= 901 gets the rail but is still touch) | PROPOSED |
| 8 | Two-column product editor on iPad portrait (>= 744) | PROPOSED |
| 9 | Scope chip widen/narrow, and the Review/Undo toast. Blocked on the missing general CMS mutation tool; chat replies must not claim they mutate the page | BLOCKED |
| 10 | Docs drift: `ecommerce-cms-agentsam.md` says the dashboard does not mount `mobile-glass-drawer`, but `shell.js` tags the drawer with `data-nav-package="mobile-glass-drawer"` when `includeMobileDrawer` is true | OBSERVED |
| 11 | Reusability debt: default `NAV` and the "Fuel & Free Time" profile label in `shell.js` are store-specific. The dock avoids this; the shell does not yet | OBSERVED |
| 12 | Dock icon set is small (home, products, orders, menu). Extend as the host needs | PROPOSED |

Launch-gate items FNF-010 and FNF-018 in the audit ledger remain P0 and are not affected by this work.

## 6. Measure the real wide screens

The TV tier is a guess until measured. On each screen, open the admin and run this in the console, or save it as a bookmarklet:

    alert(innerWidth + " x " + innerHeight + " @" + devicePixelRatio)

Record Mac built-in, Mac plus TV, and the client's iPhone and iPad (portrait and landscape). Replace the "approximate" widths in section 2 with those numbers, then set the 1600 and 2200 boundaries from them.

## 7. Verify

    npm run build:admin:skip
    npm run test:admin-dock
    npm run test:admin-dock:smoke
    npm run test:admin-boundary

The smoke test needs Chrome and skips cleanly without it.
