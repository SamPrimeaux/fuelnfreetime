-- db/migrate-stripe.sql
-- RUN ONCE. SQLite has no "ADD COLUMN IF NOT EXISTS": re-running this file errors
-- on the ALTER TABLE lines (duplicate column) and aborts. The CREATE TABLE/INDEX
-- IF NOT EXISTS lines are safe to re-run; the ALTERs are not.
-- Tasks 1 & 2 of docs/RUNTIME-CONTRACTS-STRIPE.md.

-- Task 1: orders payment columns + webhook idempotency
ALTER TABLE orders ADD COLUMN stripe_checkout_session_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_checkout_session_id);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Task 2: inventory reservations (held -> committed | released)
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
