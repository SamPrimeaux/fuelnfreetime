-- Curated Workers AI models for AgentSam (Fuel n Freetime)
-- Run: npm run db:seed:agentsam-ai

INSERT INTO agentsam_ai (
  id, tenant_id, workspace_id, provider, model_id, display_name, description,
  task_type, lane, status, priority, is_default, is_fallback,
  supports_json, supports_tools, supports_vision, supports_streaming,
  context_window_tokens, max_output_tokens, quality_score, speed_score, cost_tier,
  workflow_keys_json, routing_keywords_json, capabilities_json, request_defaults_json, notes,
  created_at, updated_at, created_at_unix
)
VALUES

-- General / agentic chat
('ai_fnf_gpt_oss_120b_general','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/openai/gpt-oss-120b','GPT OSS 120B','Primary higher-quality reasoning and agentic planning model.','text_generation','general','active',10,1,1,1,0,0,0,NULL,NULL,9.5,5.5,'high','["fnf_agentsam_chat","fnf_content_studio","fnf_brand_refresh"]','["chat","reason","plan","strategy","brainstorm","brand","copy","content"]','["reasoning","planning","content","summarization","structured_output"]','{"temperature":0.4,"max_tokens":1800}','Primary AgentSam general model.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_llama_33_70b_general','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/meta/llama-3.3-70b-instruct-fp8-fast','Llama 3.3 70B Fast','Strong general fallback for chat, planning, and content.','text_generation','general','active',20,0,1,1,0,0,0,NULL,NULL,8.8,6.5,'medium','["fnf_agentsam_chat","fnf_content_studio"]','["chat","content","summarize","rewrite","email"]','["general_chat","content","summarization"]','{"temperature":0.45,"max_tokens":1600}','General fallback.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_gpt_oss_20b_fast','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/openai/gpt-oss-20b','GPT OSS 20B','Fast lower-cost fallback for everyday chat and content tasks.','text_generation','fast','active',30,0,1,1,0,0,0,NULL,NULL,7.8,8.0,'low','["fnf_agentsam_chat","fnf_content_studio"]','["quick","draft","rewrite","summarize"]','["fast_chat","drafting","summarization"]','{"temperature":0.45,"max_tokens":1200}','Fast fallback.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_glm_47_flash_fast','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/zai-org/glm-4.7-flash','GLM 4.7 Flash','Fast multilingual text generation fallback.','text_generation','fast','active',40,0,1,1,0,0,0,NULL,NULL,7.5,8.5,'low','["fnf_agentsam_chat"]','["fast","quick","fallback"]','["fast_chat","summarization"]','{"temperature":0.4,"max_tokens":1000}','Fast fallback after GPT OSS 20B.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_llama_32_3b_last_resort','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/meta/llama-3.2-3b-instruct','Llama 3.2 3B','Small last-resort model for basic responses when larger models fail.','text_generation','last_resort','active',99,0,1,0,0,0,0,NULL,NULL,5.8,9.2,'low','["fnf_agentsam_chat"]','["fallback","basic"]','["basic_chat"]','{"temperature":0.3,"max_tokens":700}','Last-resort fallback only.',datetime('now'),datetime('now'),unixepoch()),

-- Code / repo work
('ai_fnf_kimi_k27_code','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/moonshotai/kimi-k2.7-code','Kimi K2.7 Code','Primary model for code/repo reasoning, implementation planning, and debugging.','code_generation','code','active',10,1,1,1,0,0,0,NULL,NULL,9.4,5.5,'high','["fnf_agentsam_chat"]','["repo","code","component","bug","debug","github","implementation","refactor"]','["code_reasoning","debugging","repo_analysis","implementation_planning"]','{"temperature":0.2,"max_tokens":2200}','Primary code lane model.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_qwen25_coder_32b','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/qwen/qwen2.5-coder-32b-instruct','Qwen 2.5 Coder 32B','Strong code generation and technical fallback model.','code_generation','code','active',20,0,1,1,0,0,0,NULL,NULL,8.8,6.2,'medium','["fnf_agentsam_chat"]','["code","typescript","javascript","sql","worker","cloudflare"]','["code_generation","debugging","sql","typescript"]','{"temperature":0.2,"max_tokens":2000}','Code fallback.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_glm_52_code','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/zai-org/glm-5.2','GLM 5.2','Agentic coding model for implementation planning and repo work.','code_generation','code','active',30,0,1,1,0,0,0,NULL,NULL,8.7,6.0,'medium','["fnf_agentsam_chat"]','["agentic","repo","code","debug","worker"]','["agentic_code","repo_reasoning","debugging"]','{"temperature":0.25,"max_tokens":1800}','Additional code fallback.',datetime('now'),datetime('now'),unixepoch()),

