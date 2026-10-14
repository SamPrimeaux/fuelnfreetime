# Product Quality, Acceptance and Release Contract

**Status: ADOPTED AS REPOSITORY POLICY, IMPLEMENTATION GATES NOT YET AUTOMATED · 2026-10-14**
**Scope:** reusable `apps/ecommerce-cms-agentsam`, its FuelNFreetime installation, storefront, admin shell/dock, CMS/Theme Editor, Product Studio, Media Library, AgentSam, app integrations, SDK consumption, schemas and provider adapters.

> **A green build, merged PR, registered component or passing scripted test is not product acceptance.** If the delivered screen is visibly wrong, an interaction does not complete its real workflow, or production still serves the defect, it is **NOT DONE**. No agent may promote a change to accepted simply by adding weaker tests that pass.

This policy complements—not replaces—[ARCHITECTURE-AUTHORITY.md](../ARCHITECTURE-AUTHORITY.md), the [runtime contracts](../RUNTIME-CONTRACTS-AGENTSAM.md), [Completeful contract](../RUNTIME-CONTRACTS-COMPLETEFUL.md), and the [tool-infrastructure recovery TODO](../AGENTSAM-TOOL-INFRASTRUCTURE-RECOVERY-TODO-2026-10-14.md). Canonical packages, D1 tables, original source assets and existing production behavior are preserved.

## 1. Quality is the product outcome, not the test report

Acceptance requires **all applicable lanes**:

| Lane | Required proof | Not sufficient |
| --- | --- | --- |
| **Source/ownership** | Correct canonical package, route, schema, permissions and existing consumer paths; no duplicate implementation | Typechecking, file presence, refactor size |
| **Functional interaction** | Real user completes the named task, including failure and recovery; data survives save, navigation and fresh reload | Handler mock returns `ok: true`; button click fires |
| **Visual craft** | Rendered evidence at required devices, compared against the agreed reference and original composition; actual inspection of typography, imagery, sizing and controls | DOM selector exists, screenshot file generated, zero horizontal overflow |
| **Responsive usability** | Touch, scrolling, safe areas, overlay/dock behavior, correct preview viewport and readable controls; real iPhone check for high-impact mobile work when available | Desktop Chrome resized to 390px as sole evidence |
| **Integration/security** | Real auth, tenant isolation, provider state, tool permissions, DB/R2 consistency, approvals and no unapproved side effects | Unscoped unit fixture, registered `is_active=1` |
| **Deployment** | Exact commit → built artifact → Worker/asset hash → authenticated production or staging browser acceptance; post-deploy smoke | CI completed, GitHub main updated, Worker deployed without served-artifact proof |

Tests remain necessary. They do not override obvious broken user-visible behavior or a prior failed merchant report.

## 2. Truthful completion states

Use **exactly one** primary outcome for each change/feature:

- **DESIGNED** — contract/mockup specified; behavior not implemented.
- **IMPLEMENTED / UNVERIFIED** — code exists and scoped automated checks may pass; no live end-to-end or visual acceptance.
- **VERIFIED IN STAGING** — real scoped browser and persistence tests passed, with evidence.
- **ACCEPTED IN PRODUCTION** — matching deployed build confirmed; real target-device/viewport behavior and workflow accepted.
- **BLOCKED / FAILED** — required verification cannot run or a defect remains; do not substitute other tests to mark complete.

`MERGED`, `DEPLOYED` and `TESTS PASS` are **events**, not completion states. A blocked browser, inaccessible provider or inability to capture a screenshot means *unverified*, never *passed*. Any regression reopens the related acceptance gate.

The user/merchant supplies product direction, references and explicit authorization where required. **The implementing agent owns reproducing, investigating, repairing, testing and writing the evidence**, not the merchant. An agent must not ask the merchant to repeatedly identify the same defect.

## 3. Defect-first change discipline

1. **Capture the reported failure as an acceptance criterion.** Record the user's exact symptom, affected route/component, viewport/device, expected visual/behavioral outcome, known reference image and original source owner. Screenshots from the merchant outrank a synthetic pass report about the same defect.
2. **Reproduce first** against the current served build, with authenticated session where applicable. Record build hash, target device and whether the issue also occurs in staging/local. If blocked, say why; do not infer success.
3. **Locate the owning cause** (layout, state, inspector, CMS persistence, asset mapping, tools/runtime, etc.). Repair the owner; avoid stacking CSS patches, substitute UIs or parallel schema copies.
4. **Protect previously correct behavior** and originals. Perform before/after review of affected routes and global shell components, mobile dock, header/footer and donor sections. Do not restyle untouched merchant designs just to make a test pass.
5. **Run focused tests + real interaction + inspect images manually**, then deploy through the existing approved pipeline and verify the served result.
6. **Close with a receipt** that explicitly links the reported defect to demonstrated evidence. Reopen whenever the merchant shows it remains visible.

A user-supplied screenshot showing a regression is a **failed visual acceptance**, even if an existing automated screenshot comparison passes.

