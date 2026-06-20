-- AgentSam tools + MCP servers seed — Fuel n Freetime
-- Run: npm run db:seed:agentsam-tools

-- ── MCP servers ───────────────────────────────────────────────────────────────

INSERT INTO agentsam_mcp_servers (
  id, tenant_id, workspace_id, server_key, display_name, description, url,
  auth_type, token_secret, transport, tool_lanes_json, repos_json,
  is_active, health_status, metadata_json, created_at, updated_at
) VALUES
(
  'mcps_fnf_iam',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'inneranimalmedia-mcp-server',
  'Inner Animal MCP',
  'Platform bridge for D1, Workers, GitHub catalog, and cross-project dispatch.',
  'https://mcp.inneranimalmedia.com/mcp',
  'bridge',
  'AGENTSAM_BRIDGE_KEY',
  'remote_jsonrpc',
  '["database","terminal","repo","memory","github","deploy"]',
  '[]',
  1,
  'unknown',
  '{"connect_path":"/api/admin/agentsam/mcp/status"}',
  unixepoch(),
  unixepoch()
),
(
  'mcps_fnf_github',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'github',
  'GitHub',
  'Repo context for SamPrimeaux/fuelnfreetime via IAM MCP bridge or direct token.',
  'https://mcp.inneranimalmedia.com/mcp',
  'oauth_via_iam',
  'AGENTSAM_BRIDGE_KEY',
  'iam_mcp_catalog',
  '["repo","code"]',
  '["SamPrimeaux/fuelnfreetime"]',
  1,
  'unknown',
  '{"repo":"SamPrimeaux/fuelnfreetime","oauth_path":"/api/admin/agentsam/github/start"}',
  unixepoch(),
  unixepoch()
),
(
  'mcps_fnf_cf_docs',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'cloudflare-docs',
  'Cloudflare Docs MCP',
  'Search current Cloudflare product documentation via remote MCP.',
  'https://docs.mcp.cloudflare.com/mcp',
  'none',
  NULL,
  'remote_jsonrpc',
  '["docs","research"]',
  '[]',
  0,
  'unknown',
  '{"status":"planned"}',
  unixepoch(),
  unixepoch()
)
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
  id, tenant_id, workspace_id, tool_name, tool_key, display_name, tool_category,
  handler_type, description, input_schema, handler_config, intent_tags,
  mcp_server_key, mcp_service_url, dispatch_target,
  risk_level, requires_approval, is_active, oauth_visible, workspace_scope,
  route_key, workflow_key, task_type, domain, capability_key, sort_priority,
  created_at, updated_at
) VALUES

-- GitHub / repo (bridge)
(
  'ast_fnf_github_repo_list',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'agentsam_github_repo_list', 'agentsam_github_repo_list', 'GitHub Repo List',
  'github.repo', 'mcp',
  'List GitHub repos accessible to the authenticated user. Scoped to SamPrimeaux/fuelnfreetime for AgentSam.',
  '{"type":"object","properties":{},"additionalProperties":false}',
  '{"auth_source":"bridge","remote_tool":"agentsam_github_repo_list","repo_allowlist":["SamPrimeaux/fuelnfreetime"]}',
  '["github","repo","branch","commit","code"]',
  'inneranimalmedia-mcp-server', 'https://mcp.inneranimalmedia.com/mcp', 'bridge',
  'low', 0, 1, 0, '["ws_fuelnfreetime"]',
  'repo', NULL, 'repo_work', 'code', 'github.repo.list', 10,
  unixepoch(), unixepoch()
),

