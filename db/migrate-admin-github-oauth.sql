-- Admin GitHub OAuth tokens for AgentSam (repo-scoped to SamPrimeaux/fuelnfreetime)

CREATE TABLE IF NOT EXISTS admin_github_tokens (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'github',
  access_token TEXT NOT NULL,
  account_login TEXT,
  scopes TEXT,
  repo_scope TEXT NOT NULL DEFAULT 'SamPrimeaux/fuelnfreetime',
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_admin_github_tokens_login ON admin_github_tokens(account_login);
