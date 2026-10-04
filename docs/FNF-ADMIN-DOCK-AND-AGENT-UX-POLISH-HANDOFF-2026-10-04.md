# Admin dock + in-place agent UX — polish-pass handoff

**Status:** Active handoff (2026-10-04). Written after the dock redesign shipped and was verified on a real iPhone.
**Repo state when written:** `main` @ `6a8820e` (PR #29). Production Worker version `62e29249-29c1-4a7b-a2ba-2980bfb7b8ca`; the version before it was `40212105-f878-47fd-99fc-9a691e37ccae`.
**Scope:** the admin mobile/tablet dock and how the agent behaves inside it. This is the "H" (UI polish) slice of [`FNF-AGENTSAM-PRODUCTIZATION-NORTHSTAR-HANDOFF-2026-09-27.md`](./FNF-AGENTSAM-PRODUCTIZATION-NORTHSTAR-HANDOFF-2026-09-27.md). Everything in its "Agent warnings" section still applies. Sam has explicitly prioritized this UX slice now; do not use that as license to touch commerce integrity (lane A) or CMS cloud-authority (lane B) code.

Companion files:

| File | Role |
| --- | --- |
| [`design/agent-in-place-states.html`](./design/agent-in-place-states.html) | Visual mock of the four agent states below. Open in a browser. |
| [`operating/FNF-RESPONSIVE-SPEC-AND-DOCK-PLAN-2026-10-04.md`](./operating/FNF-RESPONSIVE-SPEC-AND-DOCK-PLAN-2026-10-04.md) | Breakpoints, size contract, what shipped, remaining polish backlog |
| [`operating/FNF-AUDIT-LEDGER-2026-10-01.md`](./operating/FNF-AUDIT-LEDGER-2026-10-01.md) | Launch blockers. FNF-010 and FNF-018 are P0 and outrank this work |
| `packages/admin-dock/README.md` | Dock API, edit-mode contract, gesture behavior |

---

## 1. What Sam wants

- See changes on a real phone, then judge. Ship small, look, adjust. Do not over-engineer before he has felt it.
- Asking the agent to *make something* (a product, a description) must **not** throw him into a full-screen chat. He needs to see the page while the agent works, and review the result in place.
- The agent reply is slow. Make waiting feel alive and find the real cause.
- Clean, minimal, glass. Restraint over options.
- Everything reusable by a stranger who installs the package: config in the app manifest, no hidden env vars, no store-specific strings in published packages.

## 2. Where we are (shipped and live)

- **Dock** (`packages/admin-dock`): one glass capsule, ≤900px. Five tabs from the manifest, AgentSam in the middle. Modes: nav, edit (page save state), compose (agent composer with scope chips). Swipe down to tuck away, handle to restore, session-persistent. Default visible (`dock.startHidden: false` in the manifest).
- **Edit mode:** pages publish save state with `window.publishDockEdit(detail)` (defined in `shell.js`). Product editor, page editor, preferences use it. Their own fixed save bars hide only while the dock is showing.
- **Layout fixes:** variants/inventory tables restack by card width; list tables scroll inside their card; one padding source; 44px targets (also on `pointer: coarse`); `100dvh` twins; wide tiers (content centers at ≥1600).
- **Packaging:** `fnf-theme` is repo-local with a neutral demo site; the F&FT site config lives in `site/fuelnfreetime/`; `npm run check:publish` blocks customer identity from tarballs; `heuristic-theme` is `private`.
- **Tests:** see §7.

## 3. Decisions already made (do not relitigate without Sam)

| Decision | Reason |
| --- | --- |
| The agent is a tab inside the capsule, not a separate button | Sam's explicit direction |
| Dock starts visible; `startHidden` is a manifest switch | Wants to feel it before deciding |
| Dock hidden on full-bleed tool pages (`admin-dock-off`) | They have not reserved clearance |
| iPad portrait product editor stays single column | Main column would be <450px beside the sidebar |
| `fnf` (theme name) may ship; `fuelnfreetime` / customer identity may not | Customer privacy; enforced by `publish-denylist.json` |
| Swipe thresholds (flick 0.5px/ms or >44px) | **Guesses.** Sam has not felt them yet; expect tuning |
| Merging to `main` auto-deploys production | Observed after PR #27 and #29 |

## 4. Target interaction model (see the mock)

The agent has **four states**. Today only "Full chat" exists, and the dock force-opens it after every send (`host.open()` in `packages/admin-dock/src/index.js`). That is the problem to fix.

| State | What the user sees | Enter | Leave |
| --- | --- | --- | --- |
| **Peek card** (new default) | Page stays fully visible. A compact card above the dock: phase text while working ("Reading catalog…"), then the reply (max ~4 lines, "Show more"), plus **Open chat**. | Send from the dock composer or a chip | Swipe down, tap outside, send another, or after a result is acted on |
| **Half sheet** | Page visible in the top ~40%. Conversation and composer in a bottom sheet. | Swipe the peek card up, or tap it | Swipe down (back to peek), drag to top (full chat) |
| **Full chat** | Existing drawer (`#agentsam-drawer`). Owns transport and sessions. | **Only** explicit: "Open chat", topbar sparkle, drag-to-top | Close button |
| **In-place draft** | The agent's proposal appears *in the real page* (e.g. product form fields highlighted). The dock shows edit mode: `Draft, N fields · Undo · Save`. | Agent returns a validated proposal and the page accepts it | Save (normal page save), Undo (revert), or edit manually |

Rules that apply to every state:

- **Never auto-open full chat.** Never auto-save. Never publish from chat. A proposal is a draft until the user saves, and publishing stays an explicit page action.
- One conversation across all states: the peek card, half sheet and drawer all read/write the same thread (`conversation_id` already lives in `static/js/agentsam.js`).
- Reuse the swipe language the dock already has (down to dismiss, up to expand). Keep touch targets ≥44px and inputs 16px.
- Render agent text safely: escape HTML, allow only a tiny markdown subset (paragraphs, lists, bold, code). Never `innerHTML` raw model output.
- Keep the existing a11y behavior: `role="status"` live regions, focus returns to the control that opened a surface, `inert` on hidden surfaces, Escape closes.

## 5. Verified backend facts (2026-10-04)

- **Chat is one non-streaming call.** `agentsamChat` in `backend/admin/agentsam.js` awaits a single `env.AGENTSAM_WAI.run(...)` via `backend/agentsam/ai-run.js`. Models come from a D1-backed registry with a **sequential fallback chain**, so a failing first model adds a full round trip before the next. The response includes `attempted_models` and `routing`, so you can measure which model answered and how many failed. The client shows "Thinking…" until the whole reply returns.
- **The agent cannot make anything yet.** `backend/agentsam/tool-handlers.js` implements one handler (`fnf_semantic_search` / `vectorize`); every other tool returns `handler_not_implemented`. The tool catalog exists in D1 (`tools-registry.js`) but has no write handlers. The UI refinement contract in `docs/PIPELINE-OWNERSHIP.md` already says chat replies alone must not claim to mutate the page.
- **Product Studio is the right landing zone for "make a product".** `backend/admin/product-studio.js`: `POST /api/admin/product-studio/drafts`, then design, render, `createProductFromDraft`, `publishDraft`. It validates (retail price > 0, artwork attached, storefront image before publish) and uses idempotency keys (`product-studio:<id>:v<n>:...`). Plain product edits go through `PUT /api/admin/products/:id`.
- **Resource authority is server-side.** `backend/agentsam/selected-resource.js` resolves selected resources against D1. The client's scope (`context.dock_scope`) is a hint only; DOM selection never grants edit authority.
- **Client plumbing:** `sendAgentsamMessage(text, { context })` returns the response data (`reply`, `routing`, `conversation_id`) and appends to the drawer's message list; `window.__agentsamPageContext` / `setAgentsamPageContext` let a page add context. The dock calls these through host bindings in `shell.js` (`mountShellDock`).

## 6. Work plan

Do these in order. Each phase is its own PR, small, with tests. Stop after each so Sam can try it on his phone.

### P1 — Peek card; stop auto-opening full chat (frontend only)

- Dock: after a send, show the peek card (new element in `packages/admin-dock`, styled in `dock.css`). Remove `host.open()` from the success path. Add a host binding for "open chat" (`host.open` stays, used only by the **Open chat** button).
- The dock needs the reply text: `host.send` should resolve with the response data (the shell binding already returns the promise from `sendAgentsamMessage`). Handle: pending, success, agent busy, agent not loaded, network error. Errors show in the card, not the console.
- Dim the page ~6% while the composer is open, so the scope chip and chips don't fight page content.
- Reply formatting per §4 (safe, ≤4 lines, "Show more").
- **Acceptance:** sending never opens the drawer; **Open chat** opens it with the same thread; swipe down dismisses the card; compose, edit and nav modes still pass; extend `tests/dock-responsive-smoke.mjs` to cover the card at 360–900px (size contract, no overlap with the capsule, dismissal gesture, safe rendering of a reply containing `<script>`/HTML).

### P2 — Make waiting alive and find the latency

- First, **measure**: log `attempted_models` and total time for a few real prompts. Report the numbers to Sam before changing anything.
- Add streaming status (SSE or chunked JSON) on the chat route: phase events ("routing", "reading context", "drafting") then the reply. Keep the existing non-streaming response for current clients (`agentsam.js` drawer) until the drawer is migrated.
- Candidate fixes, in order of safety: try the cheaper/faster model first for routing/chips; run independent context fetches in parallel; avoid a fallback retry on errors that will repeat.
- **Acceptance:** the peek card shows a phase within ~1s; the drawer still works unchanged; a test stubs the stream; the P2 PR description includes before/after timings.

### P3 — Proposals that fill the real page (needs a backend handler)

- Contract (write it as a JSON Schema in a new `apps/ecommerce-cms-agentsam/contracts/` folder, the layout the north-star handoff names, plus a section in `docs/RUNTIME-CONTRACTS-AGENTSAM.md`; reuse the structured-CMS-operation flow described in `docs/PIPELINE-OWNERSHIP.md`): the agent returns `{ operation_id, resource: { type, id }, changes: [{ field, from, to }], summary }`. The **server** validates and authorizes the resource (use `selected-resource.js`), and rejects fields the page does not accept.
- Page side: a small registry (`window.agentsamPage.register({ resource, fields, apply(changes), revert() })`) so each page declares what it accepts. The dock must not know page internals.
- First target: `product-edit`. Highlight changed fields, set the page dirty, publish edit-mode state (`Draft, N fields`, Undo, Save). "Make a new product" should create a **Product Studio draft** (never an active product) and navigate to it.
- Add a real tool handler in `tool-handlers.js` (register in the D1 tool catalog through a migration file, never ad-hoc SQL). Use idempotency keys like Product Studio does.
- **Acceptance:** nothing is saved or published without the user pressing Save; Undo restores exact prior values; invalid proposals are rejected server-side with `{ "error": "..." }`; contract tests plus a layout test showing highlighted fields don't clip at 390px.

### P4 — Polish bucket (any order, small PRs)

Unify quick actions (manifest `dock.scopes` chips vs `buildAgentsamUiConfig` in `quick-actions.js`: one source). Rename "AgentSam Side Assistant" to "AgentSam" on mobile. List tables as stacked cards on phones (needs `data-label` on generated rows). Decide the dock on full-bleed pages. PWA manifest and icons (manifest must be on the public allowlist or linked with `crossorigin="use-credentials"`). TV type scale after Sam measures his screens. See the responsive spec §5 for the full list.

## 7. How to verify

```bash
npm run build:admin:skip        # assemble dist/assets (fast)
npm run test:admin-dock         # routing, manifest twins, startHidden
npm run test:admin-css          # no bare 1fr, 100dvh twins, save bars fall back when dock tucked away
npm run test:admin-dock:smoke   # Chrome: dock size contract + real pointer gestures, 360-900px
npm run test:admin-layout       # Chrome: 9 real admin pages x 6 widths, no clipping
npm run test:publish-denylist   # tarball identity checks
npm run test:admin-boundary
npm run check:publish
```

Headless Chrome cannot tell you how a gesture *feels*. After each phase, give Sam a short list of exact things to try on his phone and wait for his reaction before the next phase.

## 8. Guardrails

- **Sam's working rules:** patches over rewrites; **no `.bak` files or backup folders** (git is the backup); scripts are stdlib-only; never hardcode IDs; DB writes on non-critical paths are non-fatal; config lives in the app manifest, never env-var overrides; anything reusable must work for a stranger who installs the package.
- **Portability:** no new `Fuel*`/store-named implementation files; customer data stays declarative under `site/<customer>/`. Do not add store-specific strings to `packages/*`; `npm run check:publish` must pass.
- **Manifests:** `agentsam.app.json` and `.agentsam/app.json` carry identical `dock` blocks (a test enforces it).
- **Never edit `dist/assets`.** It is generated. Source is `apps/ecommerce-cms-agentsam/frontend/` and `packages/`.
- **Do not publish any package** to npm. Do not commit zips, extracted archives, or colon-named files.
- **Do not widen scope into** Completeful/Stripe/checkout (lane A), CMS storage (lane B), or Local Studio/Tauri.
- Follow the PR checklist in `AGENTS.md`.

## 9. Ship and rollback

Merging a PR to `main` triggers a **production** deploy (about 80 seconds). So: open the PR, run the tests, and merge only when Sam says to. After merging, confirm with `wrangler deployments list` (via `./scripts/with-cf-admin-env.sh`) and `curl` (`/` is 200, `/admin/login` is 200, `/admin/home` redirects to login). Roll back with `./scripts/with-cf-admin-env.sh npx wrangler rollback <version-id>`, using the "previous version" id recorded before the merge. Someone else may also be deploying: check `deployments list` first and tell Sam if a deploy appeared that you didn't make.

## 10. Open questions for Sam (ask, don't guess)

1. Peek card default height and whether it auto-dismisses after N seconds or only on swipe.
2. Should "make a new product" go straight to a Product Studio draft, or ask a clarifying question first (color, price)?
3. Swipe feel after real use: too eager, too stiff?
4. Which pages should the dock appear on if bleed pages get clearance?

## 11. Paste-ready prompt for the next agent

> You're continuing the Fuel & Free Time admin dock and agent UX polish. Read `AGENTS.md`, then `docs/FNF-ADMIN-DOCK-AND-AGENT-UX-POLISH-HANDOFF-2026-10-04.md` (and open `docs/design/agent-in-place-states.html`). Start with **P1** only: stop the dock from auto-opening full-screen chat; show the reply in a peek card above the dock; keep one shared conversation. Work on a new branch, patch existing files rather than rewriting, keep all config in the app manifest, and add tests. Run the commands in §7 before opening a PR. Do not merge or deploy; Sam merges. When done, give Sam a short list of what to try on his phone.
