-- Disable web/research/PDF/OCR tools for FNF workspace (keep GitHub + Cloudflare docs search)
-- Run: npm run db:patch:agentsam-disable-research-tools

UPDATE agentsam_tools
SET
  is_active = 0,
  updated_at = unixepoch()
WHERE (workspace_id = 'ws_fuelnfreetime' OR workspace_id IS NULL)
  AND is_active = 1
  AND tool_key NOT IN (
    'agentsam_github_repo_list',
    'search_cloudflare_documentation'
  )
  AND (
    lower(tool_key) LIKE '%web_search%'
    OR lower(tool_key) LIKE '%web-search%'
    OR lower(tool_key) LIKE '%browser%'
    OR lower(tool_key) LIKE '%deep_research%'
    OR lower(tool_key) LIKE '%pdf%'
    OR lower(tool_key) LIKE '%ocr%'
    OR (lower(tool_key) LIKE '%research%' AND lower(tool_key) NOT LIKE '%github%')
    OR (lower(display_name) LIKE '%web search%')
    OR (lower(display_name) LIKE '%deep research%')
    OR (lower(display_name) LIKE '%pdf%')
    OR (lower(display_name) LIKE '%ocr%')
  );