## 4. Mobile-first visual acceptance matrix

For **new or changed UI**, test the affected view **at least** at 360 or 390px (primary iPhone), 430px (large phone), 744/834px (tablet), and 1280/1440px (desktop). Include 320px for minimum-width resilience and 900px where editor/tablet split layouts change. If target reference explicitly includes 360/390/430/744/834/900, verify each named width. Record **viewport height and device pixel ratio**, not width alone. Do not equate an emulator with a real device.

Inspect each relevant **state**, not just initial load: empty/loading/error, selected block, long scrolling page, editor canvas with inspector, modal/popover, miniAgentSam expanded and collapsed, pending save, fresh reload, draft preview, and published result.

**Required human-visible checks** (manual or reliable visual-review tooling; automated measurements support but do not replace judgment):

- **Viewport ownership:** no bottom dead gap, phantom extra scroll, cropped canvas, double scroll area, unexpected `100dvh` vs JavaScript height conflict, or safe-area padding mismatch. Theme Editor preview uses available space after *actual* shell/header/dock dimensions rather than mixing independent viewport calculations.
- **Mobile dock:** always preserved, touch-accessible and not obscuring edit controls; safe-area inset respected; keyboard/composer and inspector transitions do not trap or hide content.
- **One-pane editing:** mobile Sections / Preview / Inspector navigate cleanly while preserving the selected element; visible preview/edit flow; no permanent slide-over blocking the canvas. A selected CTA exposes button/link controls, text exposes text controls, media exposes media controls. No irrelevant inspector tabs.
- **Composition:** real product/mockup proportions and views, media fit and crop, typography hierarchy, spacing rhythm, alignment, brand tokens, icon fidelity, backgrounds, motion and source-preserved authored layout compared to approved design/reference.
- **Accessibility/usability:** readable contrast, accessible names, focus order, keyboard navigation, adequate touch target spacing and no accidental destructive actions.
- **State truth:** screen displays actual persisted data and truthful draft/live/provider state; no false “saved,” “connected,” “published” or “all changes saved” indicators.

Capture both **before and after** full-page/viewport images where feasible. Review actual images: a file existing on disk proves nothing. Annotate deviations and explicitly judge whether the visual result matches the intended product. Provide a short screen recording for motion/selection/dock defects when screenshots do not capture them.

**Release blocker examples:** recurring editor bottom gap; preview incorrectly sized on iPhone; overlapping product/card imagery; inability to see/select/edit a component; mockup wrong garment silhouette/back view; broken miniAgentSam composer; disconnected Completeful images disguised as connected; save claimed without persistence. Do not downgrade these to “polish” to ship.

## 5. Functional acceptance must follow the real customer journey

For CMS/theme work, demonstrate **select → contextual inspector → change → draft dirty state → save → leave/reload → authenticate → draft preview → approved test publication → live render → reset/inheritance**. For imported/legacy/custom HTML, test a previously unfamiliar section, nested blocks and actual text/media/link/style control; *field presence is not editability proof*.

For Product Studio and media, demonstrate **provider catalog selection → correct mockup geometry and color/placement → original/derivative provenance → storage (R2 + D1) → reload → preflight → product draft → handoff to product editor**, including failed provider or missing stock image. Never use placeholder success to mask unavailable images or network failures.

For AgentSam, demonstrate **actual context → correct tool discovery → scoped authorization → execution through real handler → typed result → trace and error handling → persisted side effect only when approved**. Test a failed/denied flow, not just success.

For commerce/fulfillment, prove payment/order authority, authorization, idempotency, provider handoff and tracking against controlled staging fixtures. **Never submit a live paid/manufacturing order merely to smoke-test.**

## 6. Four distinct operation types (do not conflate)

| Type | Where it belongs | Model-callable? |
| --- | --- | --- |
| **Agent reasoning** — interpreting intent, deciding what to ask next | Assistant planner/model | **No tool necessary** for basic reasoning |
| **Declarative workflow step** — `fnf.capture_intent`, phase labels, conditional planning | Workflow definition/orchestrator | **Not a tool** unless a real executable handler explicitly exists |
| **Application/provider operation** — provider order submission, sync jobs, payment settlement, internal publish pipeline | Commerce/CMS/fulfillment backend and adapter | **Not by default**. Backend APIs do not automatically become AgentSam tools |
| **Merchant-relevant AgentSam tool** — inspect an order, list media, propose draft edit, explicitly approved publish action | Canonical AgentSam capability/registry + executor | **Yes only** with real implementation, typed input/output, meaningful user purpose, permission, tenant scope, side-effect control and runtime proof |

Tool registration must state *why the merchant needs agent invocation*, not simply mirror an endpoint. If unnecessary, classify as internal and remove from model discovery **after** preserving current callers and migration compatibility. A tool marked active but missing a handler must **not appear executable**. `is_degraded` may document status but cannot grant callability.

