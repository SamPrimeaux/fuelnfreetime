-- Fuel & Free Time's own mail sender and GitHub repo. Customer data, not engine data.
-- Idempotent: only fills values that are empty, never overwrites what the merchant saved.
-- Fresh F&FT database only: npx wrangler d1 execute DB --remote --file site/fuelnfreetime/seed/mail-and-github.sql

UPDATE agentsam_plugins
SET
  metadata_json = json_set(
    COALESCE(NULLIF(metadata_json, ''), '{}'),
    '$.repository_url',
    COALESCE(
      json_extract(metadata_json, '$.repository_url'),
      'https://github.com/SamPrimeaux/fuelnfreetime'
    )
  ),
  config_json = json_set(
    COALESCE(NULLIF(config_json, ''), '{}'),
    '$.repository',
    COALESCE(
      json_extract(config_json, '$.repository'),
      'SamPrimeaux/fuelnfreetime'
    )
  ),
  updated_at = unixepoch()
WHERE plugin_key = 'github';

-- Ensure mail From is in mail_settings (not Wrangler).
INSERT INTO mail_settings (id, settings_json, updated_at)
VALUES (
  1,
  json_object(
    'resendFrom', 'Fuel & Free Time <hello@fuelnfreetime.com>',
    'resendPaymentsFrom', 'payments@fuelnfreetime.com',
    'resendDomain', 'fuelnfreetime.com',
    'resendReplyTo', 'support@fuelnfreetime.com',
    'resendTransactional', true
  ),
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  settings_json = CASE
    WHEN json_extract(mail_settings.settings_json, '$.resendFrom') IS NULL
      OR json_extract(mail_settings.settings_json, '$.resendFrom') = ''
    THEN excluded.settings_json
    ELSE mail_settings.settings_json
  END,
  updated_at = datetime('now');
