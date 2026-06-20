# Commerce runtime contract — Fuel & Free Time

**Project:** `fuelnfreetime`  
**Audience:** Engineers and AI agents (Connor + collaborators)  
**Last updated:** 2026-06-20  
**Companion:** CMS contract in [`FNF-CMS-SPRINT-2026-06-20.md`](FNF-CMS-SPRINT-2026-06-20.md) · Agent entry [`../AGENTS.md`](../AGENTS.md)

Every commerce feature MUST conform to this contract. Extend it explicitly before bypassing it.

---

## Executive summary

### Implementation status (June 2026)

| Layer | Status |
|-------|--------|
| **D1 products + variants** | Live — full admin CRUD |
| **Inventory** | Live — variant-level `inventory_qty`; admin list + PATCH |
| **Product images** | Live — R2 media library + `product_images` join |
| **Public catalog API** | Live — active products only |
| **Cart (browser)** | Live — `localStorage` key `fnf_cart` |
| **Checkout v1** | Live — creates order + decrements inventory **without payment** |
| **Stripe** | **Not implemented** — contract below is the target spec |
| **Order emails** | Not wired |
| **Admin order detail** | List only (no line items API) |

### Pipeline invariant (today)

```
Admin UI ──► D1 (products, variants, product_images, media_assets)
                │
Public shop ──► GET /api/store/products ──► D1 (status = 'active')
                │
Browser cart ──► localStorage fnf_cart
                │
Checkout v1 ──► POST /api/store/checkout ──► orders + order_items
                                              └── inventory_qty -= qty (immediate)
```

**Rules:**

| Rule | Detail |
|------|--------|
| **D1 is source of truth** | Catalog, inventory, and orders live in D1. No Shopify sync at runtime. |
| **Public visibility gate** | Store APIs return only `products.status = 'active'`. Drafts are admin-only. |
| **Inventory unit** | One integer per **variant** (`product_variants.inventory_qty`), not per product. |
| **Price resolution** | Checkout uses `variant.price_cents` if set, else `products.price_cents`. |
| **Media indirection** | Files in R2; metadata in D1 `media_assets`; product linkage via `product_images`. |
| **No payment gate yet** | v1 checkout decrements stock on order creation — **must change when Stripe ships** (§8). |

---

## 1. Data model contract

Schema source: [`db/schema.sql`](../db/schema.sql)

### `products`

| Column | Type | Contract |
|--------|------|----------|
| `id` | INTEGER PK | Stable admin + API identifier |
| `slug` | TEXT UNIQUE | `[a-z0-9-]+`; auto from title if omitted on create |
| `title` | TEXT | Required on create |
| `description` | TEXT | HTML/plain; storefront renders as provided |
| `collection` | TEXT | Merchandising tag (e.g. `essentials`, `high-octane`); not a separate table |
| `price_cents` | INTEGER | Default unit price; variants may override |
| `image_url` | TEXT | Legacy fallback; synced when primary image set |
| `status` | `draft` \| `active` | **`active` required for public APIs** |
| `updated_at` | TEXT | Bumped on product update |

**Not in schema (UI-only today):** `product_type` field in product editor — do not persist without migration + contract update.

### `product_variants`

| Column | Type | Contract |
|--------|------|----------|
| `id` | INTEGER PK | Used as `variant_id` in cart and checkout |
| `product_id` | INTEGER FK | CASCADE delete with product |
| `sku` | TEXT UNIQUE | Required on create |
| `size`, `color` | TEXT | Optional display dimensions |
| `price_cents` | INTEGER NULL | NULL → inherit product price at checkout |
| `inventory_qty` | INTEGER | **Authoritative stock count**; default 0 |

### `product_images` + `media_assets`

| Table | Role |
|-------|------|
| `media_assets` | One row per R2 object; `url` = `/media/{r2_key}` |
| `product_images` | Many-to-many with `position`, `is_primary` (0\|1) |

**Primary image rule:** Setting primary updates `products.image_url` to that asset's `url`.

### `orders` + `order_items`

| Column | Contract |
|--------|------------|
| `orders.status` | v1: always `'pending'` on create; no admin transition API yet |
| `orders.customer_email` | Required at checkout; normalized lowercase |
| `orders.total_cents` | Sum of line totals at order time |
| `order_items.title` | Snapshot string, e.g. `"Fuel N Free Time Tee — M"` |
| `order_items.price_cents` | Unit price at order time |
| `order_items.variant_id` | FK; nullable in schema but always set by checkout v1 |

**Missing for Stripe (planned §8):** `stripe_checkout_session_id`, `stripe_payment_intent_id`, `paid_at`, shipping fields.

### `store_settings`

Single row `id = 1`, JSON blob for SEO + access prefs. Loaded by `loadStorePreferences()` in `src/admin/store.js`.

