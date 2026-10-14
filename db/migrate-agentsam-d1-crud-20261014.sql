-- Owner CRUD, step 2: agentsam_d1_write and agentsam_d1_delete, next to the existing agentsam_d1_query.
-- Rows are derived from the query tool's own row (account, scope, routing), so nothing is hardcoded and any install can run it.
-- Safe to re-run. Apply after the code that adds both executors is deployed; until then the new rows are simply not offered to the model.

INSERT OR IGNORE INTO agentsam_capabilities (capability_key, domain, verb, description, is_mutating)
SELECT 'database.write', domain, 'write', 'Insert, update or replace rows in the app database. Confirmed by the owner before it runs.', 1 FROM agentsam_capabilities WHERE capability_key = 'database.query'
UNION ALL
SELECT 'database.delete', domain, 'delete', 'Delete rows from the app database. Confirmed by the owner before it runs.', 1 FROM agentsam_capabilities WHERE capability_key = 'database.query';
UPDATE agentsam_capabilities SET description = 'Read-only SELECT against the app database. One statement, row-capped.', updated_at = unixepoch() WHERE capability_key = 'database.query';

INSERT INTO agentsam_tools (id, account_id, tool_name, tool_key, display_name, tool_category, handler_type, description, input_schema, handler_config,
  intent_tags, dispatch_target, risk_level, requires_approval, requires_confirmation, route_key, task_type, domain, capability_key, sort_priority, connector_access_class)
SELECT 'ast_agentsam_d1_write', account_id, 'agentsam_d1_write', 'agentsam_d1_write', 'D1 Write', tool_category, 'd1',
  'Insert, update or replace rows in the app database. Two steps: the first call returns a preview and a confirm code and changes nothing. Show the preview to the owner and, only after they agree, call again with the same sql and params plus confirm. One statement; UPDATE needs a WHERE clause; credential, account, provider and agent-config tables are protected.',
  '{"type":"object","properties":{"sql":{"type":"string","description":"One INSERT, UPDATE or REPLACE statement. Use ? placeholders."},"params":{"type":"array","description":"Positional bind values."},"confirm":{"type":"string","description":"Confirm code from the preview. Leave out on the first call."},"max_rows":{"type":"integer","description":"Raise only when the owner agreed to a bulk change."}},"required":["sql"]}',
  json_set(handler_config, '$.operation', 'write'),
  '["d1","sql","database","insert","update","write","edit","change","add"]',
  dispatch_target, 'high', 0, 0, route_key, task_type, domain, 'database.write', sort_priority + 1, 'write'
FROM agentsam_tools
WHERE tool_key IN ('agentsam_d1_query', 'fnf_d1_query')
  AND NOT EXISTS (SELECT 1 FROM agentsam_tools WHERE tool_key = 'agentsam_d1_write' OR tool_name = 'agentsam_d1_write')
LIMIT 1;

INSERT INTO agentsam_tools (id, account_id, tool_name, tool_key, display_name, tool_category, handler_type, description, input_schema, handler_config,
  intent_tags, dispatch_target, risk_level, requires_approval, requires_confirmation, route_key, task_type, domain, capability_key, sort_priority, connector_access_class)
SELECT 'ast_agentsam_d1_delete', account_id, 'agentsam_d1_delete', 'agentsam_d1_delete', 'D1 Delete', tool_category, 'd1',
  'Delete rows from the app database. Two steps: the first call returns a preview with the exact row count and a confirm code and changes nothing. Show the preview to the owner and, only after they agree, call again with the same sql and params plus confirm. One DELETE statement with a WHERE clause; credential, account, provider and agent-config tables are protected.',
  '{"type":"object","properties":{"sql":{"type":"string","description":"One DELETE statement with a WHERE clause. Use ? placeholders."},"params":{"type":"array","description":"Positional bind values."},"confirm":{"type":"string","description":"Confirm code from the preview. Leave out on the first call."},"max_rows":{"type":"integer","description":"Raise only when the owner agreed to a bulk change."}},"required":["sql"]}',
  json_set(handler_config, '$.operation', 'delete'),
  '["d1","sql","database","delete","remove"]',
  dispatch_target, 'high', 0, 0, route_key, task_type, domain, 'database.delete', sort_priority + 2, 'write'
FROM agentsam_tools
WHERE tool_key IN ('agentsam_d1_query', 'fnf_d1_query')
  AND NOT EXISTS (SELECT 1 FROM agentsam_tools WHERE tool_key = 'agentsam_d1_delete' OR tool_name = 'agentsam_d1_delete')
LIMIT 1;

INSERT OR IGNORE INTO agentsam_tool_policy_keys (account_id, policy_kind, tool_key, sort_order, notes)
SELECT p.account_id, p.policy_kind, t.tool_key, p.sort_order + t.bump, t.note
FROM agentsam_tool_policy_keys p
CROSS JOIN (SELECT 'agentsam_d1_write' AS tool_key, 1 AS bump, 'Confirmed writes' AS note UNION ALL SELECT 'agentsam_d1_delete', 2, 'Confirmed deletes') t
WHERE p.tool_key IN ('agentsam_d1_query', 'fnf_d1_query') AND p.policy_kind IN ('agent_chat_essential', 'non_cacheable');

-- Postconditions: 3 d1 tools (query, write, delete), 3 database.* capabilities, 6 policy rows.
SELECT tool_key, capability_key, connector_access_class, risk_level FROM agentsam_tools WHERE tool_key IN ('agentsam_d1_query', 'agentsam_d1_write', 'agentsam_d1_delete') ORDER BY tool_key;
SELECT capability_key, is_mutating FROM agentsam_capabilities WHERE capability_key LIKE 'database.%' ORDER BY capability_key;
SELECT policy_kind, tool_key, sort_order FROM agentsam_tool_policy_keys WHERE tool_key LIKE 'agentsam_d1_%' ORDER BY tool_key, policy_kind;
