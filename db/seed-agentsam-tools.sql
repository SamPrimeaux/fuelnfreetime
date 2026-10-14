-- AgentSam tools + MCP servers seed — Fuel n Freetime
-- Run: npm run db:seed:agentsam-tools

-- ── MCP servers ───────────────────────────────────────────────────────────────

INSERT INTO agentsam_mcp_servers (id, account_id, server_key, display_name, description, url, auth_type, token_secret, transport, tool_lanes_json, repos_json, is_active, health_status, metadata_json, created_at, updated_at) VALUES('mcps_fnf_iam', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'inneranimalmedia-mcp-server', 'Inner Animal MCP', 'Platform bridge for D1, Workers, GitHub catalog, and cross-project dispatch.', 'https://mcp.inneranimalmedia.com/mcp', 'bridge', 'AGENTSAM_BRIDGE_KEY', 'remote_jsonrpc', '["database","terminal","repo","memory","github","deploy"]', '[]', 1, 'unknown', '{"connect_path":"/api/admin/agentsam/mcp/status"}', unixepoch(), unixepoch()),
('mcps_fnf_github', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'github', 'GitHub', 'Repo context for SamPrimeaux/fuelnfreetime via IAM MCP bridge or direct token.', 'https://mcp.inneranimalmedia.com/mcp', 'oauth_via_iam', 'AGENTSAM_BRIDGE_KEY', 'iam_mcp_catalog', '["repo","code"]', '["SamPrimeaux/fuelnfreetime"]', 1, 'unknown', '{"repo":"SamPrimeaux/fuelnfreetime","oauth_path":"/api/admin/agentsam/github/start"}', unixepoch(), unixepoch()),
('mcps_fnf_cf_docs', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'cloudflare-docs', 'Cloudflare Docs MCP', 'Search current Cloudflare product documentation via remote MCP.', 'https://docs.mcp.cloudflare.com/mcp', 'none', NULL, 'remote_jsonrpc', '["docs","research"]', '[]', 0, 'unknown', '{"status":"planned"}', unixepoch(), unixepoch())
ON CONFLICT(server_key) DO UPDATE SET
  display_name = excluded.display_name,
  description = excluded.description,
  url = excluded.url,
  auth_type = excluded.auth_type,
  token_secret = excluded.token_secret,
  transport = excluded.transport,
  tool_lanes_json = excluded.tool_lanes_json,
  repos_json = excluded.repos_json,
  metadata_json = excluded.metadata_json,
  updated_at = unixepoch();

-- ── Tool catalog ──────────────────────────────────────────────────────────────

INSERT INTO agentsam_tools (
  id, account_id, tool_name, tool_key, display_name, tool_category,
  handler_type, description, input_schema, handler_config, intent_tags,
  mcp_server_key, mcp_service_url, dispatch_target,
  risk_level, requires_approval, is_active, oauth_visible,
  route_key, workflow_key, task_type, domain, capability_key, sort_priority,
  created_at, updated_at
) VALUES

-- GitHub / repo (bridge)
(
  'ast_fnf_github_repo_list',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'agentsam_github_repo_list', 'agentsam_github_repo_list', 'GitHub Repo List',
  'github.repo', 'mcp',
  'List GitHub repos accessible to the authenticated user. Scoped to SamPrimeaux/fuelnfreetime for AgentSam.',
  '{"type":"object","properties":{},"additionalProperties":false}',
  '{"auth_source":"bridge","remote_tool":"agentsam_github_repo_list","repo_allowlist":["SamPrimeaux/fuelnfreetime"]}',
  '["github","repo","branch","commit","code"]',
  'inneranimalmedia-mcp-server', 'https://mcp.inneranimalmedia.com/mcp', 'bridge',
  'low', 0, 1, 0,
  'repo', NULL, 'repo_work', 'code', 'repository.list', 10,
  unixepoch(), unixepoch()
),