Public meta surface: `GET /api/store/meta` → `{ homeTitle, metaDescription, socialImageUrl }`.

---

## 2. R2 / media contract

| Concept | Contract |
|---------|----------|
| **Public URL** | `/media/{r2_key}` — Worker serves from `WEBSITE_ASSETS` binding |
| **Upload** | `POST /api/admin/media` multipart: `files`, optional `prefix`, `folder`, `category` |
| **Default prefix** | `uploads/` unless specified |
| **Shopify archive browse** | `GET /api/admin/media?prefix=archive/shopify-import&sync=1` |
| **Folder values** | `images`, `videos`, `products` — D1-only taxonomy |
| **Sync** | `POST /api/admin/media/sync` indexes R2 keys → D1 (no R2 copy/move) |

**Agent rule:** Never hardcode full R2 URLs in D1. Always store `/media/...` paths.

---

## 3. Admin API contract

**Router:** `src/admin/api.js`  
**Auth:** Session cookie `fnf_admin_session` — all routes below except login require session.

**Error shape:** `{ "error": "message" }` with HTTP 400/401/404 as appropriate.  
**Success shape:** `{ "ok": true, ...payload }`.

### 3.1 Products

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/admin/products` | — | `{ ok, products[] }` with `variant_count`, `total_inventory` |
| `POST` | `/api/admin/products` | `{ title, slug?, description?, collection?, price_cents\|price, image_url?, status? }` | `{ ok, id }` |
| `GET` | `/api/admin/products/:id` | — | `{ ok, product, variants[] }` |
| `PUT` | `/api/admin/products/:id` | same as create; include `slug` to change slug | `{ ok: true }` |
| `DELETE` | `/api/admin/products/:id` | — | `{ ok: true }` |

**Create defaults:** `status = 'draft'` if omitted; slug slugified from title.

### 3.2 Variants

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/admin/products/:id/variants` | `{ sku, size?, color?, price_cents?, inventory_qty? }` | `{ ok, id }` |
| `PUT` | `/api/admin/variants/:id` | full variant fields | `{ ok: true }` |
| `DELETE` | `/api/admin/variants/:id` | — | `{ ok: true }` |

### 3.3 Inventory

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/admin/inventory` | — | `{ ok, inventory[] }` flat join variant + product |
| `PATCH` | `/api/admin/variants/:id/inventory` | `{ inventory_qty }` **required** | `{ ok: true }` |

**Semantics:**

- `inventory_qty` is an absolute count, not a delta.
- Admin overview low-stock threshold: `inventory_qty <= 3` (dashboard metric only).
- Public shop shows aggregate `total_inventory` per product on list; PDP disables sizes when variant `inventory_qty <= 0`.

**Do not** decrement inventory from admin PATCH — use checkout or future reservation API.

### 3.4 Product images

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/admin/products/:id/images` | — | `{ ok, images[] }` |
| `POST` | `/api/admin/products/:id/images` | `{ media_asset_id }` | `{ ok, ... }` |
| `DELETE` | `/api/admin/products/:id/images/:mediaAssetId` | — | `{ ok: true }` |
| `POST` | `/api/admin/products/:id/images/:mediaAssetId/primary` | — | `{ ok: true }` + updates `products.image_url` |

**UI flow:** `public/admin/js/media-picker.js` — products can stage images before first save (local state until attach POST).

### 3.5 Orders (admin)

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/admin/orders` | `{ ok, orders[] }` — last 200 rows, **no line items** |

**Gap:** Implement `GET /api/admin/orders/:id` before building order admin UI beyond list view.

### 3.6 Store preferences

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/admin/store/preferences` | Includes masked `storePassword` |
| `POST` | `/api/admin/store/preferences` | `{ settings: { ... } }` or flat object |
| `GET` | `/api/admin/store/online` | Overview + **stub** performance metrics (`source: "pending"`) |
| `GET` | `/api/admin/overview` | Counts: products, inventory_units, low_stock_variants, orders |

---

## 4. Public store API contract

**Router:** `src/store/api.js`  
**Auth:** None  
**Cache:** No CDN contract yet — assume dynamic D1 reads.

### 4.1 `GET /api/store/products`

Returns `{ ok: true, products: Product[] }`.

**Product object:**

```json
{
  "id": 1,
  "slug": "fuel-n-free-time-tee",
  "title": "Fuel N Free Time Tee",
  "description": "...",
  "collection": "essentials",
  "price_cents": 2800,
  "price": "28.00",
  "image_url": "/media/...",
  "status": "active",
  "variant_count": 5,
  "total_inventory": 42,
  "sizes": "S,M,L,XL,XXL",
  "primary_image": "/media/..."
}
```

