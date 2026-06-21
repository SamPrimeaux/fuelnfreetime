# Stripe implementation checklist — Fuel & Free Time

**Status:** Not started (checkout v1 live without payment)  
**Parent contract:** [`RUNTIME-CONTRACTS-COMMERCE.md`](RUNTIME-CONTRACTS-COMMERCE.md) §8  
**Agent entry:** [`../AGENTS.md`](../AGENTS.md)  
**Stripe agent skill:** [`.cursor/skills/stripe-best-practices/SKILL.md`](../.cursor/skills/stripe-best-practices/SKILL.md) ([stripe/ai](https://github.com/stripe/ai/blob/main/skills/stripe-best-practices/SKILL.md)) — read with this checklist; repo contracts win on inventory/order flow.

This document is an **ordered task list** for wiring Stripe Checkout. Complete tasks in sequence unless noted. Do not skip inventory-timing changes (Task 12–14) — v1 checkout decrements stock immediately today.

---

## Current baseline (do not break until Task 18)

| Piece | Today |
|-------|-------|
| Checkout | `POST /api/store/checkout` in `src/store/api.js` |
| Client | `public/js/store-cart.js` → same endpoint |
| Inventory | Decremented on order insert (no payment) |
| Orders | `status = 'pending'` only |
| Stripe | No routes, secrets, or schema columns |

---

## Prerequisites (human — before Task 1)

- [ ] **P1.** Stripe account with Checkout enabled (test mode first).
- [ ] **P2.** Decide mode: **Stripe Checkout (Hosted)** — recommended per commerce contract §8.7.
- [ ] **P3.** Cloudflare collaborator access (Connor) — repo + `wrangler secret put`.
- [ ] **P4.** Stripe Dashboard → Developers → Webhooks endpoint URL planned:
  - Production: `https://fuelnfreetime.com/api/store/webhooks/stripe`
  - Staging: `https://fuelnfreetime.meauxbility.workers.dev/api/store/webhooks/stripe`
- [ ] **P5.** Success/cancel URLs agreed (hardcoded in Worker — **not** `wrangler.toml` vars):
  - Success: `/order-confirmation?session_id={CHECKOUT_SESSION_ID}` (create page in Task 16)
  - Cancel: `/cart.html?cancelled=1`
  - Build full URLs from the incoming request origin (`new URL(path, request.url)`) or shared constants in `src/store/stripe.js`. Do **not** add path strings as Cloudflare `[vars]` bindings — they are not secrets, not per-environment config, and add deploy noise for no benefit.

---

## Phase 1 — Schema & config

### Task 1 — D1 migration: orders + webhook idempotency

**Files:** `db/migrate-stripe.sql`, `package.json` (optional script)

**SQL:**

```sql
-- orders payment columns
ALTER TABLE orders ADD COLUMN stripe_checkout_session_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_checkout_session_id);

-- processed Stripe events (idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Apply:**

```bash
./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/migrate-stripe.sql
```

**Acceptance:**
- [ ] Remote D1 has new columns and `stripe_webhook_events` table
- [ ] Existing orders rows unchanged (`NULL` payment columns)

**Depends on:** P1

---

### Task 2 — D1 migration: inventory reservations

**Files:** `db/migrate-stripe.sql` (same file or follow-up)

**Recommended approach:** reservation table (avoids altering variant semantics for admin PATCH)

```sql
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id  INTEGER NOT NULL REFERENCES product_variants(id),
  qty         INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'held',  -- held | committed | released
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(order_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_variant_status ON inventory_reservations(variant_id, status);
```

**Acceptance:**
- [ ] Can insert `held` reservation rows linked to `order_id`
- [ ] Document reservation TTL in code (suggest **30 minutes**, match Stripe session expiry)

**Depends on:** Task 1

---

### Task 3 — Secrets (paths are not secrets)

**Files:** `SECRETS.md`, `src/store/stripe.js` (constants)

**Actions:**

```bash
wrangler secret put STRIPE_SECRET_KEY      # sk_test_... then sk_live_...
wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_... per endpoint
```

**Checkout redirect paths** — define once in code, e.g.:

```js
// src/store/stripe.js
export const CHECKOUT_SUCCESS_PATH = "/order-confirmation";
export const CHECKOUT_CANCEL_PATH = "/cart.html";

export function checkoutUrls(request) {
  const base = new URL(request.url).origin;
  return {
    success: `${base}${CHECKOUT_SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
    cancel: `${base}${CHECKOUT_CANCEL_PATH}?cancelled=1`,
  };
}
```

Do **not** put success/cancel paths in `wrangler.toml` `[vars]`. Only Stripe keys belong in secrets.

**Acceptance:**
- [ ] `SECRETS.md` status row updated to "wired" for both secrets
- [ ] Worker can read `env.STRIPE_SECRET_KEY` in dev via `.dev.vars` (gitignored)
- [ ] Success/cancel URLs built from request origin + code constants (no path vars in wrangler)

**Depends on:** P1, P3

---

## Phase 2 — Stripe module (Worker)

### Task 4 — Create `src/store/stripe.js`

**Files:** `src/store/stripe.js` (new)

**Implement:**
- [ ] `stripeRequest(env, method, path, body)` — fetch `https://api.stripe.com/v1/...` with `Authorization: Bearer ${env.STRIPE_SECRET_KEY}`
- [ ] Use `application/x-www-form-urlencoded` or Stripe's recommended body encoding for Workers (no Node SDK required unless you add it)
- [ ] `createCheckoutSession(env, { orderId, email, lineItems, successUrl, cancelUrl })`
- [ ] `constructWebhookEvent(rawBody, signature, secret)` — verify `Stripe-Signature` header (timestamp + v1 HMAC)

**Acceptance:**
- [ ] Unit-testable pure functions for signature verification
- [ ] Errors map to `{ error: "..." }` at router layer
- [ ] No secrets logged

**Depends on:** Task 3

---

### Task 5 — Reservation helpers

**Files:** `src/store/inventory.js` (new)

**Implement:**
- [ ] `availableQty(env, variantId)` — `inventory_qty - SUM(held reservations where expires_at > now)`
- [ ] `holdInventory(env, orderId, lineItems, ttlMinutes)` — insert `held` rows; fail if insufficient
- [ ] `commitReservations(env, orderId)` — `held → committed`, decrement `product_variants.inventory_qty`
- [ ] `releaseReservations(env, orderId)` — `held → released` (no stock change)
- [ ] `expireStaleReservations(env)` — optional cron/scheduled Worker later; call from checkout + webhook for now

**Acceptance:**
- [ ] Two concurrent checkouts cannot oversell last unit
- [ ] Admin `PATCH .../inventory` still sets absolute `inventory_qty` (reservations subtract from available only)

**Depends on:** Task 2

---

## Phase 3 — Checkout session API

### Task 6 — `POST /api/store/checkout/session`

**Files:** `src/store/api.js`, `src/store/checkout.js` (optional extract from api.js)

**Request** (same cart shape as v1):

```json
{
  "email": "customer@example.com",
  "items": [{ "variant_id": 12, "qty": 1 }]
}
```

**Flow:**
1. Validate email + items (reuse v1 validation from `createStoreCheckout`)
2. Compute totals + line item snapshots
3. Insert `orders` with `status = 'awaiting_payment'`, `total_cents`
4. Insert `order_items`
5. Call `holdInventory(...)` — **do not decrement `inventory_qty` yet**
6. Create Stripe Checkout Session with line items + metadata `{ order_id, customer_email }`
7. Update order with `stripe_checkout_session_id`
8. Return `{ ok: true, url, order_id, session_id }`

**Acceptance:**
- [ ] 400 on OOS (counts reservations)
- [ ] Order row exists before Stripe redirect
- [ ] Inventory not decremented until webhook (Task 8)

**Depends on:** Task 4, Task 5

---

### Task 7 — Wire router + disable raw body mutation for webhook path

**Files:** `src/index.js`, `src/store/api.js`

**Actions:**
- [ ] Route `POST /api/store/checkout/session` in `handleStoreApi`
- [ ] Ensure webhook route receives **raw body** for signature verification (may need early branch in `index.js` before JSON parse)
- [ ] Keep `POST /api/store/checkout` temporarily (feature flag or deprecate in Task 18)

**Acceptance:**
- [ ] Session endpoint reachable on staging
- [ ] 404 for unknown store paths unchanged

**Depends on:** Task 6

---

## Phase 4 — Webhooks

### Task 8 — `POST /api/store/webhooks/stripe`

**Files:** `src/store/stripe-webhook.js` (new), `src/store/api.js` or `src/index.js`

**Handle events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Idempotency check → `orders.status = 'paid'`, `paid_at`, `stripe_payment_intent_id` → `commitReservations` |
| `checkout.session.expired` | `orders.status = 'expired'` → `releaseReservations` |
| `payment_intent.payment_failed` | `orders.status = 'failed'` → `releaseReservations` |

**Idempotency:**
- [ ] Insert `event_id` into `stripe_webhook_events` before side effects
- [ ] Duplicate delivery returns 200 without re-committing stock

**Acceptance:**
- [ ] Invalid signature → 400
- [ ] Test webhook from Stripe CLI updates order + inventory exactly once
- [ ] Unknown event types → 200 (no-op)

**Depends on:** Task 4, Task 5, Task 6

---

### Task 9 — Register webhook endpoints

**Human / Connor:**
- [ ] Stripe Dashboard → add endpoint(s) for prod + staging
- [ ] Subscribe to: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
- [ ] Copy `whsec_` to `STRIPE_WEBHOOK_SECRET` (separate secrets per env if needed)

**Local dev:**

```bash
stripe listen --forward-to localhost:8787/api/store/webhooks/stripe
```

**Depends on:** Task 8

---

## Phase 5 — Storefront

### Task 10 — Update `store-cart.js`

**Files:** `public/js/store-cart.js`

**Changes:**
- [ ] Replace `POST /api/store/checkout` with `POST /api/store/checkout/session`
- [ ] On success: `window.location.href = data.url` (Stripe Hosted Checkout)
- [ ] Do **not** clear cart until payment success page (Task 11) — or clear on redirect and rely on webhook (document choice; recommend clear on success page only)

**Acceptance:**
- [ ] Test card completes full redirect flow on staging
- [ ] Cancel returns to cart with message

**Depends on:** Task 7

---

### Task 11 — Order confirmation page

**Files:** `public/order-confirmation.html` (new), `public/js/order-confirmation.js` (new), `src/lib/routes.js` (if alias needed)

**Implement:**
- [ ] Read `session_id` from query
- [ ] `GET /api/store/orders/status?session_id=...` (Task 12) — poll until `paid` or timeout
- [ ] Show order #, total, thank-you copy
- [ ] Clear `fnf_cart` on confirmed `paid`

**Acceptance:**
- [ ] Success URL from Stripe lands here and renders order summary
- [ ] Handles `awaiting_payment` with spinner (webhook delay)

**Depends on:** Task 12

---

### Task 12 — `GET /api/store/orders/status`

**Files:** `src/store/api.js`

**Query:** `session_id` or `order_id`

**Response:**

```json
{
  "ok": true,
  "order_id": 7,
  "status": "awaiting_payment | paid | expired | failed",
  "total_cents": 2800,
  "total": "28.00"
}
```

**Acceptance:**
- [ ] No auth required but only non-sensitive fields exposed
- [ ] 404 for unknown session

**Depends on:** Task 6

---

## Phase 6 — Admin & ops

### Task 13 — Order detail API

**Files:** `src/admin/api.js`

**Add:** `GET /api/admin/orders/:id`

**Response:** order row + `items[]` from `order_items` + payment fields

**Acceptance:**
- [ ] Admin session required
- [ ] Used by orders admin UI (Task 14)

**Depends on:** Task 1

---

### Task 14 — Update admin orders UI

**Files:** `public/admin/orders.html`, optional `public/admin/js/orders.js`

**Changes:**
- [ ] Show `status`, Stripe session id (truncated), `paid_at`
- [ ] Fix stale copy ("checkout not wired")
- [ ] Link to detail or expandable line items

**Acceptance:**
- [ ] Paid test order visible with line items

**Depends on:** Task 13

---

### Task 15 — Admin manual release (optional but recommended)

**Files:** `src/admin/api.js`

**Add:** `POST /api/admin/orders/:id/release` — admin cancels stuck `awaiting_payment` → release reservations

**Acceptance:**
- [ ] Only allowed for `awaiting_payment` / `expired`
- [ ] Audit log optional (out of scope if not needed)

**Depends on:** Task 5

---

## Phase 7 — Email (after payment reliable)

### Task 16 — Order confirmation email

**Files:** `src/store/email.js` (new), hook from webhook handler

**Trigger:** `checkout.session.completed` after DB commit

**Secret:** `RESEND_API_KEY` (see `SECRETS.md`)

**Acceptance:**
- [ ] Email sent once (idempotent with webhook event id)
- [ ] Contains order #, line items, total

**Depends on:** Task 8, Resend secret

---

## Phase 8 — Cutover & cleanup

### Task 17 — Feature flag: Stripe vs v1

**Files:** `wrangler.toml` (mode flag only if needed), `src/store/api.js`

**Var:** `CHECKOUT_MODE = "stripe" | "legacy"` (default `stripe` when ready) — optional; use only for rollout toggles, not URL paths.

**Acceptance:**
- [ ] Staging uses `stripe`; legacy path available for rollback one deploy

**Depends on:** Task 10

---

### Task 18 — Remove v1 immediate-decrement checkout

**Files:** `src/store/api.js`, `docs/RUNTIME-CONTRACTS-COMMERCE.md`, `AGENTS.md`

**Actions:**
- [ ] Remove or hard-disable `POST /api/store/checkout` (return 410 with message)
- [ ] Update commerce contract §4.4 to "deprecated"
- [ ] Update `db/schema.sql` orders comment

**Acceptance:**
- [ ] No code path decrements inventory without payment confirmation
- [ ] Docs reflect live Stripe flow

**Depends on:** Task 8, Task 10, production smoke test

---

### Task 19 — Production smoke test

**Checklist:**
- [ ] Test mode E2E on staging (card `4242 4242 4242 4242`)
- [ ] Webhook delivery on production URL
- [ ] Inventory: start N → checkout → N-1 after paid; expired session restores availability
- [ ] Admin order shows `paid`
- [ ] Switch to live Stripe keys (human approval)
- [ ] One real micro-purchase validated

**Depends on:** Tasks 1–18

---

## Phase 9 — Documentation sync

### Task 20 — Update contracts

**Files:**
- [ ] `docs/RUNTIME-CONTRACTS-COMMERCE.md` — mark §8 implemented, update §4.4
- [ ] `docs/RUNTIME-CONTRACTS-STRIPE.md` — mark tasks complete, add "Live" date
- [ ] `AGENTS.md` — Stripe status → live
- [ ] `README.md` — checkout section
- [ ] `SECRETS.md` — final statuses

**Depends on:** Task 19

---

## Suggested file layout (after implementation)

```
src/store/
  api.js              # router
  stripe.js           # Stripe API + signature verify
  stripe-webhook.js   # event dispatch
  inventory.js        # reservations
  checkout.js         # session creation orchestration
  email.js            # Resend (Task 16)
db/
  migrate-stripe.sql
public/
  order-confirmation.html
  js/order-confirmation.js
  js/store-cart.js    # updated
```

---

## Test matrix (agents)

| # | Scenario | Expected |
|---|----------|----------|
| T1 | Happy path test card | Order `paid`, inventory decremented once |
| T2 | Duplicate `checkout.session.completed` | Single decrement; second webhook 200 no-op |
| T3 | Session expired | Order `expired`, reservations released, stock restored |
| T4 | OOS at session create | 400, no order row |
| T5 | OOS after hold (admin zeroes stock) | Webhook commit fails safely — document behavior |
| T6 | Cancel URL | Cart preserved, order stays `awaiting_payment` until expiry |
| T7 | v1 endpoint after Task 18 | 410 Gone |

---

## Rollback plan

1. Set `CHECKOUT_MODE=legacy` (if Task 17 done) **or** revert deploy.
2. Disable Stripe webhook in Dashboard (stop new paid orders).
3. Manually reconcile any `awaiting_payment` orders in admin.
4. Do **not** re-enable v1 long-term — it oversells without payment.

---

## Task dependency graph

```
P1–P5
  └─► 1 ─► 2 ─► 5 ─┐
       3 ─► 4 ──────┼─► 6 ─► 7 ─► 10 ─► 11
                     │           │
                     └─► 8 ─► 9 ─┘
                           │
                     12 ────┘
  1 ─► 13 ─► 14
  5 ─► 15
  8 ─► 16
  17 ─► 18 ─► 19 ─► 20
```

---

## Ownership hints

| Area | Suggested owner |
|------|-----------------|
| Tasks 1–3, 9, 19 (keys/webhooks) | Human (Justin/Connor) |
| Tasks 4–8, 12–13 | Backend agent |
| Tasks 10–11, 14 | Frontend agent |
| Task 16 | Backend after Resend secret |
| Task 20 | Any agent completing the sprint |

---

## Out of scope (explicit)

- Stripe Connect / marketplace
- Subscriptions
- Apple Pay domain verification (can add later)
- Shipping rate calculation (flat-rate or free shipping for v1)
- Tax automation (Stripe Tax — future)
- PayPal / Shop Pay

Add new scope only via commerce contract amendment first.
