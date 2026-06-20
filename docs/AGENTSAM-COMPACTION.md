# AgentSam compaction and rollup protocol

AgentSam keeps **searchable metadata in D1**, **full payloads in R2**, and **recent pointers in KV**. This document defines the hot path and scheduled compaction.

## Hot path (real-time)

| Store | Purpose |
|-------|---------|
| `agentsam_conversations` | Title, preview, counts, R2 keys, timestamps |
| `agentsam_attachments` | File metadata; bodies in R2 |
| `agentsam_tool_call_log` | Per-invocation tool traces (14–30 day hot window) |
| `agentsam_analytics` | Event ledger (previews/hashes, not full chats) |
| R2 `agentsam/thread-payloads/{conversation_id}/messages.jsonl` | Full message payloads |
| R2 `agentsam/thread-summaries/{conversation_id}/latest.json` | Compacted thread summary |
| KV `agentsam:recent:{workspace_id}` | Recent conversation list cache |

Chat responses must **never block** on R2/KV/analytics writes. Use `ctx.waitUntil` where available.

## Daily compaction

1. Roll `agentsam_tool_call_log` → `agentsam_tool_stats_compacted` (by tool_key, day).
2. Update `agentsam/thread-summaries/{conversation_id}/latest.json` from recent JSONL.
3. Optionally archive JSONL older than 30 days to `agentsam/thread-archives/{conversation_id}/{yyyy-mm}.jsonl.gz`.
4. Trim hot tool logs older than retention default (**14 days** recommended).

## Retention defaults

| Data | Retention |
|------|-----------|
| D1 tool call log (hot) | 14–30 days |
| R2 full thread JSONL | Keep; compact summaries after 30 days |
| D1 conversation metadata | Until user soft-deletes |
| Attachments | Until deleted or orphan cleanup |

## Scripts

```bash
npm run agentsam:compact   # tool log → stats_compacted + summary refresh
npm run agentsam:rollup    # analytics daily rollups (placeholder)
```

Implementation lives in `src/agentsam/compaction.js` and `scripts/agentsam-*.mjs`.
