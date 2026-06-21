-- Dev session close — 2026-06-21 (Sam)
-- Run: ./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/seed-dev-session-2026-06-21.sql

INSERT INTO agentsam_dev_sessions (
  id, tenant_id, workspace_id, project_key, session_date, author, session_type,
  shipped, decisions, blockers, open_items, tables_touched, files_touched, commits, notes
) VALUES (
  'ds_fnf_sam_20260621',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'fuelnfreetime',
  '2026-06-21',
  'sam',
  'docs',
  '- Wrote docs/FNF-RUNTIME-OPS-2026-06-21.md: Resend routes/secrets, agentsam_hook vs agentsam_webhooks vs agentsam_webhook_events, mail_messages vs mail_webhook_events, per-user mailbox model, CMS deploy hook + warm flow, debug checklist.
- Added docs/cms-deploy-hooks.md + FNF-RUNTIME-OPS to REPO_DOC_PATHS in scripts/embed-fnf-content.mjs.
- Vector re-embed (--source=repo): 8 new chunks → fnf-agentsam-bge-m3-1024 (AgentSam can now recall mail/webhook/CMS ops architecture).',
  '- HOW docs belong in REPO_DOC_PATHS — code alone cannot answer why-is-X-broken questions for AgentSam semantic search.
- Kept mail_webhook_events alongside agentsam_webhook_events: mail table for backfill scripts, AgentSam table for cross-system webhook audit.
- Repo-only embed on doc changes (not full cms/product sync) to avoid unnecessary Workers AI spend.',
  'AgentSam drawer 500s on /api/admin/agentsam/tools and /status. Shop [data-cms] slots incomplete. Invite→login→inbox E2E not walked. Stripe checkout receipts not wired. Connor inbox isolation not verified.',
  '- Connor inbox isolation: login as connor@, confirm nav/API only shows connor@ mailbox.
- Resend inbound dashboard: confirm new webhooks return 200 (old failures may still show Attempting).
- Invite → login → inbox E2E full walk.
- Shop page [data-cms] slot coverage in shop.html.
- ?preview=1 QA in admin.
- Stripe checkout → Resend receipt wiring.
- Fix AgentSam /tools and /status 500s.',
  'agentsam_vector_chunks, agentsam_dev_sessions, agentsam_project_context',
  'docs/FNF-RUNTIME-OPS-2026-06-21.md, scripts/embed-fnf-content.mjs, db/seed-dev-session-2026-06-21.sql',
  '99bfec5',
  'Vector index now includes runtime ops doc. Query agentsam_dev_sessions for full Jun 20 ship log (ds_fnf_sam_20260620).'
);

UPDATE agentsam_project_context
SET
  current_blockers = 'AgentSam drawer 500s on /api/admin/agentsam/tools and /status. Shop page [data-cms] slot coverage incomplete. Invite→login→inbox E2E not fully walked. Stripe checkout receipts not wired to Resend. Connor inbox isolation not yet verified.',
  notes = 'Dev journal: agentsam_dev_sessions (append-only). Latest: ds_fnf_sam_20260621 (runtime ops doc + vector embed). Vector index fnf-agentsam-bge-m3-1024 includes docs/FNF-RUNTIME-OPS-2026-06-21.md and cms-deploy-hooks.md. Query ctx_fuelnfreetime for live blockers.',
  updated_at = unixepoch()
WHERE id = 'ctx_fuelnfreetime';
