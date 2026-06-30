-- ============================================================================
--  INVENTORY MANAGEMENT — DATABASE SCHEMA
-- ============================================================================
--
--  CORE ARCHITECTURAL RULE
--  -----------------------
--  Stock quantity is NEVER stored as a mutable number. There is no
--  `products.quantity_on_hand` column anywhere in this schema, and there
--  never will be. Instead, every change to inventory is recorded as an
--  immutable, append-only row in `stock_movements` — a stock ledger,
--  modelled like double-entry accounting applied to stock.
--
--  Quantity-on-hand, inventory valuation and low-stock flags are all
--  DERIVED by summing the ledger (see src/services/ledger.ts). They are
--  computed on read, never written.
--
--  The ledger is append-only: rows are INSERTed, never UPDATEd or DELETEd.
--  A correction is itself a new ADJUSTMENT movement, not an edit.
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
--  Tenancy — every business is a tenant; every record below is tenant-scoped.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
--  Suppliers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  name        TEXT NOT NULL,
  contact     TEXT,
  address     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
--  Products / SKUs
--
--  NOTE: there is deliberately NO quantity column here. Stock is derived
--  from the movement ledger. The columns below are static product master
--  data only (pricing, reorder policy, status).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  sku             TEXT NOT NULL,
  category        TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL,
  cost_price      REAL NOT NULL DEFAULT 0,   -- reference/standard cost
  selling_price   REAL NOT NULL DEFAULT 0,
  reorder_point   REAL NOT NULL DEFAULT 0,
  reorder_qty     REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, sku)
);

-- ----------------------------------------------------------------------------
--  STOCK MOVEMENTS — the heart of the system.
--
--  Append-only ledger. Each row is one immutable fact: "this much of this
--  product moved IN or OUT, at this time, for this reason". Quantity is
--  ALWAYS stored positive; the `direction` column carries the sign.
--
--  `unit_cost` is captured on inbound movements so that weighted-average
--  cost (and therefore valuation) can be derived purely from the ledger.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  product_id    TEXT NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN
                  ('PURCHASE_RECEIPT', 'SALE', 'ADJUSTMENT', 'RETURN')),
  direction     TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  quantity      REAL NOT NULL CHECK (quantity > 0),    -- always positive
  unit_cost     REAL,                                  -- captured on inbound moves
  reason        TEXT,
  reference_doc TEXT,                                  -- PO no. / invoice no. / etc.
  user_id       TEXT REFERENCES users(id),
  occurred_at   TEXT NOT NULL DEFAULT (datetime('now')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_movements_product
  ON stock_movements (tenant_id, product_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_movements_tenant_time
  ON stock_movements (tenant_id, occurred_at);

-- ----------------------------------------------------------------------------
--  Purchase Orders — receiving a PO appends PURCHASE_RECEIPT movements.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  supplier_id  TEXT NOT NULL REFERENCES suppliers(id),
  reference    TEXT NOT NULL,                          -- human PO number, e.g. PO-1042
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'received')),
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  received_at  TEXT
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  po_id        TEXT NOT NULL REFERENCES purchase_orders(id),
  product_id   TEXT NOT NULL REFERENCES products(id),
  quantity     REAL NOT NULL CHECK (quantity > 0),
  unit_cost    REAL NOT NULL
);

-- ----------------------------------------------------------------------------
--  Sales — recording a sale appends SALE (OUT) movements.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  reference    TEXT NOT NULL,                          -- human invoice no., e.g. INV-2051
  total        REAL NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_lines (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  sale_id      TEXT NOT NULL REFERENCES sales(id),
  product_id   TEXT NOT NULL REFERENCES products(id),
  quantity     REAL NOT NULL CHECK (quantity > 0),
  unit_price   REAL NOT NULL
);