-- Image generation
('ai_fnf_flux_2_dev','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/black-forest-labs/flux-2-dev','FLUX 2 Dev','Primary higher-quality image generation model for brand, product, and promo creative.','image_generation','image','active',10,1,1,0,0,0,0,NULL,NULL,9.3,5.2,'high','["fnf_creative_studio","fnf_brand_refresh"]','["image","generate image","logo","banner","creative","product visual","mockup"]','["text_to_image","brand_creative","product_visuals","campaign_assets"]','{"num_steps":28,"guidance":3.5}','Primary image generation model.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_flux_2_klein_9b','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/black-forest-labs/flux-2-klein-9b','FLUX 2 Klein 9B','Balanced image generation fallback.','image_generation','image','active',20,0,1,0,0,0,0,NULL,NULL,8.7,6.8,'medium','["fnf_creative_studio"]','["image","banner","promo","creative"]','["text_to_image","promo_assets"]','{"num_steps":24,"guidance":3.5}','Image fallback.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_leonardo_lucid_origin','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/leonardo/lucid-origin','Leonardo Lucid Origin','Prompt-responsive visual model for clean creative direction.','image_generation','image','active',30,0,1,0,0,0,0,NULL,NULL,8.5,6.5,'medium','["fnf_creative_studio","fnf_brand_refresh"]','["brand","visual","logo direction","creative direction"]','["text_to_image","brand_visuals"]','{}','Creative visual fallback.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_flux_1_schnell_fast','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/black-forest-labs/flux-1-schnell','FLUX 1 Schnell','Fast image generation fallback for quick drafts.','image_generation','image_fast','active',40,0,1,0,0,0,0,NULL,NULL,7.8,9.0,'low','["fnf_creative_studio"]','["quick image","draft image","fast mockup"]','["fast_text_to_image","drafts"]','{"num_steps":8}','Fast image draft model.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_sdxl_inpainting','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/runwayml/stable-diffusion-v1-5-inpainting','Stable Diffusion Inpainting','Image repair/editing support for future image editing workflows.','image_generation','image_edit','active',50,0,1,0,0,0,0,NULL,NULL,7.0,6.0,'medium','["fnf_creative_studio"]','["inpaint","edit image","fix image","replace background"]','["inpainting","image_edit"]','{}','Future image edit lane.',datetime('now'),datetime('now'),unixepoch()),

-- Vision / image understanding
('ai_fnf_llama_32_11b_vision','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/meta/llama-3.2-11b-vision-instruct','Llama 3.2 11B Vision','Primary visual understanding model for product image review and attachment analysis.','image_to_text','vision','active',10,1,1,1,0,1,0,NULL,NULL,8.5,6.0,'medium','["fnf_creative_studio","fnf_brand_refresh","fnf_content_studio"]','["review image","attachment","logo","brand fit","product photo","describe image"]','["vision","image_review","brand_fit","product_analysis"]','{"temperature":0.2,"max_tokens":1200}','Primary image review model.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_llava_vision_fallback','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/llava-hf/llava-1.5-7b-hf','LLaVA 1.5 7B','Fallback image-to-text model.','image_to_text','vision','active',20,0,1,0,0,1,0,NULL,NULL,7.3,6.5,'low','["fnf_creative_studio","fnf_brand_refresh"]','["image review","vision fallback"]','["image_to_text","fallback_vision"]','{}','Vision fallback.',datetime('now'),datetime('now'),unixepoch()),

