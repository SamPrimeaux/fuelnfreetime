-- Normalize IAM MCP plugin metadata for Heuristics/MCP contract.
-- endpoint_url remains the MCP resource; authorization_server is the OAuth issuer.
-- provider_home is marketing/home only — not silently treated as issuer forever.

UPDATE agentsam_plugins
SET
  metadata_json = json_set(
    COALESCE(NULLIF(metadata_json, ''), '{}'),
    '$.provider_home',
    COALESCE(
      json_extract(metadata_json, '$.provider_home'),
      'https://inneranimalmedia.com'
    ),
    '$.authorization_server',
    COALESCE(
      json_extract(metadata_json, '$.authorization_server'),
      json_extract(metadata_json, '$.provider_home'),
      'https://inneranimalmedia.com'
    ),
    '$.docs_url',
    COALESCE(
      json_extract(metadata_json, '$.docs_url'),
      'https://mcp.inneranimalmedia.com'
    ),
    '$.endpoint_source',
    'agentsam_plugins',
    '$.discovery',
    'prefer_oauth_protected_resource'
  ),
  updated_at = unixepoch()
WHERE plugin_key = 'inneranimalmedia-mcp-server';
