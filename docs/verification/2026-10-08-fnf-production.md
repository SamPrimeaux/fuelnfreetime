# FNF production release proof — 2026-10-08

**Release:** `fuelnfreetime` Worker on `fuelnfreetime.com` and `www.fuelnfreetime.com`.

## Deployed release provenance

| Field | Observed |
| --- | --- |
| Git source | `46ecdac008e94cc61f8440e52d408e7e505c999f` (merged `main` including package-authority fix #67) |
| Cloudflare Worker version | `a40d07b0-2624-4ae5-b0b3-a4f280b75e24` |
| Deployment result | `wrangler deploy`: successful Worker upload, custom domains, Queue producer/consumer and all three scheduled triggers |
| Static assets | 310 files enumerated, 1 changed uploaded; public `/js/revise-atlas.js` HTTP 200 and SHA-256 identical to source build |
| Public asset hash | `ac6cc193b6f587ef822fd3939b5fee2d0003cce3633e1ac03d7b8c00cb700c34` |
| Baseline code gates | `npm run check:authority`, `npm run build:admin`, `wrangler deploy --dry-run` passed before deployment |
| Scope | Worker/static assets and schedules only; no D1 migration, no cms post-deploy script, no customer data mutation |

## Observed public production responses

- `GET https://fuelnfreetime.com/api/health`: **200**, `ok:true`; existing JSON asserts present bindings: `db/r2/ai/kv/cms/assets/assetJobs`. This endpoint does not currently report Analytics SQL/Engine readiness or Git SHA; do not infer them.
- `HEAD /admin/analytics/health`: **302** to `/admin/login` for anonymous request.
- `GET /api/admin/analytics/health`: **401** anonymous; no privileged telemetry returned.
- `GET /api/admin/analytics/logs/recent`: **401** anonymous; no privileged log records returned.
- `GET /js/revise-atlas.js`: **200**, bytes SHA-256 match the build made from the deployed Git source.
- Worker `wrangler deploy` bindings include D1, R2, KV, Queue, AI, Vectorize and **ANALYTICS_SQL**, and schedules `0 4 * * *`, `0 * * * *`, `*/30 * * * *`.

## Operational observations and unresolved acceptance

| Proof gate | Status | Notes |
| --- | --- | --- |
| Merge state + build/guard + Worker deploy | **PASS** | SHA/version above |
| Public Worker health and static integrity | **PASS** | 200 + hash identity |
| Admin auth boundary | **PASS (anonymous)** | Protected routes redirect/reject |
| Health authenticated API with real Analytics SQL query | **UNVERIFIED** | Requires authorized admin session and active dataset; binding presence alone is insufficient |
| Live Logs Start / real Log Explorer events / Copy / Ask AgentSam on production | **UNVERIFIED** | Chrome mock/DOM tests passed in PR #65, but authenticated mounted production hasn't been tested |
| Worker secret `CLOUDFLARE_API_TOKEN` exists | **CONFIGURED** | Read-only Wrangler secret-name listing, permissions/dataset **not** validated |
| Actual `health.probe` receipt | **NOT YET OBSERVED** | Remote D1 aggregate `samples=0`, `passed=0`, `last_at=null` at proof time; first scheduled interval after deployment is expected around 02:30 UTC, not guaranteed. A successful deploy is not an uptime receipt |
| Analytics Engine dataset binding | **NOT CONFIGURED IN DEPLOYED WRANGLER** | SDK operations writer exists, but FNF Worker bindings only include Analytics SQL, not an Analytics Engine dataset. Do not claim operational event ingestion via Analytics Engine |
| Basin | **OPTIONAL / NOT VERIFIED** | No requirement to enable it. Show truthful unavailable/setup state |
| Authenticated screenshots at 390/744/1440 and Health mounted controls | **BLOCKED** | Needs an authorized browser session. Local desktop tunnel/desktop device went offline during audit; don't claim screenshot proof |
| Merchant creation→media→draft→publish→public storefront | **NOT YET EXECUTED** | Must be separately proven without overwriting existing merchant production content |
| Golden-path cross-tenant portability | **NOT STARTED** | Merchant #2 only after successful FNF golden path |

## Required next acceptance steps (do not label complete without evidence)

1. Restore authorized desktop/browser connection and open production `/admin/analytics/health` as a real admin; capture actual screenshots and API response source labels.
2. Query Live Logs with **Start**, verify a **real Cloudflare row**, select two rows, Copy, Ask AgentSam; inspect structured context + editable prompt; confirm no automatic execution; Stop and verify zero subsequent requests.
3. Verify Analytics SQL's real query and source reporting. Inspect logs token's **Logs Read** scope and Log Explorer dataset readiness without reading or disclosing credentials.
4. After the first 30-minute scheduled tick, query **only aggregated** `agentsam_analytics` `event_name='health.probe'` counts and timestamp. A missing sample must be reported as missing (not as healthy uptime).
5. Keep Basin optional; if not configured, confirm disabled/unavailable. No new data sink to satisfy UI.
6. Prove one real merchant media/section/product private draft → preview → publish → public route with before/after receipts, and test safe rollback.

**Boundary:** this file is a release receipt and truthful acceptance ledger. It does not implement a new health/reporting subsystem or substitute tests for the mounted product.
