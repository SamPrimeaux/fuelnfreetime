-- Platform defaults for ecommerce + admin (idempotent)
-- Run: npm run db:seed:platform

INSERT OR IGNORE INTO store_settings (id, settings_json, updated_at)
VALUES (
  1,
  '{"passwordProtection":false,"storePassword":"","b2bOnly":false,"homeTitle":"Fuel & Free Time","metaDescription":"Earned-not-given lifestyle apparel — built in Lafayette, Louisiana.","socialImageUrl":"/media/archive/shopify-import/graphics/high_octane.jpg","geoRedirect":true,"languageRedirect":false,"hcaptchaContact":true,"hcaptchaAccount":true}',
  datetime('now')
);

INSERT OR IGNORE INTO mail_settings (id, settings_json, updated_at)
VALUES (
  1,
  '{"gmailAddress":"","gmailDisplayName":"","gmailSyncWindow":"Last 30 days","gmailReadMeta":true,"gmailReadBodies":true,"gmailSend":true,"gmailDrafts":true,"resendFrom":"hello@fuelnfreetime.com","resendPaymentsFrom":"payments@fuelnfreetime.com","resendDomain":"fuelnfreetime.com","resendReplyTo":"","resendApiKey":"","resendTransactional":true,"resendCampaign":false,"resendTracking":false,"resendWebhooks":true,"defaultInbox":"Gmail","defaultSender":"Gmail for replies, Resend for app mail","syncCadence":"Every 15 minutes","agentMode":"Draft only","autoLabel":true,"clientPriority":true,"reviewBeforeSend":true}',
  datetime('now')
);
