# AgentSam Tool Infrastructure — Recovery TODO
**P0 | Owner repository: `SamPrimeaux/fuelnfreetime` | Working checkout: `/Users/samprimeaux/fuelnfreetime` | Created: 2026-10-14**

> **This is an executable engineering checklist, not a claim of completion.** Do not mark a task done because a script exists, a PR merged, or a test passes without verifying the real runtime and installed tenant. Finish, commit, push, merge, verify deployment and **prune completed worktrees** in the same closeout.

## Verified starting state

Live FuelNFreetime production D1 was queried read-only on 2026-10-14:
- **35** registered `agentsam_tools` rows. Their individual executable status **has not** been established; **do not call all 35 broken**.
- **24** active tools still use `fnf_*` wire names; 24/24 have proposed neutral-name mappings; **zero** mapped-name collisions observed.
- **16** references in `agentsam_tool_policy_keys` use those old keys.
- **20** workflow-node `handler_key` references match the 24 legacy tool names.
- **62** workflow-node handler keys are FNF-prefixed overall; many are **not** model-callable tools.
- **11** FNF-prefixed workflow definitions; distinguish legitimately tenant-specific workflows from reusable infrastructure.
- Other references: handler configuration, scopes, seeds, tests and source-level dispatch. Historical tool-call logs are not to be rewritten.
- `fnf.capture_intent` is a `trigger` node in `fnf_content_studio` with `{}` input/output schemas. No corresponding implementation was found in the inspected backend. Workflow metadata must not be advertised as a callable executable tool.
- `scripts/agentsam_tool_ids.py` maps the 24 names but does **not** perform a complete migration. Its partial-SQL action was guarded against accidental production use on `feat/neutral-tool-ids-20261013`.
- No production D1 tool-identity migration has been applied.

Related branch and read-only audit: `feat/neutral-tool-ids-20261013` and `docs/agentsam-tool-identity-migration-audit-2026-10-14.md` on that branch. Before changing code, reconcile that branch and the current GitHub `main`; local `main` may have stale remote refs.

## Phase 1 — Inventory actual executability (blocker for all renames)

- [ ] **T01 — Produce a 35-row truth table.** For each registered tool capture `id`, `tool_key`, `tool_name`, capability, account, plugin, handler type/key, dispatch target, input/output schemas, approval/confirmation, resource scope, enabled/degraded status, and test outcome.
- [ ] **T02 — Verify the complete call chain.** Exercise discovery → authorization → typed input → resolution → dispatch → actual execution → result, using the same paths as the in-app AgentSam. Classify **WORKING / BROKEN / NOT IMPLEMENTED / INCOMPLETE** with evidence and repair plan.
- [ ] **T03 — Stop advertising fake executability.** A DB registration alone does not make a tool executable. Make discovery agree with implemented handlers. Preserve explicit unavailable status rather than pretending a feature works.
- [ ] **T04 — Audit workflow-node handlers separately.** Classify `fnf.capture_intent`, `fnf.plan_content`, `fnf.write_memory`, approval, context-loading and other `fnf.*` nodes as declarative orchestration, internal routing, or actual executable operations. Implement and test genuine handlers; remove misleading tool-facing claims.

## Phase 2 — One portable identity, one canonical implementation

- [ ] **T05 — Define the identity contract.** Stable dotted portable `operationId` (example `media.image.optimize`), provider-safe wire name (`media_image_optimize`), existing capability, typed schemas, side effects, permissions, risk/approval, handler, trace identity and normalized result. Reject wire-name collisions.
- [ ] **T06 — Refactor the 24 merchant/operator tool names.** Move from `fnf_*` toward reusable commerce/CMS/media/search/operator operation names, preserving functionality and limiting operator tools to authorized operators. Do **not** rename FNF business identity or provider-specific `completeful_*` APIs.
- [ ] **T07 — Unify SDK and app contracts.** Reuse the canonical existing AgentSam SDK capability/tool registry and execution logic in the reusable `apps/ecommerce-cms-agentsam` product; avoid parallel registries or hand-written FNF-specific forks.
- [ ] **T08 — Preserve identity and scopes.** Keep `agentsam_tools.id` primary keys (including `ast_fnf_*`), account/site ownership, plugin installation, capability keys, resource scopes, Cloudflare bindings, auth behavior and provider credentials. Existing `fnf_scope` entries are tenant restrictions, **not** model-visible operation IDs.

