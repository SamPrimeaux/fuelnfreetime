-- Align installed-integration rows with portable SSOT (agentsam_plugins).
-- Completeful endpoint is canonical production API; GitHub repo stays in plugin metadata/config.

UPDATE agentsam_plugins
SET
  endpoint_url = COALESCE(NULLIF(endpoint_url, ''), 'https://vxapi.completeful.com'),
  updated_at = unixepoch()
WHERE plugin_key = 'completeful';

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
