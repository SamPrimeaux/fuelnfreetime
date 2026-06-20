-- Seed agentsam_workflows — Fuel & Free Time
-- Run after migrate-agentsam-workflows.sql: npm run db:seed:agentsam-workflows

-- Backfill from legacy agentsam_mcp_workflows rows (if present)
INSERT OR IGNORE INTO agentsam_workflows (
  id,
  tenant_id,
  workspace_id,
  workflow_key,
  display_name,
  description,
  workflow_type,
  trigger_type,
  default_mode,
  default_task_type,
  risk_level,
  requires_approval,
  is_active,
  is_platform_global,
  metadata_json,
  updated_at
)
SELECT
  m.id,
  m.tenant_id,
  m.workspace_id,
  m.workflow_key,
  m.display_name,
  m.description,
  CASE
    WHEN m.workflow_key LIKE 'stripe%' THEN 'commerce'
    WHEN m.workflow_key LIKE 'fnf_%' THEN 'deploy'
    ELSE 'integrations'
  END,
  CASE
    WHEN m.workflow_key LIKE 'stripe%' THEN 'webhook'
    WHEN m.workflow_key LIKE 'fnf_%' THEN 'hook'
    ELSE 'manual'
  END,
  'agent',
  m.workflow_key,
  'low',
  0,
  m.is_active,
  0,
  json_object(
    'source', 'agentsam_mcp_workflows',
    'mcp_status', m.status,
    'worker', 'fuelnfreetime'
  ),
  datetime('now')
FROM agentsam_mcp_workflows m;

-- Canonical FNF workflow registry (upsert)
INSERT OR REPLACE INTO agentsam_workflows (
  id,
  tenant_id,
  workspace_id,
  workflow_key,
  display_name,
  description,
  workflow_type,
  trigger_type,
  default_mode,
  default_task_type,
  risk_level,
  requires_approval,
  max_concurrent_nodes,
  timeout_ms,
  quality_gate_json,
  metadata_json,
  is_active,
  is_platform_global,
  updated_at
) VALUES (
  'wf_fnf_stripe_checkout',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'stripe_checkout_paid',
  'Stripe checkout paid',
  'Process Stripe checkout.session.completed — finalize D1 order, decrement inventory, send receipt (planned).',
  'commerce',
  'webhook',
  'agent',
  'stripe_checkout',
  'medium',
  0,
  2,
  300000,
  '{"requires_stripe_webhook_secret":true,"requires_order_row":true}',
  '{"provider":"stripe","events":["checkout.session.completed"],"endpoint":"/api/store/webhooks/stripe","status":"planned"}',
  1,
  0,
  datetime('now')
);

INSERT OR REPLACE INTO agentsam_workflows (
  id,
  tenant_id,
  workspace_id,
  workflow_key,
  display_name,
  description,
  workflow_type,
  trigger_type,
  default_mode,
  default_task_type,
  risk_level,
  requires_approval,
  max_concurrent_nodes,
  timeout_ms,
  quality_gate_json,
  metadata_json,
  is_active,
  is_platform_global,
  updated_at
) VALUES (
  'wf_fnf_post_deploy',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'fnf_post_deploy',
  'FNF post deploy',
  'Log successful Worker deploy for fuelnfreetime and warm CMS KV cache.',
  'deploy',
  'hook',
  'agent',
  'post_deploy',
  'low',
  0,
  1,
  120000,
  '{}',
  '{"worker":"fuelnfreetime","domain":"fuelnfreetime.com","hook_trigger":"post_deploy"}',
  1,
  0,
  datetime('now')
);

INSERT OR REPLACE INTO agentsam_workflows (
  id,
  tenant_id,
  workspace_id,
  workflow_key,
  display_name,
  description,
  workflow_type,
  trigger_type,
  default_mode,
  default_task_type,
  risk_level,
  requires_approval,
  max_concurrent_nodes,
  timeout_ms,
  quality_gate_json,
  metadata_json,
  is_active,
  is_platform_global,
  updated_at
) VALUES (
  'wf_fnf_cms_publish',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'fnf_cms_publish',
  'CMS publish to KV',
  'Publish D1 page sections to KV CMS_CACHE and warm storefront hydrate slots.',
  'cms',
  'manual',
  'agent',
  'cms_publish',
  'low',
  0,
  3,
  180000,
  '{"requires_published_sections":true}',
  '{"scripts":["scripts/republish-cms-kv.mjs","scripts/warm-cms-cache.mjs"],"tables":["pages","page_sections"]}',
  1,
  0,
  datetime('now')
);

INSERT OR REPLACE INTO agentsam_workflows (
  id,
  tenant_id,
  workspace_id,
  workflow_key,
  display_name,
  description,
  workflow_type,
  trigger_type,
  default_mode,
  default_task_type,
  risk_level,
  requires_approval,
  max_concurrent_nodes,
  timeout_ms,
  quality_gate_json,
  metadata_json,
  is_active,
  is_platform_global,
  updated_at
) VALUES (
  'wf_fnf_agentsam_chat',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'fnf_agentsam_chat',
  'Agent Sam admin chat',
  'Workers AI chat with live D1/R2 context for Fuel & Free Time admin drawer.',
  'agentic',
  'manual',
  'agent',
  'admin_chat',
  'low',
  0,
  1,
  120000,
  '{}',
  '{"endpoint":"/api/admin/agentsam/chat","binding":"AGENTSAM_WAI"}',
  1,
  0,
  datetime('now')
);
