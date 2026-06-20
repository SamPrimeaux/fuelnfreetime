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
  'log',
  'fuelnfreetime',
  '{"worker":"fuelnfreetime","domain":"fuelnfreetime.com"}',
  1,
  'wf_fnf_post_deploy',
  'deploy.success',
  'fnf.post_deploy',
  'log_only',
  '{"channel":"console"}',
  100
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
  endpoint_url, signature_header, signature_algo, is_active, allowed_events, metadata_json
) VALUES (
  'awh_resend_events',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'au_fnf_system',
  'resend',
  'Resend email events',
  'resend-events',
  'Delivery/bounce events for transactional order email (planned).',
  'https://fuelnfreetime.com/api/agentsam/webhooks/resend',
  'svix-signature',
  'sha256',
  0,
  'email.sent,email.delivered,email.bounced',
  '{"secret_name":"RESEND_WEBHOOK_SECRET","status":"planned"}'
);
