-- Tool identity, step 1: fnf_d1_query -> agentsam_d1_query, fnf_mcp_bridge_status -> agentsam_ping.
-- Existing registrations keep their primary key, capability_key, scope and approval flags; only identity
-- and handler fields change. Matches on tool_key, so it is safe to re-run (second run changes nothing).
-- Apply AFTER the code that adds both executors is deployed. Neither old key was ever executable, so
-- there is no window in which a working tool stops working.

UPDATE agentsam_tools SET
  tool_key = 'agentsam_d1_query', tool_name = 'agentsam_d1_query',
  handler_type = 'd1',
  description = 'Read-only SELECT against the app database. One statement, row-capped; any write or admin SQL is rejected.',
  handler_config = json_remove(handler_config, '$.database'),
  updated_at = unixepoch()
WHERE tool_key = 'fnf_d1_query'
  AND NOT EXISTS (SELECT 1 FROM agentsam_tools WHERE tool_key = 'agentsam_d1_query' OR tool_name = 'agentsam_d1_query');

UPDATE agentsam_tools SET
  tool_key = 'agentsam_ping', tool_name = 'agentsam_ping', display_name = 'Ping',
  tool_category = 'platform.health', handler_type = 'd1',
  description = 'Liveness check: confirms the app is running, its database is bound, and the bridge secret is configured. No side effects.',
  handler_config = json_set(json_remove(handler_config, '$.path', '$.method', '$.internal'), '$.binding', 'DB', '$.operation', 'ping'),
  intent_tags = '["ping","health","status","liveness"]',
  mcp_server_key = NULL, mcp_service_url = NULL,
  updated_at = unixepoch()
WHERE tool_key = 'fnf_mcp_bridge_status'
  AND NOT EXISTS (SELECT 1 FROM agentsam_tools WHERE tool_key = 'agentsam_ping' OR tool_name = 'agentsam_ping');

-- Policy references move in the same file. If a reseed already created the new row, drop the old duplicate first.
DELETE FROM agentsam_tool_policy_keys
WHERE tool_key IN ('fnf_d1_query', 'fnf_mcp_bridge_status')
  AND EXISTS (
    SELECT 1 FROM agentsam_tool_policy_keys n
    WHERE n.account_id = agentsam_tool_policy_keys.account_id
      AND n.policy_kind = agentsam_tool_policy_keys.policy_kind
      AND n.tool_key = CASE agentsam_tool_policy_keys.tool_key
                         WHEN 'fnf_d1_query' THEN 'agentsam_d1_query' ELSE 'agentsam_ping' END
  );
UPDATE agentsam_tool_policy_keys SET tool_key = 'agentsam_d1_query', updated_at = unixepoch() WHERE tool_key = 'fnf_d1_query';
UPDATE agentsam_tool_policy_keys SET tool_key = 'agentsam_ping', notes = 'Liveness probe', updated_at = unixepoch() WHERE tool_key = 'fnf_mcp_bridge_status';

-- Postconditions: expect 2 tool rows, 3 policy rows, and zero rows still on the old keys.
SELECT tool_key, handler_type, capability_key FROM agentsam_tools WHERE tool_key IN ('agentsam_d1_query', 'agentsam_ping');
SELECT policy_kind, tool_key FROM agentsam_tool_policy_keys WHERE tool_key IN ('agentsam_d1_query', 'agentsam_ping') ORDER BY tool_key, policy_kind;
SELECT count(*) AS leftover_old_keys FROM (
  SELECT tool_key FROM agentsam_tools WHERE tool_key IN ('fnf_d1_query', 'fnf_mcp_bridge_status')
  UNION ALL SELECT tool_key FROM agentsam_tool_policy_keys WHERE tool_key IN ('fnf_d1_query', 'fnf_mcp_bridge_status')
);
