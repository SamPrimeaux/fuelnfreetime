-- Discounts + redemptions for /admin/discounts
-- Apply: npm run db:migrate:discounts

CREATE TABLE IF NOT EXISTS discounts (
  id                      TEXT PRIMARY KEY,
  tenant_id               TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  title                   TEXT NOT NULL,
  code                    TEXT,
  method                  TEXT NOT NULL DEFAULT 'code'
                          CHECK (method IN ('code','automatic')),
  discount_type           TEXT NOT NULL
                          CHECK (discount_type IN ('product','order','shipping','buy_x_get_y')),
  value_type              TEXT NOT NULL DEFAULT 'percent'
                          CHECK (value_type IN ('percent','fixed')),
  value                   INTEGER NOT NULL DEFAULT 0,
  applies_to              TEXT NOT NULL DEFAULT 'all'
                          CHECK (applies_to IN ('all','collections','products')),
  applies_to_json         TEXT DEFAULT '[]',
  eligibility             TEXT NOT NULL DEFAULT 'all',
  min_requirement_type    TEXT NOT NULL DEFAULT 'none'
                          CHECK (min_requirement_type IN ('none','amount','quantity')),
  min_requirement_value   INTEGER DEFAULT 0,
  max_uses_total          INTEGER,
  max_uses_per_customer   INTEGER DEFAULT 0,
  combine_product         INTEGER NOT NULL DEFAULT 0,
  combine_order           INTEGER NOT NULL DEFAULT 0,
  combine_shipping        INTEGER NOT NULL DEFAULT 0,
  starts_at               TEXT,
  ends_at                 TEXT,
  status                  TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','active','scheduled','expired','disabled')),
  uses_count              INTEGER NOT NULL DEFAULT 0,
  metadata_json           TEXT DEFAULT '{}',
  created_by              TEXT NOT NULL,
  updated_by              TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discounts_tenant_code
  ON discounts(tenant_id, code)
  WHERE code IS NOT NULL AND code != '';

CREATE INDEX IF NOT EXISTS idx_discounts_status
  ON discounts(tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  discount_id     TEXT NOT NULL REFERENCES discounts(id),
  order_id        INTEGER REFERENCES orders(id),
  customer_email  TEXT,
  amount_cents    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_discount
  ON discount_redemptions(discount_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_email
  ON discount_redemptions(discount_id, customer_email);

ALTER TABLE orders ADD COLUMN discount_id TEXT;
ALTER TABLE orders ADD COLUMN discount_code TEXT;
ALTER TABLE orders ADD COLUMN subtotal_cents INTEGER;
ALTER TABLE orders ADD COLUMN discount_cents INTEGER DEFAULT 0;