### 4.2 `GET /api/store/products/:slug`

Returns `{ ok: true, product: Product, variants: Variant[], images: Image[] }`.

**Variant object:** `{ id, sku, size, color, price_cents, inventory_qty }`

**404:** `{ "error": "Product not found" }`

### 4.3 `GET /api/store/meta`

Returns SEO prefs for `public/js/fnf-head.js`.

### 4.4 `POST /api/store/checkout` (v1 — pre-Stripe)

**Request:**

```json
{
  "email": "customer@example.com",
  "items": [
    { "variant_id": 12, "qty": 1 }
  ]
}
```

**Validation:**

| Check | Error |
|-------|-------|
| Valid email regex | `400 Valid email required` |
| Non-empty `items` | `400 Cart is empty` |
| Variant exists + product `active` | `400 Variant {id} unavailable` |
| `qty` clamped 1–10 | per-item |
| `inventory_qty >= qty` | `400 Only N left for {size}` |

**Success:**

```json
{
  "ok": true,
  "order_id": 7,
  "total_cents": 2800,
  "total": "28.00",
  "message": "Order received — payment integration coming soon..."
}
```

**Side effects (atomic intent, sequential SQL today):**

1. Insert `orders` (`status: 'pending'`)
2. Insert `order_items` per line
3. `UPDATE product_variants SET inventory_qty = inventory_qty - qty`

**Client:** `public/js/store-cart.js` clears `fnf_cart` on success.

---

## 5. Storefront browser contract

| File | Role |
|------|------|
| `public/shop.html` + `store-catalog.js` | Grid from `GET /api/store/products`; event `fnf:catalog-ready` |
| `public/product.html` + `store-product.js` | PDP; query `?slug=` or rewrite `/products/:slug` |
| `public/cart.html` + `store-cart.js` | Cart render + checkout POST |

**Cart item shape (`localStorage` `fnf_cart`):**

```json
{
  "variant_id": 12,
  "product_id": 1,
  "slug": "fuel-n-free-time-tee",
  "title": "Fuel N Free Time Tee",
  "size": "M",
  "price_cents": 2800,
  "image": "/media/...",
  "qty": 1
}
```

**Global helpers:** `window.FNF_STORE` — `getCart()`, `setCart()`, `addToCart()`, etc. (see `store-catalog.js`).

**URL aliases:** `/cart`, `/collections/*` → static routes via `src/lib/routes.js`.

---

## 6. Admin UI map

| Clean URL | File | Primary APIs |
|-----------|------|--------------|
| `/admin/products` | `public/admin/products.html` | `GET /api/admin/products` |
| `/admin/product-edit?id=` | `public/admin/product-edit.html` | Product + variant + image CRUD |
| `/admin/inventory` | `public/admin/inventory.html` | `GET /api/admin/inventory`, `PATCH .../inventory` |
| `/admin/orders` | `public/admin/orders.html` | `GET /api/admin/orders` |
| `/admin/store` | `public/admin/store.html` | `GET /api/admin/store/online` |
| `/admin/preferences` | `public/admin/preferences.html` | Store prefs GET/POST |

Legacy `/admin/*.html` paths 301 to clean URLs (`src/lib/admin-routes.js`).

---

## 7. End-to-end product workflow (agent checklist)

1. **Create product** — `POST /api/admin/products` with `status: "active"` when ready for shop.
2. **Add variants** — `POST .../variants` with SKU, size, `inventory_qty`.
3. **Upload media** — `POST /api/admin/media` or pick from `prefix=archive/shopify-import`.
4. **Attach images** — `POST .../products/:id/images` + set primary.
5. **Verify public** — `GET /api/store/products/:slug` returns product + variants.
6. **Verify shop grid** — `/shop.html` card shows correct inventory badge.

---

## 8. Stripe integration contract (TARGET — not built)

**Implementation checklist:** [`RUNTIME-CONTRACTS-STRIPE.md`](RUNTIME-CONTRACTS-STRIPE.md) — ordered tasks for Connor/agents.

When implementing payments, follow this spec so v1 checkout can migrate cleanly.

### 8.1 Secrets

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

See [`SECRETS.md`](../SECRETS.md).

### 8.2 Schema migration (required)

```sql
ALTER TABLE orders ADD COLUMN stripe_checkout_session_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_checkout_session_id);
```

Optional: `inventory_reserved_qty` on variants or separate `inventory_reservations` table.

### 8.3 Order state machine

```
                    ┌──────────────┐
     checkout start │   pending    │  (v1 today: terminal until Stripe)
                    └──────┬───────┘
                           │ Stripe Checkout Session created
                           ▼
                    ┌──────────────┐
                    │ awaiting_pay │
                    └──────┬───────┘
              paid         │         expired / failed
               ▼           ▼           ▼
        ┌──────────┐  ┌─────────┐  ┌─────────┐
        │   paid   │  │ expired │  │ failed  │
        └──────────┘  └─────────┘  └─────────┘
```