-- Store / commerce
(
  'ast_fnf_orders_list',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_store_orders_list', 'fnf_store_orders_list', 'List Store Orders',
  'commerce.orders', 'd1',
  'Read recent Fuel n Freetime orders from D1. Read-only; no secrets returned.',
  '{"type":"object","properties":{"limit":{"type":"integer","default":20},"status":{"type":"string"}}}',
  '{"binding":"DB","operation":"select","table":"orders","readonly":true}',
  '["order","orders","checkout","commerce","store","inventory"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0, '["ws_fuelnfreetime"]',
  'commerce', NULL, 'store_ops', 'commerce', 'store.orders.list', 20,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_products_list',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_store_products_list', 'fnf_store_products_list', 'List Products',
  'commerce.products', 'd1',
  'List active products and variant inventory from D1.',
  '{"type":"object","properties":{"limit":{"type":"integer","default":24}}}',
  '{"binding":"DB","operation":"select","tables":["products","product_variants"],"readonly":true}',
  '["product","inventory","sku","variant","stock","tee"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0, '["ws_fuelnfreetime"]',
  'commerce', NULL, 'store_ops', 'commerce', 'store.products.list', 21,
  unixepoch(), unixepoch()
),

-- CMS
(
  'ast_fnf_cms_pages',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_cms_pages_list', 'fnf_cms_pages_list', 'List CMS Pages',
  'cms.pages', 'd1',
  'List CMS pages and publish status from D1.',
  '{"type":"object","properties":{"limit":{"type":"integer","default":20}}}',
  '{"binding":"DB","operation":"select","table":"pages","readonly":true}',
  '["cms","page","publish","content","slug","seo"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0, '["ws_fuelnfreetime"]',
  'content', 'fnf_content_studio', 'content_generation', 'content', 'cms.pages.list', 30,
  unixepoch(), unixepoch()
),

-- Platform / Cloudflare
(
  'ast_fnf_d1_query',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_d1_query', 'fnf_d1_query', 'D1 Read Query',
  'database.d1', 'cf',
  'Read-only SELECT against fuelnfreetime D1. Never runs writes from chat.',
  '{"type":"object","properties":{"sql":{"type":"string"},"params":{"type":"array"}},"required":["sql"]}',
  '{"binding":"DB","operation":"readonly_sql","database":"fuelnfreetime"}',
  '["d1","sql","database","query","migration","schema"]',
  NULL, NULL, 'internal',
  'medium', 0, 1, 0, '["ws_fuelnfreetime"]',
  'code', NULL, 'repo_work', 'cloudflare', 'cf.d1.query', 15,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_r2_list',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_r2_media_list', 'fnf_r2_media_list', 'R2 Media List',
  'storage.r2', 'cf',
  'List media assets registered in D1 media library (R2-backed).',
  '{"type":"object","properties":{"folder":{"type":"string"},"limit":{"type":"integer","default":24}}}',
  '{"binding":"WEBSITE_ASSETS","registry_table":"media_assets","readonly":true}',
  '["r2","media","asset","image","upload","bucket"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0, '["ws_fuelnfreetime"]',
  'creative', 'fnf_creative_studio', 'image_generation', 'cloudflare', 'cf.r2.list', 25,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_worker_deploy',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_worker_deploy', 'fnf_worker_deploy', 'Deploy Worker',
  'deploy.worker', 'deploy',
  'Deploy fuelnfreetime Worker via configured deploy command. Requires approval.',
  '{"type":"object","properties":{"confirm":{"type":"boolean"}}}',
  '{"command":"npm run deploy","cwd":"fuelnfreetime","requires_approval":true}',
  '["deploy","worker","cloudflare","wrangler","production"]',
  'inneranimalmedia-mcp-server', 'https://mcp.inneranimalmedia.com/mcp', 'mcp_proxy',
  'high', 1, 1, 0, '["ws_fuelnfreetime"]',
  'code', NULL, 'repo_work', 'cloudflare', 'deploy.worker', 40,
  unixepoch(), unixepoch()
),

