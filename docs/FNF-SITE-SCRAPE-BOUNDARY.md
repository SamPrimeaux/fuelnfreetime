# FNF site discovery and crawler boundary

**Updated:** 2026-10-07
**Scope:** `apps/ecommerce-cms-agentsam` storefront and Preferences UI

## Ownership

FNF owns store identity, the public route manifest, active-product visibility, and the storefront's public search-discovery files. It serves:

- `GET|HEAD /robots.txt` from the verified HTTPS `company.website_url`.
- `GET|HEAD /sitemap.xml` from the indexable storefront route manifest and active product catalog.
- An authenticated Preferences read model that reports actual public URL counts and whether an `AGENTSAM_SITE_SCRAPE` service binding is present. Binding presence is informational only; FNF does not invoke it yet.

FNF does **not** own crawl execution, crawl history, host politeness, frontier state, crawler credentials, a second audit trail, or retained page evidence. There is no FNF crawl cron or `store_crawler_*` migration.

## Crawler authority

The reusable crawler capability is `site.scrape`, package `agentsam-site-scrape`, in the separate `SamPrimeaux/agentsam-sdk` repository at `packages/agentsam-site-scrape/`. The package source is not vendored in this FNF checkout. The current package is a Python CLI (discovery, crawl, parse, media classification/optimization, and optional R2 organization); it is not currently an FNF Worker binding or an admin run API.

Do not infer or invent an HTTP/service-binding protocol from the catalog entry. Connect a Preferences action only after the SDK defines a callable runtime contract and exposes run receipts to FNF. Until then the UI must describe the connection state honestly and remain limited to public discovery; it must not imply that refreshing counts starts a crawl.

## Future SDK-side contract

If crawler persistence is added, it belongs with the crawler authority and should use the generic tables:

- `agentsam_crawl_runs`
- `agentsam_crawl_hosts`
- `agentsam_crawl_frontier`
- `agentsam_crawl_pages`
- `agentsam_crawl_fetches`

Keep `site_origin` as a run snapshot; scope open-run uniqueness by account plus site/origin. Put host politeness/robots state on hosts, normalized URL identity on the frontier, leases on claimed frontier items, page identity apart from fetch history, and optional raw HTML in R2 rather than D1. Reuse platform identity and shared audit systems; do not add crawler-specific credentials, nonces, rate-limit tables, or audit tables.

The owning package should retain the existing Python parser and bound harvesting by bytes, redirects, pages, depth, per-host requests, wall time, and errors. Cloudflare extraction may be added as an adapter under the same contract, not as a replacement parser or a parallel FNF crawler. Browser rendering is an explicit escalation through existing browser capabilities only.
