-- D1 phase 3/4: short destructive swap after replacement-table verification.
PRAGMA defer_foreign_keys = ON;

DROP TABLE agentsam_hook_execution;
DROP TABLE agentsam_hook;
DROP TABLE agentsam_webhook_events;
DROP TABLE agentsam_webhooks;

DROP TABLE IF EXISTS mail_webhook_events;
DROP TABLE IF EXISTS stripe_webhook_events;
DROP TABLE IF EXISTS completeful_webhook_events;
DROP TABLE IF EXISTS completeful_webhook_subscriptions;

ALTER TABLE agentsam_webhooks__canonical RENAME TO agentsam_webhooks;
ALTER TABLE agentsam_webhook_events__canonical RENAME TO agentsam_webhook_events;
ALTER TABLE agentsam_hook__canonical RENAME TO agentsam_hook;
ALTER TABLE agentsam_hook_execution__canonical RENAME TO agentsam_hook_execution;

PRAGMA defer_foreign_keys = OFF;
