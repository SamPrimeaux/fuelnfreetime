-- FNF's explicitly configured OpenAI chat/code fallback through its own
-- OPENAI_API_KEY Worker secret. Existing agentsam_ai remains the sole model
-- authority. This is a project-specific model choice, NOT a generated list.
-- Requires the model to be available to the FNF OpenAI API credential.
INSERT INTO agentsam_ai (
  id, account_id, provider, model_id, display_name, description,
  task_type, lane, status, priority, is_default, is_fallback,
  supports_json, supports_tools, supports_vision, supports_streaming,
  cost_tier, workflow_keys_json, routing_keywords_json, capabilities_json,
  request_defaults_json, notes
) VALUES
  ('fnf_openai_luna_chat','ede6590ac0d2fb7daf155b35653457b2','openai',
   'gpt-6-luna','OpenAI GPT-6 Luna (FNF fallback)',
   'FNF-owned OPENAI_API_KEY via Responses API, following Workers AI.',
   'text_generation','general','active',40,0,1,
   1,0,0,0,'low','[]','[]','[]','{"max_output_tokens":1024}',
   'FNF project-configured alternative; no shared provider key.'),
  ('fnf_openai_luna_code','ede6590ac0d2fb7daf155b35653457b2','openai',
   'gpt-6-luna','OpenAI GPT-6 Luna (code review fallback)',
   'FNF-owned OPENAI_API_KEY via Responses API, for code/section guidance.',
   'code_generation','code','active',40,0,1,
   1,0,0,0,'low','[]','[]','[]','{"max_output_tokens":1400}',
   'FNF project-configured alternative; no shared provider key.')
ON CONFLICT(id) DO UPDATE SET
  provider=excluded.provider,model_id=excluded.model_id,
  display_name=excluded.display_name,description=excluded.description,
  status=excluded.status,priority=excluded.priority,
  is_fallback=excluded.is_fallback,request_defaults_json=excluded.request_defaults_json,
  updated_at=datetime('now');
