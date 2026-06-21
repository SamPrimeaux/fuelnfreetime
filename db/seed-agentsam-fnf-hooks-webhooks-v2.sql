-- Fuel & Free Time — Agent Sam hooks + inbound webhook registry (v2)
-- Run: npm run db:seed:agentsam-hooks-webhooks-v2
--
-- agentsam_hook      = outbound automation we trigger (deploy hook POST, post-deploy CMS warm)
-- agentsam_webhooks  = inbound endpoints providers hit (Resend inbound/outbound, Stripe, …)

-- ── CMS / Cloudflare Builds deploy hook (outbound POST) ───────────────────────

INSERT OR REPLACE INTO agentsam_hook (
  id, tenant_id, workspace_id, user_id, provider, trigger, command, target_id,
  metadata, is_active, workflow_id, event_type, hook_key, handler_type, handler_config, priority
) VALUES (
  'hook_fnf_cms_deploy_build',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'cloudflare',
  'pre_deploy',
  'trigger_workers_build',
  'fuelnfreetime-cms-deployhook',
  '{"worker":"fuelnfreetime","build_name":"fuelnfreetime-cms-deployhook","branch":"main","deploy_hook_id":"0cbd475b-93c4-458a-ba72-0499a1caff90","script":"npm run cms:deploy-hook","docs":"docs/cms-deploy-hooks.md"}',
  1,
  'wf_fnf_post_deploy',
  'cms.deploy.trigger',
  'fnf.cms.deploy_hook',
  'http_post',
  '{"method":"POST","url_env":"CMS_DEPLOY_HOOK_URL","url":"https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/0cbd475b-93c4-458a-ba72-0499a1caff90"}',
  90
);

-- Post-deploy: warm CMS KV (was log_only)
INSERT OR REPLACE INTO agentsam_hook (
  id, tenant_id, workspace_id, user_id, provider, trigger, command, target_id,
  metadata, is_active, workflow_id, event_type, hook_key, handler_type, handler_config, priority
) VALUES (
  'hook_fnf_post_deploy',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'cloudflare',
  'post_deploy',
  'warm_cms_cache',
  'fuelnfreetime',
  '{"worker":"fuelnfreetime","domain":"fuelnfreetime.com","script":"npm run cms:post-deploy","pages":["site","home","shop","about","community"]}',
  1,
  'wf_fnf_post_deploy',
  'deploy.success',
  'fnf.post_deploy',
  'internal_http',
  '{"method":"POST","endpoint":"/api/internal/cms/warm","secret_header":"X-Cms-Warm-Secret","secret_name":"CMS_WARM_SECRET","trigger_source":"agentsam_hook"}',
  100
);

-- CMS publish → KV warm (manual / admin publish path)
INSERT OR REPLACE INTO agentsam_hook (
  id, tenant_id, workspace_id, user_id, provider, trigger, command, target_id,
  metadata, is_active, workflow_id, event_type, hook_key, handler_type, handler_config, priority
) VALUES (
  'hook_fnf_cms_publish',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'cloudflare',
  'post_deploy',
  'publish_cms_kv',
  'fuelnfreetime',
  '{"workflow_key":"fnf_cms_publish","admin_route":"POST /api/admin/cms/pages/:slug/publish","scripts":["scripts/republish-cms-kv.mjs","scripts/warm-cms-cache.mjs"]}',
  1,
  NULL,
  'cms.publish',
  'fnf.cms.publish',
  'internal_http',
  '{"method":"POST","endpoint":"/api/internal/cms/warm","secret_header":"X-Cms-Warm-Secret","secret_name":"CMS_WARM_SECRET","trigger_source":"cms_publish"}',
  80
);

-- ── Inbound webhook registry (Resend split inbound + outbound) ────────────────

UPDATE agentsam_webhooks
SET
  is_active = 0,
  description = 'Legacy combined Resend endpoint — superseded by resend-inbound + resend-outbound (2026-06-21).',
  updated_at = datetime('now')
WHERE id = 'awh_resend_events';

INSERT OR REPLACE INTO agentsam_webhooks (
  id, tenant_id, workspace_id, user_id, provider, name, slug, description,
  endpoint_url, signature_header, signature_algo, is_active, allowed_events, workflow_key, metadata_json
) VALUES (
  'awh_resend_inbound',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'resend',
  'Resend inbound mail',
  'resend-inbound',
  'Catch-all inbound @fuelnfreetime.com → D1 mail_messages (email.received).',
  'https://fuelnfreetime.com/api/webhooks/resend/inbound',
  'svix-signature',
  'sha256',
  1,
  'email.received',
  'fnf_mail_inbound',
  '{"secret_name":"RESEND_WEBHOOK_SECRET_INBOUND","worker_route":"/api/webhooks/resend/inbound","mail_table":"mail_messages","event_log_table":"agentsam_webhook_events","status":"live"}'
);

INSERT OR REPLACE INTO agentsam_webhooks (
  id, tenant_id, workspace_id, user_id, provider, name, slug, description,
  endpoint_url, signature_header, signature_algo, is_active, allowed_events, workflow_key, metadata_json
) VALUES (
  'awh_resend_outbound',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'resend',
  'Resend outbound mail',
  'resend-outbound',
  'Delivery status for sent mail → updates mail_messages (sent, delivered, bounced, …).',
  'https://fuelnfreetime.com/api/webhooks/resend/outbound',
  'svix-signature',
  'sha256',
  1,
  'email.sent,email.delivered,email.delivery_delayed,email.bounced,email.complained,email.failed',
  'fnf_mail_outbound',
  '{"secret_name":"RESEND_WEBHOOK_SECRET_OUTBOUND","worker_route":"/api/webhooks/resend/outbound","legacy_route":"/api/agentsam/webhooks/resend","mail_table":"mail_messages","event_log_table":"agentsam_webhook_events","status":"live"}'
);
