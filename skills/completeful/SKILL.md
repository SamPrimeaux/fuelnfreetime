---
name: Completeful - Fuel & Free Time
description: Operate and extend Fuel & Free Time's Completeful Partner API integration. Use for Completeful shops, catalog sync/search, product mapping, designs, assets, mockups, exports, order quotes/creates, webhooks, provider errors, and fulfillment debugging.
skill_domain: commerce
task_types: completeful,commerce,products,designs,assets,mockups,orders,fulfillment,webhooks
access_mode: read_write
slash_trigger: completeful
sort_order: 4
globs: docs/RUNTIME-CONTRACTS-COMPLETEFUL.md,docs/providers/completeful/**,src/completeful/**,src/admin/completeful.js,src/webhooks/completeful.js,db/migrate-completeful.sql
---

# Completeful - Fuel & Free Time

This skill is scoped to `ws_fuelnfreetime`.

Completeful is the external provider for catalog/design/mockup/fulfillment operations. Fuel & Free Time remains authoritative for storefront identity, local retail pricing, Stripe payment state, local products/variants, local orders, and customer-facing admin state.

## Runtime authority

Read these before changing provider behavior:

- `docs/RUNTIME-CONTRACTS-COMPLETEFUL.md`
- `docs/providers/completeful/openapi.json`
- `src/completeful/client.js`
- `src/completeful/catalog.js`
- `src/admin/completeful.js`
- `src/webhooks/completeful.js`
- `db/migrate-completeful.sql`
- `wrangler.toml`

D1:

- binding: `DB`
- database: `fuelnfreetime`
- database id: `9fd6ff92-e407-4b51-8b01-3c93f3845bb2`

Provider:

- `CAPP_API_URL=https://vxapi.completeful.com`
- API contract root: `https://vxapi.completeful.com/v1`
- `CAPP_KEY` is a Worker secret
- `COMPLETEFUL_ALLOW_LIVE_WRITES=false` until live cutover is explicitly enabled

Never expose `CAPP_KEY` to browser code.

## Provider request rules

1. Authenticate server-side with `Authorization: Bearer <CAPP_KEY>`.
2. Prefer `capp_test_` during integration and mutation testing.
3. Test mutations are dry runs; inspect `X-Capp-Mode` and `X-Capp-Dry-Run`.
4. Use explicit `/v1/shops/{shopId}/...` routes for shop-scoped resources.
5. Use `Idempotency-Key` on creates/actions.
6. Preserve provider `code`, `request_id`, `path`, `details`, and `remediation` on failures.
7. Public artwork/webhook URLs must resolve to public http(s) destinations.
8. A live key does not authorize mutation unless `COMPLETEFUL_ALLOW_LIVE_WRITES=true`.

## Authority split

F&FT remains authoritative for:

- `products`
- `product_variants`
- local SKU
- retail price
- storefront copy/curation
- Stripe payment state
- `orders`
- `order_items`

Completeful mirror/link rows describe provider state and mappings. Never overwrite the local SKU or retail price from provider values.

## Existing admin API

Prefer the authenticated F&FT admin API for implemented operations:

- `GET /api/admin/completeful/status`
- `GET /api/admin/completeful/shops`
- `GET /api/admin/completeful/shops?refresh=1`
- `POST /api/admin/completeful/shops/refresh`
- `POST /api/admin/completeful/shops/{shopId}/select`
- `GET /api/admin/completeful/catalog`
- `GET /api/admin/completeful/catalog/{productId}`
- `POST /api/admin/completeful/catalog/sync`

If a route is not in `src/admin/completeful.js`, do not pretend it exists. Extend the Worker deliberately.

## D1 mirror + linkage

Mirror/provider evidence:

- `completeful_shops`
- `completeful_catalog_products`
- `completeful_catalog_variants`
- `completeful_catalog_print_locations`
- `completeful_catalog_images`
- `completeful_catalog_mockups`
- `completeful_catalog_curation`
- `completeful_catalog_sync_state`

Local/provider links and mutation lifecycle:

- `completeful_product_links`
- `completeful_variant_links`
- `completeful_order_links`
- `completeful_operations`
- `completeful_webhook_subscriptions`
- `completeful_webhook_events`

Provider JSON is mirror/evidence. Keep local curation separate so refreshes do not destroy local decisions.

## Catalog workflow

1. Read `/api/admin/completeful/status`.
2. Confirm a primary shop.
3. Browse/search the local D1 mirror first.
4. Refresh shops only when needed.
5. Run bounded catalog sync through `POST /api/admin/completeful/catalog/sync`.
6. Inspect `completeful_catalog_sync_state` and mirror counts.
7. Resolve product/variant/print-location/mockup identities before mutation.

For semantic catalog tooling, use an actual registered `agentsam_tools` capability when present. If `completeful_catalog_semantic_search` is not yet registered, treat it as a tool-registration task, not as an existing callable.

## Designs

Provider operations include:

- `GET /v1/designs`
- `POST /v1/designs`
- `GET /v1/designs/{designId}`
- `PATCH /v1/designs/{designId}`
- `DELETE /v1/designs/{designId}`
- `POST /v1/designs/{designId}/exports`
- `GET /v1/designs/exports/{exportId}`

A design can wrap a public F&FT art file using `artfile_url` / `image_url`, or use `canvas_json`.

For generated AgentSam creative:

1. Generate/approve art through the F&FT creative pipeline.
2. Store it in `WEBSITE_ASSETS` and register `media_assets`.
3. Convert the local media route to a public URL such as `https://fuelnfreetime.com/media/{r2_key}`.
4. Create the Completeful design with an idempotency key.
5. Persist the returned design ID only in the appropriate linkage/operation record.

## Assets

Completeful asset operations include provider-side creation/upload-from-URL and lookup. Keep F&FT R2 as the local media source of truth when the asset originated in F&FT.

Do not duplicate binary blobs into D1.

## Catalog mockups and renders

Discovery:

- `GET /v1/catalog/products/{productId}/print-locations`
- `GET /v1/catalog/products/{productId}/mockups`
- `GET /v1/catalog/products/{productId}/assets`
- `GET /v1/catalog/products/by-sku/{sku}`

Render:

- `POST /v1/mockups/renders`
- `GET /v1/mockups/renders/{renderId}`

Render input requires a provider `mockup_id` and public `art_url`. Use output options such as format, max size, and clipping to the print area.

A render may complete synchronously or return a queued/running render ID. Poll only the provider render status endpoint for that job.

## Product mapping

Use:

- `completeful_product_links`
- `completeful_variant_links`

A local F&FT product/variant remains the storefront entity. Link it to provider catalog/store/design identifiers without copying provider authority into the local product row.

## Order workflow

1. Start from a paid/local F&FT order.
2. Resolve every local variant through `completeful_variant_links`.
3. Quote the provider fulfillment contract.
4. Persist quote snapshot/version on `completeful_order_links`.
5. Use a deterministic idempotency key.
6. With a test key, verify dry-run behavior and retry safety.
7. Only perform live create/actions after explicit production cutover.

Do not use caller retail totals as Completeful fulfillment cost.

## Webhooks

Receiver:

`POST https://fuelnfreetime.com/api/webhooks/completeful`

Current implementation is topic-secret based.

For event type `<topic>`, `src/webhooks/completeful.js` resolves:

`COMPLETEFUL_WEBHOOK_SECRET_<NORMALIZED_TOPIC>`

Examples:

- `ping` -> `COMPLETEFUL_WEBHOOK_SECRET_PING`
- `order:updated` -> `COMPLETEFUL_WEBHOOK_SECRET_ORDER_UPDATED`

Do not rely on the older generic `COMPLETEFUL_WEBHOOK_SECRET` documentation unless the receiver is changed to match it.

Verification contract:

- raw body
- `X-Capp-Signature: t=<unix>,v1=<hex>`
- HMAC-SHA256 over `<unix>.<rawBody>`
- timing-safe comparison
- 5-minute stale-signature window
- record event in `completeful_webhook_events`
- acknowledge verified events quickly
- implement topic-specific downstream dispatch separately and idempotently

Never store signing-secret values in D1.

## Failure handling

On provider failure capture:

- HTTP status
- provider code
- request ID
- path
- details
- remediation

Use `completeful_operations` for mutation lifecycle/retry diagnostics. Do not turn it into a log of every GET.

## Verification

```sql
SELECT
  (SELECT COUNT(*) FROM completeful_shops) AS shops,
  (SELECT COUNT(*) FROM completeful_catalog_products) AS catalog_products,
  (SELECT COUNT(*) FROM completeful_catalog_variants) AS catalog_variants,
  (SELECT COUNT(*) FROM completeful_product_links) AS product_links,
  (SELECT COUNT(*) FROM completeful_order_links) AS order_links,
  (SELECT COUNT(*) FROM completeful_webhook_subscriptions) AS webhook_subscriptions,
  (SELECT COUNT(*) FROM completeful_webhook_events) AS webhook_events;
```

```sql
SELECT id, slug, file_path, retrieval_strategy, version, is_active
FROM agentsam_skill
WHERE slug = 'completeful';
```

Expected skill object:

`r2://fuelnfreetime/agentsam/skills/completeful/SKILL.md`
