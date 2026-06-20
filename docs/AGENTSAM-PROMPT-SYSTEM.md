# AgentSam prompt system

AgentSam no longer builds giant prompt strings inline in `agentsam.js`. Prompts are assembled from D1 templates + fragments, with compiled packs cached by stable hashes.

## Tables

| Table | Purpose |
|-------|---------|
| `agentsam_prompts` | Reusable prompt templates (system/workflow/tool) |
| `agentsam_prompt_fragments` | Reusable blocks (scope, brand, tool policy, etc.) |
| `agentsam_prompt_cache` | Compiled prompt pack metadata + KV/R2 pointers |
| `agentsam_context_cache` | Retrieved context pack metadata + KV/R2 pointers |
| `agentsam_prompt_usage` | Cache hit/miss and token savings ledger |

## Assembly flow (chat)

1. Route intent → workflow / lane / task_type
2. **Context pack** (`context-cache.js`): project context, store snapshot, workflow/skills/tools/MCP blocks, conversation summary
3. **Prompt pack** (`prompt-registry.js` + `prompt-cache.js`): fragments + workflow template
4. Ephemeral layers appended at send time: OAuth URL, fresh GitHub context, attachment text
5. Workers AI call via `ai-run.js`
6. Log usage → `agentsam_prompt_usage` + `agentsam_analytics` (`system` events)

## Cache keys

Prompt cache key includes: `workspace_id`, `workflow_key`, `route_lane`, `task_type`, `prompt_hash`, `context_hash`, `tool_hash`.

Context cache bypasses when `repo_context` or `attachment_hint` is present (fresh per request).

## TTL defaults

| Pack type | TTL |
|-----------|-----|
| Base prompt | 24h |
| Workflow prompt | 12h |
| Tool-heavy | 15m |
| Repo/store context | 5–15m |

## Storage

- **D1**: templates, fragments, previews, hashes, hit counts
- **KV** (`CMS_CACHE`): hot compiled text ≤ ~4KB
- **R2** (`WEBSITE_ASSETS`): larger compiled payloads under `agentsam/prompt-cache/` and `agentsam/context-cache/`

## Install

```bash
npm run db:install:agentsam-prompts
```

## Debug APIs

- `GET /api/admin/agentsam/prompts`
- `GET /api/admin/agentsam/prompts/cache/summary`
- `POST /api/admin/agentsam/prompts/cache/invalidate`

## Invalidation

Invalidate when prompts, fragments, tools catalog, workflows, or model defaults change:

```bash
curl -X POST /api/admin/agentsam/prompts/cache/invalidate \
  -H 'content-type: application/json' \
  -d '{"reason":"manual_refresh"}'
```

See also: [AGENTSAM-COMPACTION.md](./AGENTSAM-COMPACTION.md)