-- Store / commerce
(
  'ast_fnf_orders_list',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'fnf_store_orders_list', 'fnf_store_orders_list', 'List Store Orders',
  'commerce.orders', 'd1',
  'Read recent Fuel n Freetime orders from D1. Read-only; no secrets returned.',
  '{"type":"object","properties":{"limit":{"type":"integer","default":20},"status":{"type":"string"}}}',
  '{"binding":"DB","operation":"select","table":"orders","readonly":true}',
  '["order","orders","checkout","commerce","store","inventory"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'commerce', NULL, 'store_ops', 'commerce', 'commerce.orders.read', 20,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_products_list',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'fnf_store_products_list', 'fnf_store_products_list', 'List Products',
  'commerce.products', 'd1',
  'List active products and variant inventory from D1.',
  '{"type":"object","properties":{"limit":{"type":"integer","default":24}}}',
  '{"binding":"DB","operation":"select","tables":["products","product_variants"],"readonly":true}',
  '["product","inventory","sku","variant","stock","tee"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'commerce', NULL, 'store_ops', 'commerce', 'commerce.products.read', 21,
  unixepoch(), unixepoch()
),

-- CMS
(
  'ast_fnf_cms_pages',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'fnf_cms_pages_list', 'fnf_cms_pages_list', 'List CMS Pages',
  'cms.pages', 'd1',
  'List CMS pages and publish status from D1.',
  '{"type":"object","properties":{"limit":{"type":"integer","default":20}}}',
  '{"binding":"DB","operation":"select","table":"pages","readonly":true}',
  '["cms","page","publish","content","slug","seo"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'content', 'fnf_content_studio', 'content_generation', 'content', 'cms.pages.read', 30,
  unixepoch(), unixepoch()
),

-- Platform / Cloudflare
(
  'ast_fnf_d1_query',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'agentsam_d1_query', 'agentsam_d1_query', 'D1 Read Query',
  'database.d1', 'd1',
  'Read-only SELECT against the app database. One statement, row-capped; any write or admin SQL is rejected.',
  '{"type":"object","properties":{"sql":{"type":"string"},"params":{"type":"array"}},"required":["sql"]}',
  '{"binding":"DB","operation":"readonly_sql"}',
  '["d1","sql","database","query","migration","schema"]',
  NULL, NULL, 'internal',
  'medium', 0, 1, 0,
  'code', NULL, 'repo_work', 'cloudflare', 'database.query', 15,
  unixepoch(), unixepoch()
),
(
  'ast_agentsam_d1_write',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'agentsam_d1_write', 'agentsam_d1_write', 'D1 Write',
  'database.d1', 'd1',
  'Insert, update or replace rows in the app database. Two steps: the first call returns a preview and a confirm code and changes nothing. Show the preview to the owner and, only after they agree, call again with the same sql and params plus confirm. One statement; UPDATE needs a WHERE clause; credential, account, provider and agent-config tables are protected.',
  '{"type":"object","properties":{"sql":{"type":"string","description":"One INSERT, UPDATE or REPLACE statement. Use ? placeholders."},"params":{"type":"array","description":"Positional bind values."},"confirm":{"type":"string","description":"Confirm code from the preview. Leave out on the first call."},"max_rows":{"type":"integer","description":"Raise only when the owner agreed to a bulk change."}},"required":["sql"]}',
  '{"binding":"DB","operation":"write"}',
  '["d1","sql","database","insert","update","write","edit","change","add"]',
  NULL, NULL, 'internal',
  'high', 0, 1, 0,
  'code', NULL, 'repo_work', 'cloudflare', 'database.write', 16,
  unixepoch(), unixepoch()
),
(
  'ast_agentsam_d1_delete',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'agentsam_d1_delete', 'agentsam_d1_delete', 'D1 Delete',
  'database.d1', 'd1',
  'Delete rows from the app database. Two steps: the first call returns a preview with the exact row count and a confirm code and changes nothing. Show the preview to the owner and, only after they agree, call again with the same sql and params plus confirm. One DELETE statement with a WHERE clause; credential, account, provider and agent-config tables are protected.',
  '{"type":"object","properties":{"sql":{"type":"string","description":"One DELETE statement with a WHERE clause. Use ? placeholders."},"params":{"type":"array","description":"Positional bind values."},"confirm":{"type":"string","description":"Confirm code from the preview. Leave out on the first call."},"max_rows":{"type":"integer","description":"Raise only when the owner agreed to a bulk change."}},"required":["sql"]}',
  '{"binding":"DB","operation":"delete"}',
  '["d1","sql","database","delete","remove"]',
  NULL, NULL, 'internal',
  'high', 0, 1, 0,
  'code', NULL, 'repo_work', 'cloudflare', 'database.delete', 17,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_r2_list',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'fnf_r2_media_list', 'fnf_r2_media_list', 'R2 Media List',
  'storage.r2', 'cf',
  'List media assets registered in D1 media library (R2-backed).',
  '{"type":"object","properties":{"folder":{"type":"string"},"limit":{"type":"integer","default":24}}}',
  '{"binding":"WEBSITE_ASSETS","registry_table":"media_assets","readonly":true}',
  '["r2","media","asset","image","upload","bucket"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'creative', 'fnf_creative_studio', 'image_generation', 'cloudflare', 'storage.objects.list', 25,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_worker_deploy',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'fnf_worker_deploy', 'fnf_worker_deploy', 'Deploy Worker',
  'deployment.worker.deploy', 'deploy',
  'Deploy fuelnfreetime Worker via configured deploy command. Requires approval.',
  '{"type":"object","properties":{"confirm":{"type":"boolean"}}}',
  '{"command":"npm run deploy","cwd":"fuelnfreetime","requires_approval":true}',
  '["deploy","worker","cloudflare","wrangler","production"]',
  'inneranimalmedia-mcp-server', 'https://mcp.inneranimalmedia.com/mcp', 'mcp_proxy',
  'high', 1, 1, 0,
  'code', NULL, 'repo_work', 'cloudflare', 'deployment.worker.deploy', 40,
  unixepoch(), unixepoch()
),

