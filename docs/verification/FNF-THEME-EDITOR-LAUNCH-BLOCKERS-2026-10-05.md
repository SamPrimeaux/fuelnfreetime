# FNF Theme Editor: verified merchant launch blockers

Repository: SamPrimeaux/fuelnfreetime
Application owner: feat/theme-studio-universal-v1
QA owner: test/fnf-theme-merchant-acceptance-20261005
Baseline: main b589a22 and the three uncommitted Theme Studio WIP files.

## Product goal

A nontechnical merchant must be able to select the real theme, edit Header / Template / Footer, add and reorder a supported section or block, select real products/media, preview without altering live data, save and reload a draft, publish deliberately, and recover a previous version. Keep the existing editor design and CMS authority. No new editor or parallel theme database.

Require visible proof + persistence proof + regression proof.

## Verified foundation

- The current Theme Editor has a 3-pane shell, page selector, sections, blocks, generated inspector, media/resource controls, iframe preview, draft/save/publish buttons, selection, and section/block mutation APIs.
- D1 holds page and section identities, state/order/version. R2 holds draft and published bodies/history. The API has optimistic expected_version conflicts.
- 21 existing CMS/editor/storefront contract tests passed on the inspected Theme Studio worktree. These are not merchant acceptance tests.

## P0 blockers from actual repo

1. Initially no Header/Footer groups in Theme Editor. During this audit, the Theme Studio owner wired both site and page documents into the existing editor. Current desktop fixture browser test now shows Header / Template / Footer (visible checkpoint only; persistence/publish still unproved).
2. Initially no visual-theme selector. During this audit the Theme Studio owner added visible Heuristic / Revise / FNF choices. This passes the visibility gate but does NOT yet prove each choice renders genuine package implementations or deploys truthfully.
3. No proven three-renderer implementation. Revise is a declared/installed npm package dependency, but current alternate-preview runtime generates hand-authored preview HTML from a few generic render functions. FNF also has a package candidate. Those preview stand-ins have not been proved equivalent to package-native live rendering.
4. Theme Studio now presents a per-theme searchable Add Section catalog, but its entries are currently hardcoded in theme-preview-runtime.js and funnel through a few generic templateKey handlers rather than validated theme-specific renderers.
5. Shop registry advertises Newsletter, but the current Shop storefront HTML has only Hero, Collections, and Stories section anchors. Its CMS hydration clones known templates; a missing template is skipped.
6. About and Community lack full CMS section wrappers for advertised sections. Some text slots can hydrate, but section-level add/reorder/hide/preview selection cannot be assumed functional.
7. Shop contains unregistered static catalog/editorial sections even though merchants reasonably expect their positions/settings to be editable.
8. Backend updateSection accepts content objects without comprehensive server-side field, type, range, block-count, resource-reference, and safe HTML/URL schema validation.
9. At <=900px CSS hides the entire section tree. Actual Chrome at 744px showed treeVisible=false with no replacement section controls.
10. Product, collection and alternate template assignment are missing merchant-facing editor concepts. The PAGE_REGISTRY currently has site/home/shop/about/community/collaborate/policies/terms.
11. Theme install/draft/live/rollback and global theme settings have not been proven end to end.
12. The standard 9-page responsive smoke does not include Theme Editor.

## Independent QA evidence

- Browser smoke launched actual Theme Editor frontend JS in Chrome against CMS fixture API, on main and the Theme Studio worktree.
- PASS: Shop loads, sections and Hero inspector show, Add Section / Save draft / Publish / preview iframe exist.
- Initial baseline: Header, Footer and three-theme selector were absent. New concurrent Theme Studio changes now make those groups and choices VISIBLE on desktop, but persistence and real renderer parity remain unproved.
- At 744px on the latest WIP: tree is hidden; no full-document horizontal clipping, but Add Section is inaccessible.
- Renderer parity test: Shop, About and Community fail; Collaborate, Policies and Terms pass for static section marker coverage.
- Home uses a separate page composer, covered by other existing alignment tests.
- The new preset semantic test confirms advertised Revise/FNF variants collapse onto generic preview layouts; compare fixture content across advertised presets.
- These fixture tests do NOT claim real storefront pixel accuracy or real D1/R2 publish persistence.

