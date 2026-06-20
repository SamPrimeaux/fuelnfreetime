-- Finalize auth_users: drop IAM superadmin columns + legacy admin tables
-- Safe after db:migrate:auth-users (all users copied to auth_users)
-- Run: npm run db:migrate:auth-users-finalize

PRAGMA foreign_keys = OFF;

ALTER TABLE auth_users DROP COLUMN is_superadmin;
ALTER TABLE auth_users DROP COLUMN superadmin_identity_id;

DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_users;

PRAGMA foreign_keys = ON;
