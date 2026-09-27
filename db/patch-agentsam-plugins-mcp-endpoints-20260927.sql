-- Point MCP endpoint resolution at agentsam_plugins (not wrangler IAM_MCP_URL / IAM_ORIGIN).
-- Keep endpoint_url + provider_home as SSOT for the IAM bridge plugin.

UPDATE agentsam_plugins
SET
  endpoint_url = COALESCE(NULLIF(endpoint_url, ''), 'https://mcp.inneranimalmedia.com/mcp'),
  metadata_json = json_set(
    COALESCE(NULLIF(metadata_json, ''), '{}'),
    '$.provider_home',
    COALESCE(
      json_extract(metadata_json, '$.provider_home'),
      'https://inneranimalmedia.com'
    ),
    '$.docs_url',
    COALESCE(
      json_extract(metadata_json, '$.docs_url'),
      'https://mcp.inneranimalmedia.com'
    ),
    '$.endpoint_source',
    'agentsam_plugins'
  ),
  updated_at = unixepoch()
WHERE plugin_key = 'inneranimalmedia-mcp-server';

-- GitHub plugin: stop telling clients to read IAM_MCP_URL from env.
UPDATE agentsam_plugins
SET
  config_json = json_remove(
    json_set(
      COALESCE(NULLIF(config_json, ''), '{}'),
      '$.iam_mcp_plugin_key',
      'inneranimalmedia-mcp-server',
      '$.resolve_mcp_from',
      'agentsam_plugins'
    ),
    '$.iam_mcp_url_env'
  ),
  updated_at = unixepoch()
WHERE plugin_key = 'github';

-- Mirror plugin endpoint onto mcp_servers.url for tools that still read that table.
UPDATE agentsam_mcp_servers
SET
  url = (
    SELECT endpoint_url FROM agentsam_plugins
    WHERE plugin_key = 'inneranimalmedia-mcp-server' AND is_enabled = 1
    LIMIT 1
  ),
  updated_at = unixepoch()
WHERE server_key IN ('inneranimalmedia-mcp-server', 'github')
  AND EXISTS (
    SELECT 1 FROM agentsam_plugins
    WHERE plugin_key = 'inneranimalmedia-mcp-server'
      AND is_enabled = 1
      AND endpoint_url IS NOT NULL
      AND endpoint_url != ''
  );
