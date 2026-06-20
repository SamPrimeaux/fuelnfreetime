-- Drop IAM columns unused on Fuel & Free Time (single-tenant Worker auth)
-- Run: npm run db:migrate:auth-users-slim

ALTER TABLE auth_users DROP COLUMN person_uuid;
ALTER TABLE auth_users DROP COLUMN supabase_user_id;
ALTER TABLE auth_users DROP COLUMN superadmin_uuid;
ALTER TABLE auth_users DROP COLUMN superadmin_group_id;
ALTER TABLE auth_users DROP COLUMN identity_label;
ALTER TABLE auth_users DROP COLUMN user_key;
