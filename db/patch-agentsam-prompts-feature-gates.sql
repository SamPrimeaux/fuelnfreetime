-- Prompt fragment: disabled advanced features for FNF workspace
-- Run after seed: npm run db:patch:agentsam-prompts-feature-gates (optional)

INSERT OR REPLACE INTO agentsam_prompt_fragments (
  id, tenant_id, workspace_id, fragment_key, display_name, description,
  fragment_type, applies_to_json, content_text, priority, status, version, estimated_tokens
) VALUES (
  'pfrag_fnf_feature_gates', 'tenant_fuelnfreetime', 'ws_fuelnfreetime',
  'fnf_feature_gates', 'FNF Feature Gates', 'Disabled advanced capabilities',
  'tool_policy', '{}',
  'Web search, deep research, browser search, PDF extraction, and OCR are NOT enabled for this workspace. Do not promise live web lookup, current trends, or PDF reading. If asked, explain the feature is not enabled yet and offer safe alternatives: paste text, upload an image (png/jpeg/webp/gif), use GitHub repo tools, store/CMS/D1/R2 tools, or draft a research brief without live lookup.',
  25, 'active', 1, 70
);
