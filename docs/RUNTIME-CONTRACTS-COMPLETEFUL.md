# Completeful integration runtime contract

## Product studio presentation (September 2026)

`apps/ecommerce-cms-agentsam/frontend/src/pages/products/` owns the catalog, independent product detail, and artwork workspace at `/admin/products/create` and `/admin/products/create/:productId`. The app-owned `shell.js` owns navigation; the product studio owns only its content surface. Detail URLs use the same session-gated Worker SPA fallback as the catalog.

The UI uses existing catalog list/detail/status/sync, media list/upload, and AgentSam chat endpoints. Catalog reads consume `items`, use `search`, and page through `pagination.has_more`; details load independently of the currently visible page. Provider imagery falls back from realistic to cover to icon, then an explicit unavailable state.

Artwork placement, notes, and downloaded/restored layout files are browser editing state. PNG export uses the provider file dimensions **and unit**, converting physical units using provider DPI or the clearly stated 300 DPI recommendation. Missing units prevent pixel export. Safe-area guides are advisory, not provider-certified bleed boundaries. SVG/PDF originals are accepted by the existing media uploader; PDF requires a raster preview for the canvas. Studio uploads are limited to 20 MB in this interface.

The contextual creative composer calls the existing AgentSam creative workflow; it does not introduce a new AI provider or server endpoint. Provider mockup images are explicitly labeled references, not completed artwork renders. Product merchandising and publication remain in `/admin/product-edit`; this UI does not establish provider fulfillment links or publish products. The provider mutation and order phases below remain separate requirements.

Status: Phase A runtime implemented; provider credential + first sync pending
Branch: `feat/completeful-runtime-phase-a`

## Goal

Integrate Fuel & Free Time with the Completeful Partner API without making Completeful the source of truth for local storefront identity, retail pricing, payments, or admin state.

Fuel & Free Time remains authoritative for:

- local `products` / `product_variants`
- retail price and storefront copy
- Stripe payment state
- local `orders` / `order_items`
- customer-facing fulfillment state shown in the F&FT admin

Completeful becomes the external fulfillment/catalog provider.

The provider contract is pinned under `docs/providers/completeful/`.

## Provider rules we must preserve

- Use `Authorization: Bearer <CAPP_KEY>`.
- Prefer `capp_test_` keys during integration.
- Test-key mutations are provider dry-runs and should return `X-Capp-Mode: test` and `X-Capp-Dry-Run: true`.
- Shop resources use explicit `/v1/shops/{shopId}/...` routes.
- Use `Idempotency-Key` on create/action calls.
- Preserve provider `code`, `request_id`, `path`, and `remediation` fields on failures.
- Webhook and artwork URLs must resolve to public destinations.
- Webhook signing secrets are returned only when a subscription is created or rotated.

## D1 plan

Maintain the normalized Completeful catalog mirror in D1 so the admin can browse/search without repeatedly rediscovering provider state. Keep local storefront identity, retail pricing, curation, orders, and payments authoritative in F&FT; provider JSON remains mirror/evidence rather than local business authority.

### 1. `completeful_shops`

Purpose: record the Completeful shop(s) this F&FT deployment is allowed to operate against.

Proposed columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `completeful_shop_id TEXT NOT NULL UNIQUE`
- `kind TEXT`
- `name TEXT`
- `display_name TEXT`
- `domain TEXT`
- `marketplace TEXT`
- `currency TEXT`
- `is_primary INTEGER NOT NULL DEFAULT 0`
- `is_active INTEGER NOT NULL DEFAULT 1`
- `marketplace_readiness_json TEXT`
- `last_synced_at TEXT`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

No API keys or webhook secrets belong here.

### 2. `completeful_product_links`

Purpose: map an F&FT product to its Completeful shop product/catalog/design identity.

Proposed columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE`
- `completeful_shop_id TEXT NOT NULL`
- `completeful_store_product_id TEXT`
- `completeful_catalog_product_id TEXT`
- `completeful_design_id TEXT`
- `completeful_design_option_id TEXT`
- `selection_json TEXT`
- `sync_status TEXT NOT NULL DEFAULT 'unlinked'`
- `last_request_id TEXT`
- `last_error_code TEXT`
- `last_error_message TEXT`
- `last_synced_at TEXT`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
- unique `(product_id, completeful_shop_id)`

### 3. `completeful_variant_links`

Purpose: map each local sellable `product_variants` row to the provider catalog child / tuple used for fulfillment.

Proposed columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE`
- `product_link_id INTEGER NOT NULL REFERENCES completeful_product_links(id) ON DELETE CASCADE`
- `completeful_catalog_product_id TEXT`
- `completeful_catalog_variant_id TEXT`
- `completeful_store_product_id TEXT`
- `print_location_ids_json TEXT`
- `patch_material_option_id TEXT`
- `selection_json TEXT`
- `provider_sku TEXT`
- `last_synced_at TEXT`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
- unique `variant_id`