**Current read-only audit example (2026-10-14):** production D1 has 35 tools; nine `completeful_*` registrations (all `is_active=1`); five of nine are degraded/nonexecutable in the AgentSam adapter: `completeful_design_create`, `completeful_order_create`, `completeful_order_quote`, `completeful_product_publish`, `completeful_product_sync`. The four catalog tools have matching adapters, *not yet certified live execution*. There is one `agentsam_*` registration: `agentsam_github_repo_list`. These are **observed registration/implementation states, not declarations that every tool is broken**.

**`completeful_order_create` specifically:** registry operation `order.create`, high risk, approval+confirmation required, unrestricted object input schema and empty output schema, degraded/not callable. The business operation belongs in protected, idempotent **fulfillment order submission** against a paid, validated local order; it is **not inherently a general-purpose AI tool**. Keep customer order authority in our commerce DB and Completeful as fulfillment provider. Do not change production data or remove registrations until caller audit, migration and approval.

## 7. Release gates (blocking, cumulative)

| Gate | Before it passes |
| --- | --- |
| **G0 — Scope & reference** | User-reported defect and accepted visual/product target documented; correct source owner identified |
| **G1 — Code integrity** | Tests/build/type/lint, package authority, no duplicated contracts, schema/scopes/permission changes reviewed |
| **G2 — Real functional proof** | Authenticated real interaction and durable save/reload; critical failure paths; no invented tool success |
| **G3 — Visual/mobile acceptance** | Target viewport matrix, screenshots inspected against agreed reference, user-visible regressions eliminated |
| **G4 — Cross-system proof** | SDK/app/provider/D1/R2/auth/policy compatibility and real tenant-resource behavior |
| **G5 — Served release proof** | Commit and asset hashes, staged preview first, approved deploy, served production verification; production content untouched without approval |
| **G6 — Repository closeout** | Reviewed commit(s), `main` inclusion, evidence, unresolved blockers and safe worktree/branch cleanup |

**Fail-closed rule:** If any applicable gate is blocked, mark `BLOCKED / FAILED`; if not yet run, mark `IMPLEMENTED / UNVERIFIED`. Never fabricate a screenshot, claim real iPhone testing from a desktop emulator, use a stale local checkout as production truth, or conclude success from an HTTP 200 alone.

Manual design judgment remains required for creative/UI changes. A future CI check should validate that the receipt and artifacts exist and that machine-checkable failures block the merge; CI **must not automatically certify aesthetic quality**.

## 8. Mandatory change receipt (write for each substantial change)

Store a markdown receipt under `docs/verification/` (follow existing convention) or attach it to the PR; link external artifacts. Never include secrets, tokens, personal data, unredacted merchant/customer records.

```md
# Acceptance receipt — <feature and date>
Status: DESIGNED | IMPLEMENTED / UNVERIFIED | VERIFIED IN STAGING | ACCEPTED IN PRODUCTION | BLOCKED / FAILED
Reported defect / source reference:
Scope and authoritative files:
Before: route, environment, viewport WxH, device, observed failure, screenshot/video
Expected: design/reference, precise interaction and persisted outcome
Change: commit SHA, PR, migration/rollback, deployment target
G0 Source: PASS/FAIL/BLOCKED + evidence
G1 Code integrity: PASS/FAIL/BLOCKED + commands/results
G2 Real interaction: PASS/FAIL/BLOCKED + steps/results and fresh reload
G3 Visual/mobile: PASS/FAIL/BLOCKED + inspected 320/360/390/430/744/834/900/1280+ as applicable
G4 Integration/security: PASS/FAIL/BLOCKED + auth/tenant/provider/D1/R2/approval proof
G5 Served release: PASS/FAIL/BLOCKED + Worker version and served JS/assets hash
G6 Cleanup: PASS/FAIL/BLOCKED + branch/worktree status
Remaining defects, regressions, or acceptance blockers:
What was explicitly NOT tested or changed:
```

**No evidence = no acceptance.** Existing or new screenshots must be inspected and compared, not counted as success because screenshot automation ran.

## 9. Immediate implementation backlog (not yet enforced by code)

- [ ] Implement CI checks for tool registry/handler/tenant-scope drift, absent required receipts and known browser regression cases.
- [ ] Build browser acceptance journeys for authenticated Theme Editor and Product Studio on real UI states at the specified viewport matrix; take inspected screenshots/videos.
- [ ] Add an automated **layout invariant** for editor viewport height/safe area/dock and long-page preview; pair it with real device review.
- [ ] Capture reference screenshots and explicit accept/reject criteria for each reported visual defect so redesign drift cannot be re-labeled “polish.”
- [ ] Add a secure staging provider/commerce fixture lane to prove order/fulfillment behavior without live manufacturing submissions.
- [ ] Make release closeout present a gate-by-gate receipt, real served build identity, remaining defects and worktree cleanup.

**This document establishes the acceptance standard immediately. It does not pretend the CI/browser/device enforcement or repairs have already been implemented.**
