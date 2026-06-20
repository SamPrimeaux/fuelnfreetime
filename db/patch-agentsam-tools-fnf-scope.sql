-- Patch agentsam_tools + MCP servers with explicit FNF platform scope
-- Run: npm run db:patch:agentsam-tools-scope

UPDATE agentsam_mcp_servers
SET
  description = 'FNF-scoped IAM MCP bridge — dispatch only tools registered for ws_fuelnfreetime. No cross-tenant D1/R2/worker access.',
  metadata_json = '{"scope":"ws_fuelnfreetime","worker":"fuelnfreetime","bridge_only":true,"github_repo":"SamPrimeaux/fuelnfreetime"}',
  repos_json = '["SamPrimeaux/fuelnfreetime"]',
  updated_at = unixepoch()
WHERE server_key = 'inneranimalmedia-mcp-server';

UPDATE agentsam_tools
SET
  notes = 'FNF-scoped: fuelnfreetime worker, D1 fuelnfreetime, R2 fuelnfreetime, SamPrimeaux/fuelnfreetime repo only.',
  handler_config = json_patch(
    COALESCE(handler_config, '{}'),
    '{"fnf_scope":{"tenant_id":"tenant_fuelnfreetime","workspace_id":"ws_fuelnfreetime","worker":"fuelnfreetime","d1_binding":"DB","d1_database":"fuelnfreetime","r2_binding":"WEBSITE_ASSETS","r2_bucket":"fuelnfreetime","github_repo":"SamPrimeaux/fuelnfreetime","domain":"fuelnfreetime.com"}}'
  ),
  updated_at = unixepoch()
WHERE tenant_id = 'tenant_fuelnfreetime';

UPDATE agentsam_tools
SET handler_config = json_patch(
  handler_config,
  '{"worker":"fuelnfreetime","database":"fuelnfreetime","repo_allowlist":["SamPrimeaux/fuelnfreetime"]}'
)
WHERE tool_key = 'fnf_worker_deploy';

UPDATE agentsam_tools
SET handler_config = json_patch(
  handler_config,
  '{"database":"fuelnfreetime","binding":"DB","readonly":true}'
)
WHERE tool_key IN ('fnf_d1_query','fnf_store_orders_list','fnf_store_products_list','fnf_cms_pages_list','fnf_agentsam_ai_models');

UPDATE agentsam_tools
SET handler_config = json_patch(
  handler_config,
  '{"r2_bucket":"fuelnfreetime","binding":"WEBSITE_ASSETS","readonly":true}'
)
WHERE tool_key = 'fnf_r2_media_list';