| Status | Meaning |
|--------|---------|
| `pending` | v1 legacy — order placed, no Stripe session (deprecate after migration) |
| `awaiting_payment` | Order + line items created; Stripe session open; **inventory reserved** |
| `paid` | Webhook confirmed `checkout.session.completed` |
| `expired` | Session expired — release reservation |
| `failed` | Payment failed — release reservation |
| `cancelled` | Admin or customer cancelled before capture |

### 8.4 Inventory timing (critical change from v1)

| Phase | v1 (today) | Stripe target |
|-------|------------|---------------|
| Cart | Browser only | Browser only |
| Checkout start | Decrement immediately | **Reserve** (soft hold) or verify availability only |
| Payment success | — | Decrement (or confirm reservation) |
| Payment failure / expiry | — | Release reservation |

**Agent rule:** Remove immediate decrement from `createStoreCheckout` when Stripe ships; replace with reservation + webhook-finalized decrement.

### 8.5 New routes (planned)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/store/checkout/session` | Create Stripe Checkout Session; return `{ url }` |
| `POST` | `/api/store/webhooks/stripe` | Verify signature; idempotent order updates |
| `GET` | `/api/store/orders/:id/status` | Poll payment status post-redirect (optional) |

**Webhook requirements:**

- Verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`
- Handle at minimum: `checkout.session.completed`, `checkout.session.expired`
- Idempotency: store processed event IDs (KV or D1 table) — duplicate webhooks must not double-decrement

### 8.6 Checkout Session metadata

Attach to Stripe session:

```json
{
  "order_id": "123",
  "customer_email": "customer@example.com"
}
```

Line items built from `order_items` snapshots (title, unit amount, quantity).

### 8.7 Storefront flow (target)

```
cart.html → POST /api/store/checkout/session
         → redirect to Stripe Hosted Checkout
         → success_url / cancel_url
         → webhook marks order paid + finalizes inventory
         → optional confirmation email via Resend
```

---

## 9. Transactional email contract (planned)

| Event | Trigger | Secret |
|-------|---------|--------|
| Order confirmation | `orders.status → paid` | `RESEND_API_KEY` |
| Admin notification | same | optional |

Do not send email from checkout v1 stub path until payment state is reliable.

---

## 10. Agent Sam commerce context

`src/admin/agentsam.js` injects live D1 reads:

- Active products with low stock (`inventory_qty <= 5`)
- Product titles, SKUs, sizes

**Rule:** Agent Sam must not invent inventory or order IDs — use the LIVE STORE DATA block only.

---

## 11. Testing & verification

| Scenario | How to verify |
|----------|---------------|
| Product visible on shop | `status = active`; `GET /api/store/products` includes slug |
| Variant OOS | PDP size button disabled; checkout returns 400 |
| Admin inventory edit | PATCH → public API reflects new qty |
| Checkout v1 | POST with test email → row in `orders` + `order_items`; inventory decreased |
| Image primary | Public list uses `primary_image` from join |

**Sample seed:** `npm run db:seed:tee` — product `fuel-n-free-time-tee` with S–XXL variants.

---

## 12. Known gaps / stale references

Fix these when touching related code:

| Location | Issue |
|----------|-------|
| `db/schema.sql` comment on orders | Says "no checkout wired" — **stale** |
| `public/admin/orders.html` copy | May say checkout not wired — **stale** |
| `SECRETS.md` | Says Stripe "when cart build starts" — cart exists; update to "when Stripe ships" |
| Collections admin | No CRUD — collection is a string on `products` |
| Duplicate product | UI alert "coming soon" |

---

## 13. File index

```
src/store/api.js              Public products + checkout v1
src/admin/api.js              Admin product/variant/inventory/orders router
src/admin/media.js            R2 upload, list, sync, product image attach helpers
src/admin/store.js            store_settings preferences
src/lib/auth.js               Admin session
public/js/store-*.js          Storefront cart/catalog/PDP
public/admin/product-edit.html
public/admin/js/media-picker.js
db/schema.sql
db/seed-tee.sql
```

---

## 14. Contract extension process

1. Add schema migration in `db/migrate-*.sql` + document columns here.
2. Add route to appropriate router (`store/api.js` or `admin/api.js`).
3. Update admin UI or storefront JS if user-facing.
4. Update [`AGENTS.md`](../AGENTS.md) status table if implementation status changes.
5. Deploy: `npm run deploy`

**Never:** duplicate product tables, bypass D1 for catalog reads, or store payment state only in Stripe without mirroring to `orders`.
