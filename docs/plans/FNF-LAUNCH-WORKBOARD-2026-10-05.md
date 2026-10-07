# Fuel & Free Time — Launch Workboard

Date: 2026-10-05
Authority repo: `SamPrimeaux/fuelnfreetime`
Baseline: `origin/main @ b589a22`

## Mission

Ship the customer product this month by finishing and proving the existing product. Do not create a replacement CMS, dashboard, editor, storefront, or persistence architecture unless a failing acceptance test proves the existing contract cannot support the required behavior.

Governing sequence:

**preserve → repair → connect → polish → prove → package**

Every implementation lane must end in something a human can visibly inspect in the existing product. Architecture-only progress does not count as launch progress.

## Branch policy

1. One product surface has one code owner branch at a time.
2. Agents may read any lane, but must not edit another lane's owned files without a written handoff.
3. Before editing, run `git status -sb`, `git diff --name-only origin/main...HEAD`, and `git worktree list`.
4. Do not create a new persistence model, editor route, theme workspace, or package to bypass an unfinished existing one.
5. New reusable extraction happens only after the FNF implementation is proven.
6. Each lane must keep a demo checkpoint, focused tests, and a short handoff note.
7. `node_modules`, build output, and generated caches are never ownership conflicts.

## Current lane map

### Lane A — Production Repair

Branch: `fix/fnf-production-polish-20261005`
Worktree: `/Users/samprimeaux/fuelnfreetime-production-polish`
PR: #32

Purpose: repair broken production/admin behavior without redesigning the product.

Owned files/surfaces:
- `apps/ecommerce-cms-agentsam/frontend/static/js/brand-workspace.js`
- `apps/ecommerce-cms-agentsam/backend/completeful/images.js`
- focused Brand/catalog tests
- future small broken-screen fixes only when they do not touch Theme Studio or Product Studio ownership

Current proof:
- Brand workspace loading repaired.
- Completeful catalog image width transformations repaired.
- focused tests pass.
- admin frontend build/assembly and responsive smoke previously passed.

Visible checkpoint:
- `/admin/brand` loads real data instead of the unavailable state.
- catalog/media surfaces use actual requested image derivatives.

### Lane B — Theme Studio / CMS UX

Branch: `feat/theme-studio-universal-v1`
Worktree: `/Users/samprimeaux/fuelnfreetime-theme-studio-v1`

Purpose: make the existing Theme Editor a merchant-usable CMS/theme editor.

Exclusive ownership while active:
- `apps/ecommerce-cms-agentsam/backend/cms/registry.js`
- `apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js`
- `apps/ecommerce-cms-agentsam/frontend/static/css/theme-editor.css`
- Theme Studio-specific CMS tests
- `packages/heuristic-theme/storefront/js/store-shell.js`
- `packages/heuristic-theme/storefront/js/global-footer.js`
- `packages/heuristic-theme/storefront/js/cms-hydrate.js`
- visual preview adapters/assets for installed themes

Required visible checkpoint 1:
- `/admin/theme-editor?slug=shop` left tree renders:
  - Header
  - page/template sections
  - Footer
- Header and Footer open in the same inspector as normal sections.
- Header exposes logo, announcement, style, and repeatable navigation blocks.
- Footer exposes brand, navigation/support, social/newsletter, and bottom fields.

Required visible checkpoint 2:
- center preview can visibly switch among the real installed visual systems:
  - Heuristic
  - Revise
  - FNF
- switching visual preview must not publish or overwrite customer content.
- the same customer page content is used as input to each visual system.

Required visible checkpoint 3:
- Add section is fed by the current theme's real section/preset catalog.
- existing page section operations remain: edit, add, reorder, hide/show, duplicate/remove when allowed, blocks, responsive preview, save draft.

Hard boundary:
- no new CMS database family
- no second theme editor
- no `/theme-workspace` replacement
- no `store_theme_pages`
- no separate customer-content authority

### Lane C — Product Studio / Merch Pipeline

Branch: `feat/product-studio-merch-pipeline-2026-10-03`
Worktree: `/Users/samprimeaux/fuelnfreetime-merch-pipeline`

Purpose: finish real artwork → prepared derivative → manufacturing/provider workflow.