## Phase 3 — Controlled source + D1 migration

- [ ] **T09 — Replace the partial migration script.** Produce a reviewed, collision-checked, idempotent plan covering registrations, the 16 policy refs, 20 directly mapped workflow handlers, embedded JSON references, seeds/bootstraps, current code callers and rollback. The current `sql` draft is **not production-safe**.
- [ ] **T10 — Ship compatibility first.** Allow old and new wire names temporarily to resolve to the **same authorized registration**, with no duplicate permissions; test both. Deploy this before changing live D1.
- [ ] **T11 — Fix all dispatch paths and current seeds.** Update tool discovery, executable-handler checks, dynamic invocation, workflow routing, policy lookups, default seed SQL, and standalone package installation. Do not edit historical applied migrations to obscure provenance.
- [ ] **T12 — Prove fresh-install parity.** A new merchant install, an existing tenant and a redeployment must converge on the same canonical tool registry, without recreating obsolete `fnf_*` registrations.
- [ ] **T13 — Staging database rehearsal.** Snapshot old rows and dependent references. Validate each mapping, ownership, uniqueness and approval/scope invariants; migrate in staging with rollback. Examine non-tool `fnf.*` workflow handlers one by one.
- [ ] **T14 — Production D1 rollout.** With deployment gates satisfied: backup/snapshot, deploy compatible code, apply coordinated D1 updates, then immediately verify registration totals, uniqueness, 16 policy links, 20 workflow handlers, capabilities and account scopes. Retain aliases until the rollback window ends.

## Phase 4 — Prove real workflows and prevent drift

- [ ] **T15 — Test all 35 registration outcomes.** Each must have either an evidence-backed working execution result or an explicitly unavailable/disabled state; missing handlers are defects, not acceptable success.
- [ ] **T16 — Prove merchant journeys.** Read products, list media, prepare an asset, propose/edit CMS draft, save/reload and request approval before publishing. Include real in-app execution, denied permission, disabled provider and failed handler tests.
- [ ] **T17 — CI drift gate.** Fail releases for duplicate operation/wire IDs, missing handlers, policy keys with no registration, unresolvable workflow handlers, stale seeds, cross-tenant access, unauthorized operator permissions and mismatches between SDK contracts, code and D1.
- [ ] **T18 — Production smoke and rollback proof.** Check deployed Worker identity and current D1 state, run representative authorized calls in the real dashboard, verify result receipts and rollback rehearsal. Passing unit tests alone is insufficient.

## Phase 5 — Git/worktree closeout (mandatory, not optional)

- [ ] **T19 — Reconcile unfinished branches.** Compare current GitHub `main` to local branches/worktrees. Preserve unique commits and all uncommitted files; decide explicitly which changes to ship or archive. Do not delete a tree based on branch names or stale local refs.
- [ ] **T20 — Commit, push, merge and prune.** For each complete change: stage reviewed scope, run tests, commit, push, open/merge reviewed PR, verify commit on GitHub `main`, verify deployment when applicable, and remove only clean fully-landed worktrees. Report all unresolved branches with owners, blockers and next actions.

## Completion receipt required before saying DONE

1. **35-row execution matrix**: requested operation, implementation, permission, actual result and trace.
2. **Before/after D1 evidence**: 24 mappings, no collisions, 16 policies and 20 directly mapped workflow handlers resolved, preserved primary keys and scope/approval parity.
3. **Source of truth proof**: shared SDK contracts, current application execution, canonical seed/installer path and no parallel registry drift.
4. **Tests and production proof**: real merchant flows and negative authorization tests, CI results, deployed Worker/version and rollback proof.
5. **Git receipt**: branch, commit SHA, merged PR, `main` inclusion, remaining worktrees and why each is retained.

**Release rule:** `DONE` requires functional behavior + source/DB agreement + production verification + cleanup. A finished script or merged PR by itself is `IN PROGRESS`.