## Gate A — first visible merchant checkpoint (Theme Studio owner)

1. Load both global site CMS document and selected page/template CMS document into existing theme-editor.js.
2. Render one grouped left tree: Header / Template / Footer. Use original section IDs and document scopes.
3. Select global or page sections and blocks in the same inspector. Save global edits to site and page edits to the page.
4. Send both siteSections and sections in live preview messages, using the existing storefront's supported message contracts.
5. Edit logo/header style/announcement/navigation/footer links, save/reload, verify persistence, publish once, verify global changes across two public pages.

## Gate B — renderer and catalog parity

1. A theme exposes only sections it can render; never offer an unrenderable preset.
2. Fix Shop Newsletter parity and make Shop product/editorial sections intentionally editable where promised.
3. Give About/Community true section wrappers, not only text slots. Preserve existing storefront appearance.
4. Prove add, duplicate, reorder, hide, nested block edit, save/reload, preview, and public publish on each supported page.
5. Avoid rewriting the whole site or creating a parallel page composer. Use adapters where pages currently differ.

## Gate C — genuine theme switching

1. Audit installed theme manifests and renderer availability, then expose only actual renderable choices.
2. Preview Heuristic, Revise and FNF with identical merchant content once their adapters exist. Switching must not mutate live customer state.
3. Add Section must use current theme's supported, allowed catalog. Clearly explain incompatible sections.

## Gate D — server and publication truth

1. Enforce schema field types, whitelists, ranges, block constraints, rich-text/URL sanitization, and resource identity at server boundaries.
2. Keep drafts distinct from published snapshots. Support publish, previous-version restore, and recoverable write failure within existing D1/R2/KV authorities.
3. Test stale tab 409, failed media, invalid values, lost network and rollback.
4. Make Save / Publish / changed-state truthful, with no fake metrics or silent success.

## Gate E — accessible, calm merchant interface

1. Preserve the current 3-pane desktop editor, preview and inspector.
2. At 390/744px supply a reachable section navigator/drawer rather than hiding the tree.
3. After renderer parity, enhance Add Section with searchable visual choices; surface native product, collection, menu and media pickers.
4. Add keyboard reorder/selection, focus management, meaningful errors, undo/revert and clear empty/loading states.
5. QA matrix: 390/744/1024/1440/1920/2560px plus expanded/collapsed admin nav.

## Full launch acceptance journey

With a fresh user fixture and real product/media/collection:
- Open Online Store -> Customize, view Header / current template / Footer.
- Edit header nav and footer; verify global effects across Shop and Home.
- Edit Hero, add one real section, add/reorder a block, hide/show another.
- Select actual media/product/collection; no dangling URLs or pretend resources.
- Save and reload; all changes survive, storefront still unchanged.
- Preview at desktop/tablet/mobile and preview installed themes without mutation.
- Publish and see same result on live storefront and fresh browser.
- Restore previous published version without corrupting commerce data.
- Validate errors: stale tab, invalid section config, failed upload/network.
- Final assertion: user does not need developer assistance or schema knowledge.

## Ownership

App changes only in feat/theme-studio-universal-v1, after any necessary handoff.
QA changes only tests/launch and docs/verification.
store-theme-library-v1 remains reference-only and DO NOT MERGE.
Production Repair PR #32 and Merch lane remain independent.

## Concurrent WIP checkpoint update

As the audit ran, the Theme Studio owner modified the actual editor and preview assets (without any QA-branch edits to their worktree). The updated desktop Chrome fixture passes grouped Header / Template / Footer and visible Heuristic / Revise / FNF choices. This is good visible progress, but not the final merchant gate. Alternate-preview HTML is currently assembled by browser-side JS and maps many distinct advertised presets to the same handful of visual implementations. The 744px section tree remains hidden. Continue requiring real renderer equivalence, save/reload, publish, recovery and live data evidence.
