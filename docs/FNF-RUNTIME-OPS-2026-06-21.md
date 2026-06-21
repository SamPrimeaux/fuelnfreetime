# FNF Runtime Ops — June 21, 2026

**Project:** Fuel & Free Time (`fuelnfreetime.com`)  
**Worker:** `fuelnfreetime`  
**D1:** `fuelnfreetime` (`9fd6ff92-e407-4b51-8b01-3c93f3845bb2`)

This doc explains **how the live runtime works** — routes, secrets, D1 tables, and debug paths. Use it when answering “why is X broken?” without re-reading source every session.

---

## Resend email — inbound + outbound

### Routes

| Direction | Worker route | Resend dashboard event(s) | Worker secret |
|-----------|--------------|---------------------------|---------------|
| **Inbound** | `POST /api/webhooks/resend/inbound` | `email.received` | `RESEND_WEBHOOK_SECRET_INBOUND` |
| **Outbound** | `POST /api/webhooks/resend/outbound` | `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed` | `RESEND_WEBHOOK_SECRET_OUTBOUND` |
| Legacy | `POST /api/agentsam/webhooks/resend` | Same as outbound (deprecated) | `RESEND_WEBHOOK_SECRET_OUTBOUND` or `RESEND_WEBHOOK_SECRET` |

**Outbound send API** uses `RESEND_API_KEY` (not a webhook secret). Default from-address: `RESEND_FROM` env var.

**Handler:** `src/webhooks/resend.js`  
**Signature verify:** Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) via `verifyResendWebhookPayload()` in `src/lib/resend.js`.

### Inbound flow (email.received)

```
Resend catch-all @fuelnfreetime.com
  → POST /api/webhooks/resend/inbound
  → verify RESEND_WEBHOOK_SECRET_INBOUND
  → log agentsam_webhook_events (processing)
  → log mail_webhook_events (audit)
  → fetch full body from Resend API (RESEND_API_KEY) if needed
  → UPSERT mail_messages (id = in_{provider_id}, direction = inbound)
  → match mailbox from mail_mailboxes by to-address
  → agentsam_webhook_events → processed | failed
```

**Common inbound failures:**

| Symptom | Likely cause | Check |
|---------|--------------|-------|
| Resend shows 401 | Wrong `RESEND_WEBHOOK_SECRET_INBOUND` | `wrangler secret list`, Resend webhook signing secret |
| Resend shows 500 | Handler throw (e.g. bad `to` shape) | Worker logs; `agentsam_webhook_events` where `status='failed'` |
| Webhook 200 but no inbox row | Address not in `mail_mailboxes` | D1 `mail_mailboxes`; labels still `primary` fallback |
| Row exists, empty body | Resend API fetch failed | `RESEND_API_KEY`; run `npm run mail:hydrate` |

### Outbound flow (send + lifecycle)

```
Admin compose → Resend API (RESEND_API_KEY)
  → INSERT mail_messages (direction = outbound, provider_id from Resend)
Resend lifecycle events
  → POST /api/webhooks/resend/outbound
  → UPDATE mail_messages.status (sent, delivered, bounced, …)
```

---

## Three AgentSam tables — why they’re separate

### `agentsam_hook` — outbound automation **we fire**

Things **we** trigger: POST to Cloudflare Builds deploy hook, call internal CMS warm, future Stripe routing.

| Row ID | `hook_key` | Trigger | What it does |
|--------|------------|---------|--------------|
| `hook_fnf_cms_deploy_build` | `fnf.cms.deploy_hook` | `pre_deploy` | POST → `CMS_DEPLOY_HOOK_URL` (Workers Builds) |
| `hook_fnf_post_deploy` | `fnf.post_deploy` | `post_deploy` | POST → `/api/internal/cms/warm` |
| `hook_fnf_cms_publish` | `fnf.cms.publish` | `post_deploy` | Same warm endpoint after admin publish |

**Why separate:** Registry + metadata for automation the platform runs. Not an HTTP endpoint Resend hits.

Seed/refresh: `npm run db:seed:agentsam-hooks-webhooks-v2`

### `agentsam_webhooks` — inbound endpoint **registry**

Things **providers** hit: Resend, Stripe, GitHub. Documents URL, allowed events, secret **name** (never raw value).

| Slug | `endpoint_id` | Active |
|------|---------------|--------|
| `resend-inbound` | `awh_resend_inbound` | yes |
| `resend-outbound` | `awh_resend_outbound` | yes |
| `resend-events` | `awh_resend_events` | no (legacy) |

**Why separate:** One row per external integration endpoint — ops dashboard + AgentSam know where to point Resend without reading wrangler secrets.

### `agentsam_webhook_events` — per-event **audit log**

Every webhook POST creates a row: payload, headers, signature result, IP, lifecycle status.

| Status | Meaning |
|--------|---------|
| `processing` | Verified, handler running |
| `processed` | Handler finished (mail updated) |
| `failed` | Auth failed or handler threw |
| `ignored` | Valid event type we don’t handle |

**Why separate:** High-volume append-only log. Registry rows are stable config; events are runtime telemetry. Query here first when debugging “Resend says Attempting” or missing mail.

**Helper:** `src/agentsam/webhook-events.js`  
**Linked by:** `endpoint_id` → `agentsam_webhooks.id`

