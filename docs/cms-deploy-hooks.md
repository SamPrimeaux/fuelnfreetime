# CMS deploy hooks + HTMLRewriter

## HTMLRewriter (edge SEO + body slots)

**No npm install** — `HTMLRewriter` is built into the Cloudflare Workers runtime.

Marketing pages (`/`, `/shop`, `/about`, `/community`) are served through the Worker, which:

1. Fetches static HTML from Workers Assets
2. Rewrites `<title>`, meta description, Open Graph, and Twitter tags from **store prefs + published CMS page title**
3. Fills `[data-cms]` slots from published KV/D1 snapshots (same rules as `cms-hydrate.js`)
4. Adds `cms-edge-hydrated` on `<html>` so the client hydrator skips (no flash)

Preview mode (`?preview=1`) skips edge slot fill — client hydrator loads draft content.

Implementation: `src/cms/html-rewriter.js`, `src/cms/edge-hydrate.js`

Client-side `fnf-head.js` still runs as a fallback for prefs updated after cache.

## Deploy hook (`fuelnfreetime-cms-deployhook`)

Registered in D1 as **`agentsam_hook`** row `hook_fnf_cms_deploy_build` (`hook_key`: `fnf.cms.deploy_hook`).

Post-deploy CMS warm is **`hook_fnf_post_deploy`** (`fnf.post_deploy`).

Resend inbound/outbound endpoints are in **`agentsam_webhooks`** as `resend-inbound` and `resend-outbound`.

Apply or refresh registry:

```bash
npm run db:seed:agentsam-hooks-webhooks-v2
```

Your Workers Builds hook triggers a **rebuild + deploy from `main`**:

```
POST https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/0cbd475b-93c4-458a-ba72-0499a1caff90
```

Add to `.env.cloudflare` (never commit):

```
CMS_DEPLOY_HOOK_URL=https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/0cbd475b-93c4-458a-ba72-0499a1caff90
```

Trigger manually:

```bash
npm run cms:deploy-hook
```

**When to use:** Worker code or static asset changes in git.  
**When NOT needed:** CMS publish from admin — that updates D1/R2/KV live; HTMLRewriter reads prefs/KV on each request.

## Post-deploy CMS warm

After `npm run deploy`, `cms:post-deploy` rebuilds all KV snapshots from D1/R2.

Set Worker secret once:

```bash
wrangler secret put CMS_WARM_SECRET
```

Add the same value to `.env.cloudflare` as `CMS_WARM_SECRET` for local scripts.

Internal endpoint (for CI/scripts):

```
POST /api/internal/cms/warm
Header: X-Cms-Warm-Secret: <CMS_WARM_SECRET>
```

Admin (session required):

```
POST /api/admin/cms/warm
```

## Typical flows

| Action | Command |
|--------|---------|
| Edit + publish in admin | Auto KV write on publish — no deploy hook |
| Push code to main | Cloudflare Builds auto-deploys |
| Force rebuild from hook | `npm run cms:deploy-hook` |
| Deploy from laptop | `npm run deploy` (includes post-deploy warm) |
| Fix stale KV after migration | `npm run cms:republish` |
