# Health, Basin and repository-quality telemetry — FNF reference installation

**Status:** SDK/FNF integration slice, not a production-deployed telemetry certification. Backend and React UI are implemented; local tests and Wrangler dry-run validate code/bindings. Real Cloudflare Analytics SQL and Basin reads require authorized runtime bindings/connector setup after deployment.

## Data authorities (no fake data)

| UI | Source and semantics | Missing source |
| --- | --- | --- |
| HTTP requests, 5xx error rate, requests/min | Cloudflare Analytics SQL binding, `events.httpRequests`, filtered to `fuelnfreetime.com` and `www.fuelnfreetime.com` | Unavailable |
| D1 operations, costs, history, failures | Existing tenant-scoped `agentsam_analytics` ledger (`account_id`), existing published schema | Unavailable |
| Repository/drift events | Existing D1 `github` / `deployment` events and errors whose codes contain drift/contract/schema; **not** invented from README | 'No repository-audit receipts ingested yet' |
| D1 scheduled probes | Existing `agentsam_analytics` events with `event_name='health.probe'`; count actual passing/observed checks | Waiting for samples |
| Basin | Existing installed integration/configuration plus an **authorized** Basin provider adapter returning real catalogs/pipelines | Hidden or connection-required |

Do **not** infer 'All systems operational' or a 30-day uptime percentage from successful HTTP responses or sporadic probe events. The probe checks D1 availability and is not a general origin health check; failed D1 writes may make missing probes invisible in the D1 ledger. Until an independent durable sink reports missed probes, present only *observed sample coverage*, never comprehensive uptime.

## Architecture boundaries

- SDK `@inneranimalmedia/agentsam-connector-cloudflare`: `createCloudflareAnalyticsSqlClient` owns safe SQL binding usage, retries, and source error normalization; `discoverBasinResources` uses **authorized** Cloudflare REST `GET /basin-catalog` and `GET /pipelines/v1/pipelines`. No browser credentials.
- SDK `@inneranimalmedia/agentsam-analytics`: `InfrastructureHealthReadModel`, `BasinCapability`, `RepositoryQualityReadModel`, and `recordOperation` positional Analytics Engine writer. The published package must be updated and adopted before FNF can import these new exports as stable dependencies; the FNF host currently makes one narrow account-scoped Analytics SQL query directly.
- FNF backend `backend/admin/analytics-health.js`: installation-specific normalized read view over its existing D1 analytics event authority and the Workers Analytics SQL binding; account/hostname resource filters are configured here, not React. `GET /api/admin/analytics/health` is behind the existing session gate.
- Reusable FNF `@inneranimalmedia/commerce-analytics`: `BasinOverviewPanel` owns Basin UI; future repositories consume this component by providing their actual normalized Basin capability state.
- FNF `HealthPage.tsx` only renders normalized data, range queries, refresh/alerts controls, and unavailable states. It contains no `genSeries` telemetry, fake Supabase services, made-up regions, fabricated CPU/memory/disk/network percentages, or fictional incidents.

## Cron semantics

`wrangler.toml` triggers: `0 4 * * *` = existing daily compaction; `0 * * * *` = existing hourly asset stale-job recovery; **`*/30 * * * *` = D1 health probe every 30 minutes**. Explicit equality routing in Worker `scheduled()` prevents an unrelated trigger from executing compaction. Cron is UTC; exact Cloudflare activation timing after deployment is not immediate. No one-minute polling Cron is added.

## Basin feature flag and host contract

Basin is not Analytics SQL and does not have an interchangeable Worker binding. Host adapters inspect an OAuth/Cloudflare API connection with catalog/pipeline permissions and return *actual* discovered names, status, and optional table counts. `BasinOverviewPanel` returns `null` when `basin.enabled=false`. A configured warehouse or installed plugin only enables the connection-required state, never a fake connected warehouse. `BASIN_OVERVIEW_ADAPTER.inspect({accountId})` is an injectable host capability seam—not an active native Wrangler binding yet. Do not assume a JavaScript function exists on a deployed Worker env without a host adapter that explicitly supplies it.

## Quality metrics and what remains

- Existing D1 records provide observed operation counts, success/failure events, recent error codes, estimated model costs, and failure/latency trends by day. This is the first truthful visual slice.
- Repository contract drifts discovered by CLI/CI still need a **verified event-ingestion workflow** feeding the canonical analytics authority. Until actual receipts exist, the UI says so instead of showing invented drift trend numbers.
- The SDK Analytics Engine event writer is implemented and tested but is not yet wired to FNF host events because new SDK exports have not been released into FNF's lockfile. Do not duplicate the writer as `fnf-analytics-*` in the meantime.
- Basin Iceberg catalog-table enumeration and historical query/lag views require provider-specific permissions/discovery beyond initial warehouse/pipeline inventory. The UI displays such data only when explicitly supplied.
- Cloudflare Analytics SQL Worker binding requires Wrangler >=4.145.0, and is remote even in local development. Local tests mock the binding and validate no fabricated values. Test authorized live datasets separately before production release.

## Run locally

```sh
node --test tests/health-telemetry.test.mjs
npm run build:admin
./node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/fnf-health-dry-run
```

Once deployed, verify real `/api/admin/analytics/health?range=24h` with an authenticated FNF admin session, check native source availability, and wait for two or more 30-minute probe samples before expecting a meaningful probe trend. Do not publish credentials, raw customer data, prompts or entire log messages to the browser.
