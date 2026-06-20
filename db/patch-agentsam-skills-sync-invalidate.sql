-- Invalidate prompt cache after skills sync
UPDATE agentsam_prompt_cache
SET status = 'invalidated',
    invalidation_reason = 'skills_sync',
    updated_at = datetime('now')
WHERE workspace_id = 'ws_fuelnfreetime'
  AND status = 'active';
