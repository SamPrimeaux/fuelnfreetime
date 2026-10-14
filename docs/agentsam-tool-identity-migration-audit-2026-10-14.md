# AgentSam tool identity normalization — production audit (2026-10-14)

**Status:** Audited; production migration **not applied**. This is a release gate, not authorization for blind SQL updates.

## Authority and intended contract

- **Operation ID:** portable dotted semantic identifier, e.g. `media.image.optimize`.
- **Model/API wire name:** provider-safe name, e.g. `media_image_optimize`.
- **Capability:** existing permission, e.g. `media.image.optimize` or `commerce.orders.read`. An operation rename **must not grant or change capabilities**.
- **Registration PK:** preserve existing `agentsam_tools.id` (including `ast_fnf_*` IDs) so references remain valid.
- **Resource ownership:** retain account/site/tenant, provider installation, R2 bucket, D1 binding, `resource_scope_json`, and `handler_config.fnf_scope` until a separately validated resource-scope migration. These are not model-facing tool names.
- **Historical facts:** never rewrite prior calls/logs or old migration snapshots merely to make their original names disappear.
- **Canonical ownership:** reusable tool contracts and dispatch belong to SDK/package-controlled tool infrastructure; FuelNFreetime supplies tenant configuration. Do not create a second tools registry.

## Read-only production D1 evidence

Database: `fuelnfreetime`, queried 2026-10-14 using the linked Cloudflare D1 account.

| Finding | Count |
| --- | ---: |
| `agentsam_tools` rows | 35 |
| Active `fnf_*` tool registrations | 24 |
| Existing 24-key proposed mapping covered by D1 rows | 24 / 24 |
| Collisions against proposed neutral `tool_key` / `tool_name` values | 0 |
| `agentsam_tool_policy_keys` references to those old tool keys | 16 |
| `agentsam_workflow_nodes.handler_key` references to those exact 24 tool keys | 20 |
| All workflow-node handler keys beginning `fnf_` or `fnf.` | 62 |
| Tool registrations with `fnf_*` in `handler_config` | 12 |
| Tool registrations with `fnf_*` in `resource_scope_json` | 1 |
| Plugin installation configuration rows containing `fnf_*` | 2 |

**Crucial:** 62 workflow handler matches include unrelated, semantically different handlers such as `fnf.capture_intent` and `fnf.approval_asset_publish`. Do not bulk rewrite those 62 nodes using the 24-operation map. Eleven workflows still have FNF-prefixed workflow keys; classify as tenant-specific vs reusable definitions before changing them.

The local `scripts/agentsam_tool_ids.py` tool is a useful mapping/audit starting point, but its current SQL generator only updates `agentsam_tools`, leaving 16 permission-policy references and 20 matching workflow-node dispatch references behind. **Do not run that generated SQL alone.**

## Safe release sequence (acceptance criteria)

1. **Inventory & reserve mappings.** Compare all 24 source keys, target keys, existing capabilities, handler types, dispatch targets, approval flags, plugin ownership and scopes. Abort on any missing row, mismatched permission or target collision.
2. **Code and SDK first.** Install canonical operation descriptors and stable wire aliases in the existing tool runtime. Teach discovery, dispatch, policy lookups, workflow resolution, and observability to accept *both* names temporarily. Test every operation against a tenant-scoped fixture; reject unauthorized operator/billable/destructive use.
3. **Seed and installer parity.** Update current seeds/bootstraps and the portable consumer registration path. Historical migrations remain immutable. Verify a fresh install and an existing installation produce the same canonical tool keys without resurrecting `fnf_*`.
4. **Staging D1 transaction.** Snapshot relevant rows. Rename `tool_key` and `tool_name` while preserving each registration `id`, `capability_key`, account/plugin, approval and resource scope; update 16 relevant policy entries and 20 matching workflow handler references in the same coordinated rollout. Inspect embedded JSON references individually. Never overwrite tenant identifiers by regex.
5. **Functional test.** Exercise all 24 discovery/execute cases, including read-only vs write-capability approval, workflow tool routing, saves/reloads and scoped resource access. Confirm old aliases still dispatch to the same registration; no new permissions or duplicate registrations.
6. **Production rollout.** Take a recovery snapshot, deploy backward-compatible code first, then apply the reviewed D1 migration, then run read-only postconditions immediately. Keep compatibility aliases through the rollback window; log remaining legacy callers before retiring aliases.
7. **Drift gate.** CI must compare contract operation IDs, generated wire names, current seeds, route/handler registry, policy references and migration map. Runtime health check must detect unexpected legacy registrations, dangling policies or unresolved workflow handler keys. Neither release nor worktree may be called complete without code + D1 verification.

## Immediate postconditions

- Exactly 24 intended D1 registrations have the new keys (no duplicates); previous `ast_fnf_*` primary keys remain unchanged.
- All 16 policy references resolve to current registrations and retain the same account/policy/active state.
- All 20 directly mapped workflow handlers resolve; other workflow handlers retain their original behavior until separately reworked.
- No changes to merchant data, auth cookies, resource scopes, API credentials, history/log rows, or provider-specific `completeful_*` integrations.
- Full staging runtime tests, production smoke tests, and rollback exercise pass.
- Refresh source/DB drift report on each deploy.

**Do not conflate tool identity `fnf_*` with FNF-specific tenant identities, cookies, historical workflow names, provider identifiers or `fnf_scope` resource restrictions.**