-- AgentSam introspection
(
  'ast_fnf_ai_models',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_agentsam_ai_models', 'fnf_agentsam_ai_models', 'AI Model Registry',
  'agentsam.models', 'd1',
  'List curated Workers AI models from agentsam_ai registry.',
  '{"type":"object","properties":{"task_type":{"type":"string"},"lane":{"type":"string"}}}',
  '{"binding":"DB","table":"agentsam_ai","readonly":true}',
  '["model","ai","workers ai","routing","fallback"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0, '["ws_fuelnfreetime"]',
  NULL, 'fnf_agentsam_chat', 'admin_chat', 'agentsam', 'agentsam.ai.models', 12,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_analytics_summary',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_analytics_summary', 'fnf_analytics_summary', 'AgentSam Analytics Summary',
  'agentsam.analytics', 'http',
  'Summarize AgentSam usage, fallbacks, and cost from agentsam_analytics.',
  '{"type":"object","properties":{"range":{"type":"string","default":"24h"}}}',
  '{"path":"/api/admin/agentsam/analytics/summary","method":"GET","internal":true}',
  '["analytics","usage","cost","fallback","latency"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0, '["ws_fuelnfreetime"]',
  NULL, 'fnf_agentsam_chat', 'admin_chat', 'agentsam', 'agentsam.analytics.summary', 13,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_mcp_status',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_mcp_bridge_status', 'fnf_mcp_bridge_status', 'MCP Bridge Status',
  'mcp.status', 'mcp',
  'Probe Inner Animal MCP bridge readiness and GitHub connection.',
  '{"type":"object","properties":{}}',
  '{"path":"/api/admin/agentsam/mcp/status","method":"GET","internal":true}',
  '["mcp","bridge","github","connection","status"]',
  'inneranimalmedia-mcp-server', 'https://mcp.inneranimalmedia.com/mcp', 'internal',
  'low', 0, 1, 0, '["ws_fuelnfreetime"]',
  'code', NULL, 'repo_work', 'platform', 'mcp.bridge.status', 11,
  unixepoch(), unixepoch()
),

-- Cloudflare docs (planned remote MCP)
(
  'ast_fnf_cf_docs_search',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'search_cloudflare_documentation', 'search_cloudflare_documentation', 'Search Cloudflare Docs',
  'cloudflare.docs', 'mcp',
  'Search current Cloudflare documentation via docs MCP server.',
  '{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}',
  '{"auth_source":"none","server_key":"cloudflare-docs","remote_tool":"search_cloudflare_documentation"}',
  '["cloudflare","docs","worker","d1","r2","workers ai"]',
  'cloudflare-docs', 'https://docs.mcp.cloudflare.com/mcp', 'bridge',
  'low', 0, 0, 0, '["ws_fuelnfreetime"]',
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

-- ── Policy keys ───────────────────────────────────────────────────────────────

INSERT INTO agentsam_tool_policy_keys (id, tenant_id, workspace_id, policy_kind, tool_key, sort_order, notes)
VALUES
  ('atpk_fnf_chat_github', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'agent_chat_essential', 'agentsam_github_repo_list', 10, 'Repo context'),
  ('atpk_fnf_chat_orders', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'agent_chat_essential', 'fnf_store_orders_list', 20, 'Store ops'),
  ('atpk_fnf_chat_products', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'agent_chat_essential', 'fnf_store_products_list', 21, 'Inventory'),
  ('atpk_fnf_chat_cms', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'agent_chat_essential', 'fnf_cms_pages_list', 30, 'CMS'),
  ('atpk_fnf_chat_d1', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'agent_chat_essential', 'fnf_d1_query', 15, 'Read-only SQL'),
  ('atpk_fnf_chat_models', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'agent_chat_essential', 'fnf_agentsam_ai_models', 12, 'Model registry'),
  ('atpk_fnf_safe_analytics', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'builtin_safe_allowlist', 'fnf_analytics_summary', 10, 'Usage summary'),
  ('atpk_fnf_safe_mcp', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'builtin_safe_allowlist', 'fnf_mcp_bridge_status', 11, 'Bridge probe'),
  ('atpk_fnf_nc_deploy', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'non_cacheable', 'fnf_worker_deploy', 10, 'Deploy'),
  ('atpk_fnf_nc_d1', 'tenant_fuelnfreetime', 'ws_fuelnfreetime', 'non_cacheable', 'fnf_d1_query', 20, 'Fresh SQL reads')
ON CONFLICT(tenant_id, policy_kind, tool_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  notes = excluded.notes,
  is_active = 1,
  updated_at = unixepoch();
