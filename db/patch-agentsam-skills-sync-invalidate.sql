-- Invalidate prompt cache after skills sync
UPDATE agentsam_prompt_cache
SET status = 'invalidated',
    invalidation_reason = 'skills_sync',
    updated_at = datetime('now')
WHERE account_id = (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1)
  AND status = 'active';