Exclusive ownership while active:
- `apps/ecommerce-cms-agentsam/frontend/src/pages/products/ProductStudioPage.tsx`
- `apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx`
- Product Studio API additions in `frontend/src/lib/api.ts`
- `apps/ecommerce-cms-agentsam/backend/admin/media.js`
- `lib/assets/classify.js`
- `lib/assets/worker-hook.js`
- `packages/agentsam-merch/**`
- Product Studio/derivative tests

Required visible checkpoint:
- selected product + print area + original artwork are obvious.
- original/master is preserved.
- preparation is explicit and opt-in.
- prepared/manufacturing/mockup derivatives have visible lineage.
- provider requirements and preflight failures are understandable to a non-developer.
- no provider write occurs without an explicit user action.

### Lane D — Launch Proof / QA

Branch naming: `test/fnf-launch-acceptance-*`
No product implementation ownership.

Purpose: continuously prove that the other lanes result in a launchable customer product.

May edit only:
- `tests/launch/**`
- dedicated Playwright/smoke specs
- `docs/verification/**`
- screenshot/golden fixtures if required

Must not edit application implementation to make a test pass.

Acceptance matrix:
- widths: 390, 744, 1024, 1440, 1920, 2560
- authenticated admin navigation
- Brand
- Content/media
- Online Store
- Theme Editor
- Product Studio
- Orders/products/inventory basic reads
- AgentSam dock/composer shell
- public `/`, `/shop`, `/about`, `/community`, `/collaborate`, `/policies`, `/terms`

Each failure is assigned back to exactly one implementation lane.

## A[jwoned / reference-only lane

Branch: `feat/store-theme-library-v1`
Worktree: `/Users/samprimeaux/fuelnfreetime-theme-library-v1`

Status: **DO NOT MERGE AS A BRANCH.**

Reason: it introduced a parallel theme persistence/workspace architecture (`store_themes`, `store_theme_pages`, `/theme-workspace`) after the product already had CMS/theme/editor authorities. It may be mined selectively for tests, UI details, or a small bug fix only after the receiving lane explicitly chooses the code.

No agent should continue implementation in this worktree.

## Current overlap audit

Tracked implementation overlap among the active modern lanes is currently zero:

- Production Repair ↔ Theme Studio: 0 files
- Production Repair ↔ Merch Pipeline: 0 files
- Theme Studio ↔ Merch Pipeline: 0 files

The only reported Theme Library ↔ Merch overlap was an untracked `node_modules` entry, which is not product code.

This clean separation is intentional. Preserve it.

## Merge order

1. **Production Repair / PR #32** — independent, small, currently mergeable.
2. Rebase Theme Studio and Merch Pipeline on the resulting `main`.
3. Theme Studio and Merch Pipeline may continue in parallel because their owned files do not overlap.
4. Launch Proof runs continuously against each branch and again after each merge.
5. Merge Theme Studio only after its visible editor checkpoints pass.
6. Merge Merch Pipeline only after its visible Product Studio checkpoint passes.
7. Run a final integrated launch acceptance pass on `main`.
8. Only then extract/refine reusable packages.

## Definition of done: Theme Studio

A non-developer customer can:
1. open Online Store / Theme Editor;
2. understand Header, page Sections, and Footer from the left tree;
3. click any one and edit understandable fields/blocks;
4. switch desktop/tablet/mobile preview;
5. preview Heuristic, Revise, and FNF visually;
6. add/reorder/hide supported sections;
7. save a draft and reload without losing it;
8. publish intentionally;
9. see the published result on the public site;
10. make another edit without needing a developer.

Anything short of this is unfinished.

## Definition of done: launch work

For every claimed feature we require all three:

**visible proof + persistence proof + regression proof**

- Visible proof: user can see/use it in the existing product.
- Persistence proof: reload/new session retains the intended saved state.
- Regression proof: focused tests + relevant smoke coverage pass.

A package, migration, contract, test, or screenshot by itself is not a finished customer feature.

## Agent handoff template

Every agent ends its turn with:

- Branch / worktree
- Exact files changed
- What is visibly different
- URL/route to inspect
- Tests run + result
- What remains
- Any blocked dependency
- Explicit list of files the next agent must NOT edit concurrently

No agent should hand off with only “architecture completed” or “contracts added.”
