# AgentSam compaction and rollup protocol

AgentSam keeps **searchable metadata in D1**, **full payloads in R2**, and **recent pointers in KV**. Scheduled compaction rolls hot logs into **daily stats** so D1 stays lean while R2 keeps deeper history.

## Hot path (real-time)

| Store | Purpose |
|-------|---------|
| `agentsam_conversations` | Title, preview, counts, R2 keys, timestamps |
| `agentsam_attachments` | File metadata; bodies in R2 |
| `agentsam_tool_call_log` | Per-invocation tool traces (14-day hot window) |
| `agentsam_analytics` | Event ledger (previews/hashes, not full chats) |
| `agentsam_prompt_usage` | Prompt/context cache hit ledger |
| R2 `agentsam/thread-payloads/{conversation_id}/messages.jsonl` | Full message payloads |
| R2 `agentsam/thread-summaries/{conversation_id}/latest.json` | Compacted thread summary |
| KV `agentsam:recent:{workspace_id}` | Recent conversation list cache |

Chat responses must **never block** on R2/KV/analytics writes. Use `ctx.waitUntil` where available.

## Daily stats (compacted)

| Table | Source | Grain |
|-------|--------|-------|
| `agentsam_analytics_daily` | `agentsam_analytics` | date + event/workflow/model dimensions |
| `agentsam_prompt_usage_daily` | `agentsam_prompt_usage` | date + workflow/lane/task/model |
| `agentsam_tool_call_daily` | `agentsam_tool_call_log` | date + tool_key |
| `agentsam_tool_stats_compacted` | incremental from daily tool rollups | lifetime per tool_key |
| `agentsam_compaction_runs` | compaction job audit log | per run |

## Daily compaction (04:00 UTC cron)

1. Roll yesterday's `agentsam_analytics` → `agentsam_analytics_daily`
2. Roll yesterday's `agentsam_prompt_usage` → `agentsam_prompt_usage_daily`
3. Roll yesterday's `agentsam_tool_call_log` → `agentsam_tool_call_daily` + update `agentsam_tool_stats_compacted`
4. Refresh `agentsam/thread-summaries/{conversation_id}/latest.json` for recent threads
5. Trim hot rows past retention (analytics/prompt 30d, tool log 14d)

Implementation: `src/agentsam/compaction.js`  
Cron: `wrangler.toml` → `[triggers] crons = ["0 4 * * *"]`  
Worker entry: `src/index.js` → `scheduled()`

## Retention defaults

| Data | Retention |
|------|-----------|
| D1 `agentsam_tool_call_log` (hot) | 14 days |
| D1 `agentsam_analytics` (hot) | 30 days |
| D1 `agentsam_prompt_usage` (hot) | 30 days |
| Daily rollup tables | Keep (lean aggregates) |
| R2 full thread JSONL | Keep; summaries refreshed nightly |
| D1 conversation metadata | Until user soft-deletes |

## Setup

```bash
# 1. Apply daily stats schema
npm run db:install:agentsam-compaction

# 2. Set optional manual trigger secret (for npm run agentsam:compact)
./scripts/with-cf-admin-env.sh npx wrangler secret put AGENTSAM_COMPACTION_SECRET

# 3. Deploy (registers cron trigger)
npm run deploy
```

## Manual run

**Admin UI session:**

```http
POST /api/admin/agentsam/compaction/run
{ "force": false, "skip_trim": false, "date_key": "2026-06-19" }
```

**CLI (requires secret):**

```bash
export AGENTSAM_COMPACTION_SECRET=...
npm run agentsam:compact
npm run agentsam:compact -- --force --date=2026-06-19
npm run agentsam:rollup   # alias
```

**Status:**

```http
GET /api/admin/agentsam/compaction/status
GET /api/admin/agentsam/status   # includes last compaction runs
```

## Verification SQL

```sql
SELECT date_key, status, analytics_rows, prompt_usage_rows, tool_call_rows,
       analytics_deleted, prompt_usage_deleted, tool_call_deleted, summaries_refreshed, started_at
FROM agentsam_compaction_runs
WHERE workspace_id = 'ws_fuelnfreetime'
ORDER BY started_at DESC
LIMIT 10;

SELECT date_key, SUM(event_count) AS events, SUM(total_estimated_cost_usd) AS cost
FROM agentsam_analytics_daily
WHERE workspace_id = 'ws_fuelnfreetime'
GROUP BY date_key
ORDER BY date_key DESC
LIMIT 7;
```