-- AgentSam introspection
(
  'ast_fnf_ai_models',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'fnf_agentsam_ai_models', 'fnf_agentsam_ai_models', 'AI Model Registry',
  'agentsam.models', 'd1',
  'List curated Workers AI models from agentsam_ai registry.',
  '{"type":"object","properties":{"task_type":{"type":"string"},"lane":{"type":"string"}}}',
  '{"binding":"DB","table":"agentsam_ai","readonly":true}',
  '["model","ai","workers ai","routing","fallback"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  NULL, 'fnf_agentsam_chat', 'admin_chat', 'agentsam', 'agentsam.models.read', 12,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_analytics_summary',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'fnf_analytics_summary', 'fnf_analytics_summary', 'AgentSam Analytics Summary',
  'agentsam.analytics', 'http',
  'Summarize AgentSam usage, fallbacks, and cost from agentsam_analytics.',
  '{"type":"object","properties":{"range":{"type":"string","default":"24h"}}}',
  '{"path":"/api/admin/agentsam/analytics/summary","method":"GET","internal":true}',
  '["analytics","usage","cost","fallback","latency"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  NULL, 'fnf_agentsam_chat', 'admin_chat', 'agentsam', 'agentsam.analytics.read', 13,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_mcp_status',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'agentsam_ping', 'agentsam_ping', 'Ping',
  'platform.health', 'd1',
  'Liveness check: confirms the app is running, its database is bound, and the bridge secret is configured. No side effects.',
  '{"type":"object","properties":{}}',
  '{"binding":"DB","operation":"ping"}',
  '["ping","health","status","liveness"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'code', NULL, 'repo_work', 'platform', 'integration.mcp.status', 11,
  unixepoch(), unixepoch()
),

-- Cloudflare docs (planned remote MCP)
(
  'ast_fnf_cf_docs_search',
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  'search_cloudflare_documentation', 'search_cloudflare_documentation', 'Search Cloudflare Docs',
  'cloudflare.docs', 'mcp',
  'Search current Cloudflare documentation via docs MCP server.',
  '{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}',
  '{"auth_source":"none","server_key":"cloudflare-docs","remote_tool":"search_cloudflare_documentation"}',
  '["cloudflare","docs","worker","d1","r2","workers ai"]',
  'cloudflare-docs', 'https://docs.mcp.cloudflare.com/mcp', 'bridge',
  'low', 0, 0, 0,
  'code', NULL, 'repo_work', 'cloudflare', 'cloudflare.docs.search', 50,
  unixepoch(), unixepoch()
)

