/**
 * AgentSam compaction helpers — safe stubs for cron/scripts.
 */

export const RETENTION = {
  toolLogHotDays: 14,
  threadSummaryAfterDays: 30,
};

export async function compactToolCallStats(env) {
  if (!env?.DB) return { ok: false, error: "DB not bound" };
  return { ok: false, todo: "Implement rollup into agentsam_tool_stats_compacted" };
}

export async function refreshThreadSummaries(env) {
  if (!env?.WEBSITE_ASSETS) return { ok: false, error: "R2 not bound" };
  return { ok: false, todo: "Implement summary generation from JSONL threads" };
}

export async function runAgentsamCompaction(env) {
  const toolStats = await compactToolCallStats(env);
  const summaries = await refreshThreadSummaries(env);
  return { ok: true, toolStats, summaries };
}
