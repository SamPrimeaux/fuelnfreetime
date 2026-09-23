-- Fuel & Free Time account ownership compatibility stage
-- Generated from live D1 DDL. Legacy columns remain during Worker cutover.

ALTER TABLE agentsam_ai ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_ai SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_ai_account_stage ON agentsam_ai(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_ai_account_fill
AFTER INSERT ON agentsam_ai
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_ai SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_attachments ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_attachments SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_attachments_account_stage ON agentsam_attachments(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_attachments_account_fill
AFTER INSERT ON agentsam_attachments
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_attachments SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_compaction_runs ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_compaction_runs SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_compaction_runs_account_stage ON agentsam_compaction_runs(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_compaction_runs_account_fill
AFTER INSERT ON agentsam_compaction_runs
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_compaction_runs SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_context_cache ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_context_cache SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_context_cache_account_stage ON agentsam_context_cache(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_context_cache_account_fill
AFTER INSERT ON agentsam_context_cache
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_context_cache SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_conversations ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_conversations SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_conversations_account_stage ON agentsam_conversations(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_conversations_account_fill
AFTER INSERT ON agentsam_conversations
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_conversations SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_dev_sessions ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_dev_sessions SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_dev_sessions_account_stage ON agentsam_dev_sessions(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_dev_sessions_account_fill
AFTER INSERT ON agentsam_dev_sessions
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_dev_sessions SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_hook ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_hook SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_hook_account_stage ON agentsam_hook(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_hook_account_fill
AFTER INSERT ON agentsam_hook
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_hook SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_mcp_servers ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_mcp_servers SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_mcp_servers_account_stage ON agentsam_mcp_servers(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_mcp_servers_account_fill
AFTER INSERT ON agentsam_mcp_servers
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_mcp_servers SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_mcp_workflows ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_mcp_workflows SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_mcp_workflows_account_stage ON agentsam_mcp_workflows(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_mcp_workflows_account_fill
AFTER INSERT ON agentsam_mcp_workflows
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_mcp_workflows SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_project_context ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_project_context SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_project_context_account_stage ON agentsam_project_context(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_project_context_account_fill
AFTER INSERT ON agentsam_project_context
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_project_context SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_prompt_cache ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_prompt_cache SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_cache_account_stage ON agentsam_prompt_cache(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_prompt_cache_account_fill
AFTER INSERT ON agentsam_prompt_cache
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_prompt_cache SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_prompt_fragments ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_prompt_fragments SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_fragments_account_stage ON agentsam_prompt_fragments(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_prompt_fragments_account_fill
AFTER INSERT ON agentsam_prompt_fragments
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_prompt_fragments SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_prompt_usage ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_prompt_usage SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_usage_account_stage ON agentsam_prompt_usage(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_prompt_usage_account_fill
AFTER INSERT ON agentsam_prompt_usage
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_prompt_usage SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_prompt_usage_daily ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_prompt_usage_daily SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_usage_daily_account_stage ON agentsam_prompt_usage_daily(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_prompt_usage_daily_account_fill
AFTER INSERT ON agentsam_prompt_usage_daily
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_prompt_usage_daily SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_prompts ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_prompts SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_prompts_account_stage ON agentsam_prompts(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_prompts_account_fill
AFTER INSERT ON agentsam_prompts
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_prompts SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_skill ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_skill SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_skill_account_stage ON agentsam_skill(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_skill_account_fill
AFTER INSERT ON agentsam_skill
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_skill SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_skill_revision ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_skill_revision SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_skill_revision_account_stage ON agentsam_skill_revision(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_skill_revision_account_fill
AFTER INSERT ON agentsam_skill_revision
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_skill_revision SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_tool_call_daily ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_tool_call_daily SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_tool_call_daily_account_stage ON agentsam_tool_call_daily(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_tool_call_daily_account_fill
AFTER INSERT ON agentsam_tool_call_daily
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_tool_call_daily SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_tool_call_log ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_tool_call_log SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_tool_call_log_account_stage ON agentsam_tool_call_log(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_tool_call_log_account_fill
AFTER INSERT ON agentsam_tool_call_log
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_tool_call_log SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_tool_chain ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_tool_chain SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_tool_chain_account_stage ON agentsam_tool_chain(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_tool_chain_account_fill
AFTER INSERT ON agentsam_tool_chain
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_tool_chain SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_tool_policy_keys ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_tool_policy_keys SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_tool_policy_keys_account_stage ON agentsam_tool_policy_keys(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_tool_policy_keys_account_fill
AFTER INSERT ON agentsam_tool_policy_keys
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_tool_policy_keys SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_tool_stats_compacted ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_tool_stats_compacted SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_tool_stats_compacted_account_stage ON agentsam_tool_stats_compacted(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_tool_stats_compacted_account_fill
AFTER INSERT ON agentsam_tool_stats_compacted
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_tool_stats_compacted SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

UPDATE agentsam_tools SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_tools_account_stage ON agentsam_tools(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_tools_account_fill
AFTER INSERT ON agentsam_tools
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_tools SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_vector_chunks ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_vector_chunks SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_vector_chunks_account_stage ON agentsam_vector_chunks(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_vector_chunks_account_fill
AFTER INSERT ON agentsam_vector_chunks
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_vector_chunks SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_webhook_events ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_webhook_events SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_webhook_events_account_stage ON agentsam_webhook_events(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_webhook_events_account_fill
AFTER INSERT ON agentsam_webhook_events
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_webhook_events SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_webhooks ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_webhooks SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_webhooks_account_stage ON agentsam_webhooks(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_webhooks_account_fill
AFTER INSERT ON agentsam_webhooks
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_webhooks SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE agentsam_workflows ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE agentsam_workflows SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_agentsam_workflows_account_stage ON agentsam_workflows(account_id);
CREATE TRIGGER IF NOT EXISTS trg_agentsam_workflows_account_fill
AFTER INSERT ON agentsam_workflows
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_workflows SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE attribution_visits ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE attribution_visits SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_attribution_visits_account_stage ON attribution_visits(account_id);
CREATE TRIGGER IF NOT EXISTS trg_attribution_visits_account_fill
AFTER INSERT ON attribution_visits
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE attribution_visits SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE discounts ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE discounts SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_discounts_account_stage ON discounts(account_id);
CREATE TRIGGER IF NOT EXISTS trg_discounts_account_fill
AFTER INSERT ON discounts
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE discounts SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

ALTER TABLE growth_campaigns ADD COLUMN account_id TEXT REFERENCES accounts(id);
UPDATE growth_campaigns SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_growth_campaigns_account_stage ON growth_campaigns(account_id);
CREATE TRIGGER IF NOT EXISTS trg_growth_campaigns_account_fill
AFTER INSERT ON growth_campaigns
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE growth_campaigns SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

UPDATE user_oauth_tokens SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_account_stage ON user_oauth_tokens(account_id);
CREATE TRIGGER IF NOT EXISTS trg_user_oauth_tokens_account_fill
AFTER INSERT ON user_oauth_tokens
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE user_oauth_tokens SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

UPDATE user_secrets SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE account_id IS NULL OR account_id != 'ede6590ac0d2fb7daf155b35653457b2';
CREATE INDEX IF NOT EXISTS idx_user_secrets_account_stage ON user_secrets(account_id);
CREATE TRIGGER IF NOT EXISTS trg_user_secrets_account_fill
AFTER INSERT ON user_secrets
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE user_secrets SET account_id = 'ede6590ac0d2fb7daf155b35653457b2' WHERE rowid = NEW.rowid;
END;

PRAGMA foreign_key_check;
