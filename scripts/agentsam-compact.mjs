#!/usr/bin/env node
/**
 * AgentSam compaction — placeholder CLI.
 * Run against production via a Worker cron or local script with CF credentials.
 */

console.log("AgentSam compaction is not fully implemented yet.");
console.log("See docs/AGENTSAM-COMPACTION.md for the protocol.");
console.log("");
console.log("TODO:");
console.log("  - Roll agentsam_tool_call_log → agentsam_tool_stats_compacted");
console.log("  - Refresh agentsam/thread-summaries/{conversation_id}/latest.json");
console.log("  - Trim hot tool logs older than 14 days");
process.exit(0);
