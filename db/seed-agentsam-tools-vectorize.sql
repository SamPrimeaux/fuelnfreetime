-- FNF semantic search tool (Vectorize handler)
-- Run: npm run db:seed:agentsam-tools-vectorize

INSERT INTO agentsam_tools (
  id, tenant_id, workspace_id, tool_name, tool_key, display_name, tool_category,
  handler_type, description, input_schema, handler_config, intent_tags,
  mcp_server_key, mcp_service_url, dispatch_target,
  risk_level, requires_approval, is_active, oauth_visible, workspace_scope,
  route_key, workflow_key, task_type, domain, capability_key, sort_priority,
  created_at, updated_at
) VALUES (
  'ast_fnf_semantic_search',
  'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_semantic_search', 'fnf_semantic_search', 'FNF Semantic Search',
  'retrieval.vectorize', 'vectorize',
  'Semantic search over Fuel n Freetime CMS pages, products, and repo docs via FNF_VECTORIZE (BGE M3 1024). Always scoped to ws_fuelnfreetime.',
  '{"type":"object","properties":{"query":{"type":"string"},"top_k":{"type":"integer","default":8},"source_type":{"type":"string","enum":["product","cms","skill","repo","brand"]}},"required":["query"]}',
  '{"binding":"FNF_VECTORIZE","index_name":"fnf-agentsam-bge-m3-1024","embed_model":"@cf/baai/bge-m3","dimensions":1024,"workspace_id":"ws_fuelnfreetime","tenant_id":"tenant_fuelnfreetime","readonly":true}',
  '["semantic","search","rag","retrieval","product","cms","content","docs","lookup","vector"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0, '["ws_fuelnfreetime"]',
  'content', 'fnf_content_studio', 'content_generation', 'content', 'fnf.semantic_search', 18,
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
  route_key = excluded.route_key,
  workflow_key = excluded.workflow_key,
  task_type = excluded.task_type,
  domain = excluded.domain,
  capability_key = excluded.capability_key,
  sort_priority = excluded.sort_priority,
  is_active = 1,
  updated_at = unixepoch();

INSERT INTO agentsam_tool_policy_keys (id, tenant_id, workspace_id, policy_kind, tool_key, sort_order, notes)
VALUES (
  'atpk_fnf_chat_semantic',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'agent_chat_essential',
  'fnf_semantic_search',
  17,
  'CMS/product/doc semantic search'
)
ON CONFLICT(tenant_id, policy_kind, tool_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  notes = excluded.notes,
  is_active = 1,
  updated_at = unixepoch();
