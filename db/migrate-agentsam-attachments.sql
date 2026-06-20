-- AgentSam attachment metadata (file bodies in R2)

CREATE TABLE IF NOT EXISTS agentsam_attachments (
  id TEXT PRIMARY KEY DEFAULT ('att_' || lower(hex(randomblob(12)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
  conversation_id TEXT,
  message_id TEXT,
  uploaded_by TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes INTEGER DEFAULT 0,
  r2_key TEXT NOT NULL,
  preview_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('uploading','ready','failed','deleted')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_agentsam_attachments_workspace_conversation
  ON agentsam_attachments(workspace_id, conversation_id, created_at_unix DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_attachments_status
  ON agentsam_attachments(workspace_id, status, created_at_unix DESC);
