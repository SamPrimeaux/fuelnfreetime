-- D1 phase 4/4: restore canonical indexes and Completeful verification view.
CREATE INDEX idx_agentsam_webhooks_account_provider_status
  ON agentsam_webhooks(account_id, provider, status);
CREATE INDEX idx_agentsam_webhooks_resource
  ON agentsam_webhooks(account_id, provider, provider_resource_type, provider_resource_id);
CREATE INDEX idx_agentsam_webhook_events_account_received
  ON agentsam_webhook_events(account_id, received_at_unix DESC);
CREATE INDEX idx_agentsam_webhook_events_webhook_received
  ON agentsam_webhook_events(webhook_id, received_at_unix DESC);
CREATE INDEX idx_agentsam_webhook_events_provider_type_received
  ON agentsam_webhook_events(account_id, provider, event_type, received_at_unix DESC);
CREATE INDEX idx_agentsam_webhook_events_status_received
  ON agentsam_webhook_events(account_id, status, received_at_unix DESC);
CREATE INDEX idx_agentsam_webhook_events_expiry
  ON agentsam_webhook_events(expires_at_unix);
CREATE INDEX idx_agentsam_hook_event_active
  ON agentsam_hook(account_id, source_kind, provider, event_type, is_active, priority);
CREATE INDEX idx_agentsam_hook_webhook
  ON agentsam_hook(webhook_id, is_active);
CREATE INDEX idx_agentsam_hook_execution_account_created
  ON agentsam_hook_execution(account_id, created_at_unix DESC);
CREATE INDEX idx_agentsam_hook_execution_hook_created
  ON agentsam_hook_execution(hook_id, created_at_unix DESC);
CREATE INDEX idx_agentsam_hook_execution_webhook_event
  ON agentsam_hook_execution(webhook_event_id);
CREATE INDEX idx_agentsam_hook_execution_status_created
  ON agentsam_hook_execution(account_id, status, created_at_unix DESC);
CREATE INDEX idx_agentsam_hook_execution_expiry
  ON agentsam_hook_execution(expires_at_unix);

CREATE VIEW v_completeful_schema_summary AS
SELECT
  (SELECT COUNT(*) FROM completeful_shops) AS shops,
  (SELECT COUNT(*) FROM completeful_catalog_products) AS catalog_products,
  (SELECT COUNT(*) FROM completeful_catalog_variants) AS catalog_variants,
  (SELECT COUNT(*) FROM completeful_catalog_print_locations) AS print_locations,
  (SELECT COUNT(*) FROM completeful_catalog_images) AS catalog_images,
  (SELECT COUNT(*) FROM completeful_catalog_mockups) AS catalog_mockups,
  (SELECT COUNT(*) FROM completeful_product_links) AS product_links,
  (SELECT COUNT(*) FROM completeful_order_links) AS order_links,
  (SELECT COUNT(*) FROM agentsam_webhooks
    WHERE provider = 'completeful' AND status != 'retired') AS webhook_subscriptions,
  (SELECT COUNT(*) FROM agentsam_webhook_events
    WHERE provider = 'completeful') AS webhook_events;
