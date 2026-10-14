-- Align installed-integration rows with portable SSOT (agentsam_plugins).
-- Completeful endpoint is canonical production API; GitHub repo and mail sender are per-install data (see site/<customer>/seed).

UPDATE agentsam_plugins
SET
  endpoint_url = COALESCE(NULLIF(endpoint_url, ''), 'https://vxapi.completeful.com'),
  updated_at = unixepoch()
WHERE plugin_key = 'completeful';

-- Mail sender is per-install data: set it in Account settings or a site seed.
-- Until it is set, sends fail closed (resend_from_not_configured) instead of sending as someone else.
INSERT OR IGNORE INTO mail_settings (id, settings_json, updated_at)
VALUES (1, '{}', datetime('now'));
