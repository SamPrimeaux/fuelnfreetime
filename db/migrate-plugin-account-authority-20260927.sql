-- Normalize plugin ownership onto the canonical accounts.id authority.
--
-- Safe/idempotent rule:
--   * only repairs rows whose account_id is not present in accounts
--   * only when exactly one active application account exists
-- This makes the migration reusable for other single-tenant deployments and
-- fails closed for a future multi-account installation.

UPDATE agentsam_plugins
SET
  account_id = (
    SELECT id
    FROM accounts
    WHERE status = 'active'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  ),
  updated_at = unixepoch()
WHERE account_id NOT IN (SELECT id FROM accounts)
  AND (SELECT COUNT(*) FROM accounts WHERE status = 'active') = 1;

UPDATE agentsam_plugin_health_checks
SET account_id = (
  SELECT id
  FROM accounts
  WHERE status = 'active'
  ORDER BY created_at ASC, id ASC
  LIMIT 1
)
WHERE account_id NOT IN (SELECT id FROM accounts)
  AND (SELECT COUNT(*) FROM accounts WHERE status = 'active') = 1;
