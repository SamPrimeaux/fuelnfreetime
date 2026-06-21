-- Agent Sam platform seed — Fuel & Free Time
-- Run after migrate-agentsam-platform.sql (also applied by npm run agentsam:skills:sync)

-- ── Workflow stub (hook FK target) ────────────────────────────────────────────

INSERT OR IGNORE INTO agentsam_mcp_workflows (
  id, workflow_key, display_name, description, status, tenant_id, workspace_id, is_active
) VALUES (
  'wf_fnf_stripe_checkout',
  'stripe_checkout_paid',
  'Stripe checkout paid',
  'Process Stripe checkout.session.completed and finalize D1 order + inventory.',
  'ready',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  1
);

INSERT OR IGNORE INTO agentsam_mcp_workflows (
  id, workflow_key, display_name, description, status, tenant_id, workspace_id, is_active
) VALUES (
  'wf_fnf_post_deploy',
  'fnf_post_deploy',
  'FNF post deploy',
  'Log successful Worker deploy for fuelnfreetime.',
  'ready',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  1
);

-- ── Hooks ─────────────────────────────────────────────────────────────────────

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
  '{"worker":"fuelnfreetime","domain":"fuelnfreetime.com","script":"npm run cms:post-deploy"}',
  1,
  'wf_fnf_post_deploy',
  'deploy.success',
  'fnf.post_deploy',
  'internal_http',
  '{"method":"POST","endpoint":"/api/internal/cms/warm","secret_header":"X-Cms-Warm-Secret","secret_name":"CMS_WARM_SECRET"}',
  100
);

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
  '{"worker":"fuelnfreetime","build_name":"fuelnfreetime-cms-deployhook","branch":"main","deploy_hook_id":"0cbd475b-93c4-458a-ba72-0499a1caff90","script":"npm run cms:deploy-hook"}',
  1,
  'wf_fnf_post_deploy',
  'cms.deploy.trigger',
  'fnf.cms.deploy_hook',
  'http_post',
  '{"method":"POST","url_env":"CMS_DEPLOY_HOOK_URL"}',
  90
);

INSERT OR REPLACE INTO agentsam_hook (
  id, tenant_id, workspace_id, user_id, provider, trigger, command, target_id,
  metadata, is_active, event_type, hook_key, handler_type, handler_config, priority
) VALUES (
  'hook_fnf_stripe_event',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'stripe',
  'error',
  'route_webhook',
  'awh_stripe_checkout',
  '{"events":["checkout.session.completed","checkout.session.expired","payment_intent.payment_failed"]}',
  1,
  'stripe.webhook',
  'fnf.stripe.webhook',
  'workflow',
  '{"workflow_key":"stripe_checkout_paid"}',
  50
);

-- ── Webhook registry ──────────────────────────────────────────────────────────

INSERT OR REPLACE INTO agentsam_webhooks (
  id, tenant_id, workspace_id, user_id, provider, name, slug, description,
  endpoint_url, signature_header, signature_algo, is_active, allowed_events, workflow_key, metadata_json
) VALUES (
  'awh_stripe_checkout',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'stripe',
  'Stripe checkout',
  'stripe-checkout',
  'Stripe Checkout Session + payment events for Fuel & Free Time store.',
  'https://fuelnfreetime.com/api/store/webhooks/stripe',
  'Stripe-Signature',
  'sha256',
  0,
  'checkout.session.completed,checkout.session.expired,payment_intent.payment_failed',
  'stripe_checkout_paid',
  '{"secret_name":"STRIPE_WEBHOOK_SECRET","status":"planned"}'
);

INSERT OR REPLACE INTO agentsam_webhooks (
  id, tenant_id, workspace_id, user_id, provider, name, slug, description,
  endpoint_url, signature_header, signature_algo, is_active, allowed_events, workflow_key, metadata_json
) VALUES (
  'awh_github_push',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'github',
  'GitHub push',
  'github-push',
  'GitHub push events for SamPrimeaux/fuelnfreetime (optional CI hooks).',
  'https://fuelnfreetime.com/api/agentsam/webhooks/github',
  'X-Hub-Signature-256',
  'sha256',
  0,
  'push,pull_request',
  'fnf_post_deploy',
  '{"repo":"SamPrimeaux/fuelnfreetime","status":"planned"}'
);

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
  'Catch-all inbound @fuelnfreetime.com → D1 mail_messages.',
  'https://fuelnfreetime.com/api/webhooks/resend/inbound',
  'svix-signature',
  'sha256',
  1,
  'email.received',
  'fnf_mail_inbound',
  '{"secret_name":"RESEND_WEBHOOK_SECRET_INBOUND","status":"live"}'
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
  'Delivery events for sent mail → mail_messages status updates.',
  'https://fuelnfreetime.com/api/webhooks/resend/outbound',
  'svix-signature',
  'sha256',
  1,
  'email.sent,email.delivered,email.delivery_delayed,email.bounced,email.complained,email.failed',
  'fnf_mail_outbound',
  '{"secret_name":"RESEND_WEBHOOK_SECRET_OUTBOUND","status":"live"}'
);

INSERT OR REPLACE INTO agentsam_webhooks (
  id, tenant_id, workspace_id, user_id, provider, name, slug, description,
  endpoint_url, signature_header, signature_algo, is_active, allowed_events, metadata_json
) VALUES (
  'awh_resend_events',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'resend',
  'Resend email events (legacy)',
  'resend-events',
  'Legacy combined endpoint — use resend-inbound + resend-outbound.',
  'https://fuelnfreetime.com/api/agentsam/webhooks/resend',
  'svix-signature',
  'sha256',
  0,
  'email.sent,email.delivered,email.bounced',
  '{"secret_name":"RESEND_WEBHOOK_SECRET","status":"deprecated"}'
);