ON CONFLICT(tool_key) DO UPDATE SET
  display_name = excluded.display_name,
  description = excluded.description,
  tool_category = excluded.tool_category,
  handler_type = excluded.handler_type,
  input_schema = excluded.input_schema,
  handler_config = excluded.handler_config,
  intent_tags = excluded.intent_tags,
  mcp_server_key = excluded.mcp_server_key,
  mcp_service_url = excluded.mcp_service_url,
  dispatch_target = excluded.dispatch_target,
  risk_level = excluded.risk_level,
  requires_approval = excluded.requires_approval,
  is_active = excluded.is_active,
  route_key = excluded.route_key,
  workflow_key = excluded.workflow_key,
  task_type = excluded.task_type,
  domain = excluded.domain,
  capability_key = excluded.capability_key,
  sort_priority = excluded.sort_priority,
  updated_at = unixepoch();

-- ── Mutating D1 tools are write-class; their capabilities are registered as mutating ──────────

UPDATE agentsam_tools SET connector_access_class = 'write' WHERE tool_key IN ('agentsam_d1_write', 'agentsam_d1_delete');

INSERT OR IGNORE INTO agentsam_capabilities (capability_key, domain, verb, description, is_mutating) VALUES
  ('database.query', 'cloudflare', 'query', 'Read-only SELECT against the app database. One statement, row-capped.', 0),
  ('database.write', 'cloudflare', 'write', 'Insert, update or replace rows in the app database. Confirmed by the owner before it runs.', 1),
  ('database.delete', 'cloudflare', 'delete', 'Delete rows from the app database. Confirmed by the owner before it runs.', 1);
UPDATE agentsam_capabilities SET description = 'Read-only SELECT against the app database. One statement, row-capped.', updated_at = unixepoch() WHERE capability_key = 'database.query';

-- ── Policy keys ───────────────────────────────────────────────────────────────

INSERT INTO agentsam_tool_policy_keys (id, account_id, policy_kind, tool_key, sort_order, notes)
VALUES('atpk_fnf_chat_github', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'agent_chat_essential', 'agentsam_github_repo_list', 10, 'Repo context'),
  ('atpk_fnf_chat_orders', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'agent_chat_essential', 'fnf_store_orders_list', 20, 'Store ops'),
  ('atpk_fnf_chat_products', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'agent_chat_essential', 'fnf_store_products_list', 21, 'Inventory'),
  ('atpk_fnf_chat_cms', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'agent_chat_essential', 'fnf_cms_pages_list', 30, 'CMS'),
  ('atpk_fnf_chat_d1', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'agent_chat_essential', 'agentsam_d1_query', 15, 'Read-only SQL'),
  ('atpk_fnf_chat_models', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'agent_chat_essential', 'fnf_agentsam_ai_models', 12, 'Model registry'),
  ('atpk_fnf_safe_analytics', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'builtin_safe_allowlist', 'fnf_analytics_summary', 10, 'Usage summary'),
  ('atpk_fnf_safe_mcp', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'builtin_safe_allowlist', 'agentsam_ping', 11, 'Liveness probe'),
  ('atpk_fnf_nc_deploy', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'non_cacheable', 'fnf_worker_deploy', 10, 'Deploy'),
  ('atpk_fnf_nc_d1', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'non_cacheable', 'agentsam_d1_query', 20, 'Fresh SQL reads'),
  ('atpk_agentsam_d1_write_chat', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'agent_chat_essential', 'agentsam_d1_write', 16, 'Confirmed writes'),
  ('atpk_agentsam_d1_delete_chat', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'agent_chat_essential', 'agentsam_d1_delete', 17, 'Confirmed deletes'),
  ('atpk_agentsam_d1_write_nc', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'non_cacheable', 'agentsam_d1_write', 21, 'Confirmed writes'),
  ('atpk_agentsam_d1_delete_nc', (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1), 'non_cacheable', 'agentsam_d1_delete', 22, 'Confirmed deletes')
ON CONFLICT(account_id, policy_kind, tool_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  notes = excluded.notes,
  is_active = 1,
  updated_at = unixepoch();