-- Embeddings / search
('ai_fnf_bge_m3_embed','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/baai/bge-m3','BGE M3','Primary embedding model for product/content search and retrieval.','embedding','embedding','active',10,1,1,0,0,0,0,NULL,NULL,8.8,7.0,'low','["fnf_agentsam_chat","fnf_content_studio"]','["embedding","search","rag","semantic"]','["embeddings","semantic_search","retrieval"]','{}','Primary embedding model.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_bge_large_embed','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/baai/bge-large-en-v1.5','BGE Large EN','English embedding fallback.','embedding','embedding','active',20,0,1,0,0,0,0,NULL,NULL,8.2,7.0,'low','["fnf_agentsam_chat"]','["embedding","english","search"]','["embeddings","semantic_search"]','{}','Embedding fallback.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_qwen3_embed','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/qwen/qwen3-embedding-0.6b','Qwen3 Embedding 0.6B','Alternative embedding model for future evaluation.','embedding','embedding_experimental','experimental',30,0,1,0,0,0,0,NULL,NULL,7.8,7.5,'low','["fnf_agentsam_chat"]','["embedding","qwen","experimental"]','["embeddings"]','{}','Experimental embedding candidate.',datetime('now'),datetime('now'),unixepoch()),

-- Rerank / safety
('ai_fnf_bge_reranker','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/baai/bge-reranker-base','BGE Reranker Base','Reranker for retrieval results and product/content search quality.','rerank','retrieval','active',10,1,1,0,0,0,0,NULL,NULL,8.0,7.0,'low','["fnf_agentsam_chat"]','["rerank","rank","retrieval"]','["reranking","retrieval_quality"]','{}','Use after embedding search when needed.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_llama_guard','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/meta/llama-guard-3-8b','Llama Guard 3 8B','Safety classifier for future moderation and policy gates.','safety','safety','active',10,1,1,0,0,0,0,NULL,NULL,8.0,6.0,'low','["fnf_agentsam_chat"]','["safety","moderation","guard"]','["safety_classification","moderation"]','{}','Future safety gate.',datetime('now'),datetime('now'),unixepoch()),

-- Audio future
('ai_fnf_whisper_large_turbo','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/openai/whisper-large-v3-turbo','Whisper Large V3 Turbo','Future speech-to-text for voice notes and product/content dictation.','speech_to_text','audio','active',10,1,1,0,0,0,0,NULL,NULL,8.8,7.5,'medium','["fnf_agentsam_chat"]','["voice","transcribe","audio","dictation"]','["speech_to_text","transcription"]','{}','Future voice input support.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_deepgram_nova3','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/deepgram/nova-3','Deepgram Nova 3','Alternative speech-to-text model.','speech_to_text','audio','active',20,0,1,0,0,0,0,NULL,NULL,8.3,8.0,'medium','["fnf_agentsam_chat"]','["transcribe","audio","speech"]','["speech_to_text"]','{}','Audio fallback.',datetime('now'),datetime('now'),unixepoch()),

('ai_fnf_aura_2_en','tenant_fuelnfreetime','ws_fuelnfreetime','workers_ai','@cf/deepgram/aura-2-en','Deepgram Aura 2 EN','Future text-to-speech output for AgentSam voice features.','text_to_speech','audio','active',10,1,1,0,0,0,0,NULL,NULL,8.0,7.5,'medium','["fnf_agentsam_chat"]','["voice output","tts","speak"]','["text_to_speech"]','{}','Future voice output.',datetime('now'),datetime('now'),unixepoch())

ON CONFLICT(workspace_id, model_id, lane) DO UPDATE SET
  display_name = excluded.display_name,
  description = excluded.description,
  task_type = excluded.task_type,
  status = excluded.status,
  priority = excluded.priority,
  is_default = excluded.is_default,
  is_fallback = excluded.is_fallback,
  supports_json = excluded.supports_json,
  supports_tools = excluded.supports_tools,
  supports_vision = excluded.supports_vision,
  supports_streaming = excluded.supports_streaming,
  context_window_tokens = excluded.context_window_tokens,
  max_output_tokens = excluded.max_output_tokens,
  quality_score = excluded.quality_score,
  speed_score = excluded.speed_score,
  cost_tier = excluded.cost_tier,
  workflow_keys_json = excluded.workflow_keys_json,
  routing_keywords_json = excluded.routing_keywords_json,
  capabilities_json = excluded.capabilities_json,
  request_defaults_json = excluded.request_defaults_json,
  notes = excluded.notes,
  updated_at = datetime('now');