```sql
SELECT id, endpoint_id, event_type, status, error_message, processing_error, received_at_unix
FROM agentsam_webhook_events
WHERE provider = 'resend'
ORDER BY received_at_unix DESC
LIMIT 20;
```

---

## Mail tables — `mail_messages` vs `mail_webhook_events`

| Table | Purpose | Written by |
|-------|---------|------------|
| **`mail_messages`** | User-facing inbox — subject, body, from/to, status, labels | Inbound webhook, outbound send, outbound status webhook |
| **`mail_webhook_events`** | Raw Resend payload audit for mail ops/backfill | Every Resend webhook (before/after processing) |

**Why both:** `mail_messages` is the product (what admin UI reads). `mail_webhook_events` is ops/backfill (`npm run mail:backfill`, `mail:hydrate`) when you need the original provider payload without re-hitting Resend.

**AgentSam canonical audit:** prefer `agentsam_webhook_events` for cross-system webhook debug; use `mail_webhook_events` for mail-specific backfill scripts.

---

## Per-user mailbox model

### Tables

| Table | Role |
|-------|------|
| `mail_mailboxes` | Address registry (`sam@`, `connor@`, `payments@`), owner, kind, access rules |
| `mail_members` | Team invite / membership (links auth user ↔ mailbox access) |
| `auth_users` | Login identity (email, role, display name) |

**Code:** `src/lib/mail-mailboxes.js` — `listMailboxes`, `getMailboxesForUser`, `canAccessMailbox`, `getPrimaryMailboxForUser`

### Access rules (`canAccessMailbox`)

1. `owner_user_id` matches logged-in `auth_users.id`
2. `owner_auth_email` matches logged-in email
3. `access_json.emails` includes user email
4. `access_json.roles` includes user role (e.g. `owner` for `payments@`)

### Nav + API enforcement

- **Shell nav** (`public/admin/js/shell.js`): builds email dropdown from `GET /api/admin/mail/mailboxes` — only mailboxes the user can access.
- **Mail API** (`src/admin/mail.js`): every list/read/send checks `canAccessMailbox` for requested mailbox.
- **Inbound routing:** webhook matches `to` address against `mail_mailboxes.address`; labels include mailbox slug.

**Debug Connor isolation:**

```sql
SELECT id, address, owner_auth_email, owner_user_id FROM mail_mailboxes;
SELECT id, email, role FROM auth_users;
```

Log in as Connor → nav should only show `connor@` (not `sam@`). If wrong, check `owner_auth_email` / `owner_user_id` on `mb_connor`.

---

## CMS + deploy hook flow

### Publish (no deploy needed)

```
Admin edit → D1 page_sections (draft)
Admin publish → KV cms:page:{slug}:v1
Public request → HTMLRewriter reads KV + store prefs → fills [data-cms] at edge
```

CMS publish does **not** require Workers Builds deploy hook.

### Code deploy + warm

```
git push main → Cloudflare Builds auto-deploy
  OR npm run cms:deploy-hook → POST CMS_DEPLOY_HOOK_URL (hook_fnf_cms_deploy_build)
npm run deploy → wrangler deploy → cms:post-deploy → POST /api/internal/cms/warm
```

| Secret / env | Used for |
|--------------|----------|
| `CMS_DEPLOY_HOOK_URL` | Local script + `hook_fnf_cms_deploy_build` metadata (Workers Builds POST) |
| `CMS_WARM_SECRET` | Header `X-Cms-Warm-Secret` on `/api/internal/cms/warm` |

**Warm endpoint:** rebuilds all 5 page KV snapshots from D1/R2. Runs automatically after `npm run deploy`.

**Edge hydration:** `src/cms/html-rewriter.js` + `src/cms/edge-hydrate.js`. Preview `?preview=1` skips edge slots (client draft hydrator runs instead).

See also: `docs/cms-deploy-hooks.md`

---

## AgentSam vector recall

Index: `fnf-agentsam-bge-m3-1024`  
Registry: D1 `agentsam_vector_chunks`  
Embed: `npm run agentsam:embed -- --source=repo` after changing docs in `REPO_DOC_PATHS`

Semantic search tool: `fnf_semantic_search` via `src/agentsam/fnf-vectorize.js`

---

## Quick debug checklist

| Issue | First look |
|-------|------------|
| Mail not arriving | Resend dashboard → webhook status; `agentsam_webhook_events` latest inbound rows |
| Wrong inbox / cross-user leak | `mail_mailboxes` + session user; `canAccessMailbox` |
| CMS stale on site | KV warm: `npm run cms:post-deploy`; check publish status in D1 `pages` |
| Deploy didn’t pick up code | Builds hook or `npm run deploy`; not needed for CMS-only publish |
| AgentSam drawer 500 | `/api/admin/agentsam/tools` — separate from mail/webhook stack (known blocker) |

---

## Related files

| Area | Path |
|------|------|
| Resend webhooks | `src/webhooks/resend.js` |
| Webhook event log | `src/agentsam/webhook-events.js` |
| Mailboxes | `src/lib/mail-mailboxes.js`, `src/admin/mail.js` |
| Hook/webhook seeds | `db/seed-agentsam-fnf-hooks-webhooks-v2.sql` |
| CMS edge | `src/cms/html-rewriter.js`, `src/cms/edge-hydrate.js`, `src/cms/deploy.js` |
| Embed script | `scripts/embed-fnf-content.mjs` |