Do not overwrite the local F&FT SKU or retail price with provider values.

### 4. `completeful_order_links`

Purpose: one durable fulfillment relationship between a paid F&FT order and Completeful.

Proposed columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE`
- `completeful_shop_id TEXT NOT NULL`
- `completeful_order_id TEXT UNIQUE`
- `external_order_id TEXT NOT NULL UNIQUE`
- `idempotency_key TEXT NOT NULL UNIQUE`
- `quote_json TEXT`
- `quote_version TEXT`
- `provider_status TEXT`
- `fulfillment_status TEXT`
- `tracking_json TEXT`
- `last_request_id TEXT`
- `last_error_code TEXT`
- `last_error_message TEXT`
- `submitted_at TEXT`
- `last_synced_at TEXT`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

The F&FT local order remains the primary order record.

### 5. `completeful_operations`

Purpose: durable idempotency / retry ledger for provider mutations beyond order creation.

Use for operations such as:

- design creation
- product create/update/publish
- mockup render requests
- webhook creation/rotation/redelivery
- order actions

Proposed columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `operation_key TEXT NOT NULL UNIQUE`
- `operation_type TEXT NOT NULL`
- `local_entity_type TEXT`
- `local_entity_id TEXT`
- `completeful_shop_id TEXT`
- `idempotency_key TEXT NOT NULL UNIQUE`
- `status TEXT NOT NULL DEFAULT 'pending'`
- `provider_resource_id TEXT`
- `provider_request_id TEXT`
- `response_status INTEGER`
- `error_code TEXT`
- `error_message TEXT`
- `remediation TEXT`
- `attempt_count INTEGER NOT NULL DEFAULT 0`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

Do not use this as a giant HTTP log. Persist only mutation lifecycle and diagnostics required for retry/support.

### 6. `completeful_webhook_subscriptions`

Purpose: local metadata for provider subscriptions.

Proposed columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `completeful_shop_id TEXT NOT NULL`
- `completeful_webhook_id TEXT NOT NULL UNIQUE`
- `topic TEXT NOT NULL`
- `target_url TEXT NOT NULL`
- `status TEXT NOT NULL`
- `secret_last4 TEXT`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

Never store the signing secret itself in D1.

### 7. `completeful_webhook_events`

Purpose: inbound dedupe and processing diagnostics.

Proposed columns:

- `event_id TEXT PRIMARY KEY`
- `completeful_shop_id TEXT`
- `completeful_webhook_id TEXT`
- `topic TEXT NOT NULL`
- `provider_created_at TEXT`
- `received_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `processed_at TEXT`
- `processing_status TEXT NOT NULL DEFAULT 'received'`
- `attempt_count INTEGER NOT NULL DEFAULT 0`
- `payload_json TEXT`
- `last_error TEXT`

Retain a bounded payload suitable for replay/debugging; do not persist secrets.

## Catalog mirror decision

Fuel & Free Time intentionally maintains a local Completeful catalog mirror so the admin does not have to rediscover and sort hundreds of provider options on every browse.

The mirror is normalized into:

- `completeful_catalog_products`
- `completeful_catalog_variants`
- `completeful_catalog_print_locations`
- `completeful_catalog_images`
- `completeful_catalog_mockups`
- `completeful_catalog_curation`
- `completeful_catalog_sync_state`

Provider JSON is also retained on mirror rows for forward compatibility. Local curation is stored separately from mirrored provider fields, so favorites/hiding/priority survive provider refreshes without corrupting the provider snapshot.

We still do not build:

- a duplicate Completeful request/activity log for every GET request
- an API-key table
- a webhook-secret table
- duplicate customer/order tables that compete with F&FT `orders` / `order_items`

The schema is defined in `db/migrate-completeful.sql`.

## Secrets and variables

### Required now

Worker secret:

- `CAPP_KEY` — start with a `capp_test_` key.

Non-secret runtime variable:

- `CAPP_API_URL=https://vxapi.completeful.com`

Local development may load these through a gitignored environment file, but production must use a Cloudflare Worker secret for `CAPP_KEY`.

### Required when webhooks are created

Use one integration signing secret per deployed F&FT environment:

- `COMPLETEFUL_WEBHOOK_SECRET`

Generate it ourselves and pass the same value when creating each Completeful subscription for the F&FT webhook receiver. This keeps raw-body verification independent of untrusted event/topic fields and avoids storing a separate secret for every topic.

Completeful can also generate a secret on create/rotation, but it is revealed only once. If we ever allow provider-generated per-subscription secrets instead, each secret must be captured immediately into Worker secrets and verification must safely support key rotation.

Do not put signing secrets in D1.

### Production safety variable

- `COMPLETEFUL_ALLOW_LIVE_WRITES=false`

Keep false until the production cutover checklist passes.

## API-key scope strategy

The provider contract states that scoped keys use broad per-resource read/write scopes, with `products:read` / `products:write` given as examples. The supplied OpenAPI does not enumerate every exact scope string per route.

Integration sequence:

1. Start with a `capp_test_` key intended for development.
2. If using explicit scopes, grant the Completeful dashboard's read/write scopes needed for shops, catalog, designs/assets/mockups, products, orders, and webhooks.
3. On a 403, preserve and inspect the provider's `required_scopes` field instead of guessing.
4. Once our actual call graph is known, issue a least-privilege production `capp_live_` key.

Do not grant `referrals:read` for this integration; referrals are unrelated to F&FT fulfillment.

## Webhook endpoint

Target:

`POST https://fuelnfreetime.com/api/webhooks/completeful`

Requirements:

- use the raw request body for signature verification
- parse `X-Capp-Signature: t=<unix>,v1=<hex>`
- compute HMAC-SHA256 over `<unix>.<rawBody>`
- timing-safe compare
- reject stale signatures
- claim `event.id` in `completeful_webhook_events` before side effects
- return 2xx only after the event has been safely accepted
- make every downstream update idempotent

## Initial webhook topics

Order lifecycle first:

- `order:created`
- `order:updated`
- `order:sent-to-production`
- `order:cancelled`
- `order:refunded`
- `order:shipment:created`

After product sync exists, consider:

- `product:created`
- `product:updated`
- `product:deleted`
- `product:publish:started`
- `product:publish:succeeded`
- `product:publish:failed`

If we depend on Completeful catalog-change synchronization, consider:

- `catalog:product:created`
- `catalog:product:updated`
- `catalog:product:price_changed`
- `catalog:product:availability_changed`

Also keep `ping` available for endpoint verification. `shop:disconnected` should be subscribed once shop connectivity becomes a production dependency.

## Phase A runtime surface (implemented)

The Worker now owns a server-only Completeful client and D1 catalog mirror sync.
CAPP_KEY never reaches browser code. The initial session-gated admin surface is:

- GET /api/admin/completeful/status — configuration mode, live-write kill switch, sync state, mirror counts
- GET /api/admin/completeful/shops — local shop registry; refresh=1 also refreshes from provider
- POST /api/admin/completeful/shops/refresh — refresh accessible shops from Completeful
- POST /api/admin/completeful/shops/{shopId}/select — choose the primary F&FT shop
- GET /api/admin/completeful/catalog — browse/search the local D1 mirror
- GET /api/admin/completeful/catalog/{productId} — product + variants + print locations + images + mockups
- POST /api/admin/completeful/catalog/sync — bounded cursor-based provider to D1 synchronization

The provider client accepts either https://vxapi.completeful.com or a /v1 base,
preserves structured provider errors/request IDs, and defaults live writes off.
Catalog child rows are rebuilt from each enriched provider product while
completeful_catalog_curation remains local-only and untouched.

The production schema is already deployed. The remaining external prerequisite
for the first real provider call is installing a capp_test_ value as the Worker
secret CAPP_KEY.

## Build phases

### Phase A — read-only connection

- [x] add Completeful client
- [x] add session-gated admin status endpoint
- [x] list/refresh shops endpoint
- [x] primary-shop selection endpoint
- [x] local catalog browse/search endpoints; real provider smoke test still pending credential
- [ ] confirm test-mode headers against real provider
- [x] use the already-deployed Completeful schema + normalized catalog mirror
- [ ] install `CAPP_KEY` with a `capp_test_` credential

### Phase B — product mapping

- migrate product/variant link tables
- catalog browser in admin
- link existing F&FT products to Completeful
- design + mockup dry-run workflows
- no checkout handoff yet

### Phase C — fulfillment quote

- quote from local cart/order line mappings
- compare provider cost with local retail/margin
- persist quote snapshot on `completeful_order_links`
- no live order create yet

### Phase D — test-key order create

- wire deterministic idempotency key from F&FT order
- call Completeful create with `capp_test_`
- verify dry-run response
- prove retry does not duplicate
- store provider request IDs/errors

### Phase E — webhooks

- deploy receiver
- create subscriptions
- store each returned signing secret as a Worker secret immediately
- test synthetic ping
- test duplicate delivery
- test redelivery
- expose webhook health in admin

### Phase F — live cutover

- issue least-privilege `capp_live_` key
- install it as Worker secret
- set `COMPLETEFUL_ALLOW_LIVE_WRITES=true`
- first live paid order monitored manually
- verify Completeful order, charge, status, and shipment feedback
