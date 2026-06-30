import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { getStockLevels, getStockLevel } from '../services/ledger.js';
import { appendMovement, ValidationError } from '../services/movements.js';
import type { Product } from '../types.js';

export const products = Router();

/** Attach derived stock fields + low-stock flag to a product master row. */
function decorate(p: Product, level: { qty_on_hand: number; avg_cost: number; value: number }) {
  return {
    ...p,
    qty_on_hand: level.qty_on_hand,
    avg_cost: level.avg_cost,
    stock_value: level.value,
    low_stock: p.status === 'active' && level.qty_on_hand <= p.reorder_point,
  };
}

// GET /api/products — full products table with derived quantity/value/flags.
products.get('/', (req, res) => {
  const { tenantId } = req.ctx;
  const rows = db
    .prepare(`SELECT * FROM products WHERE tenant_id = ? ORDER BY name ASC`)
    .all(tenantId) as Product[];
  const levels = getStockLevels(tenantId);
  const zero = { qty_on_hand: 0, avg_cost: 0, value: 0 };
  res.json(rows.map((p) => decorate(p, levels.get(p.id) ?? { product_id: p.id, ...zero })));
});

// GET /api/products/low-stock — every active product at/below its reorder point.
products.get('/low-stock', (req, res) => {
  const { tenantId } = req.ctx;
  const rows = db
    .prepare(`SELECT * FROM products WHERE tenant_id = ? AND status = 'active'`)
    .all(tenantId) as Product[];
  const levels = getStockLevels(tenantId);
  const out = rows
    .map((p) => decorate(p, levels.get(p.id) ?? { product_id: p.id, qty_on_hand: 0, avg_cost: 0, value: 0 }))
    .filter((p) => p.low_stock)
    .sort((a, b) => a.qty_on_hand - b.qty_on_hand);
  res.json(out);
});

// GET /api/products/:id — single product with derived stock.
products.get('/:id', (req, res) => {
  const { tenantId } = req.ctx;
  const p = db
    .prepare(`SELECT * FROM products WHERE tenant_id = ? AND id = ?`)
    .get(tenantId, req.params.id) as Product | undefined;
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(decorate(p, getStockLevel(tenantId, p.id)));
});

// GET /api/products/:id/movements — the full append-only ledger for a product.
products.get('/:id/movements', (req, res) => {
  const { tenantId } = req.ctx;
  const rows = db
    .prepare(
      `SELECT m.*, u.name AS user_name
         FROM stock_movements m
         LEFT JOIN users u ON u.id = m.user_id
        WHERE m.tenant_id = ? AND m.product_id = ?
        ORDER BY m.occurred_at DESC, m.created_at DESC`
    )
    .all(tenantId, req.params.id);
  res.json(rows);
});

// POST /api/products — create a product (master data only; no quantity).
products.post('/', (req, res) => {
  const { tenantId } = req.ctx;
  const b = req.body ?? {};
  if (!b.name?.trim() || !b.sku?.trim() || !b.category?.trim()) {
    return res.status(400).json({ error: 'Name, SKU and category are required.' });
  }
  const dup = db
    .prepare(`SELECT 1 FROM products WHERE tenant_id = ? AND sku = ?`)
    .get(tenantId, b.sku.trim());
  if (dup) return res.status(400).json({ error: `SKU "${b.sku}" already exists.` });

  const id = `prod_${nanoid(8)}`;
  db.prepare(
    `INSERT INTO products (id, tenant_id, name, sku, category, unit_of_measure,
       cost_price, selling_price, reorder_point, reorder_qty, status)
     VALUES (@id, @tenant_id, @name, @sku, @category, @uom, @cost, @price,
       @reorder_point, @reorder_qty, @status)`
  ).run({
    id, tenant_id: tenantId, name: b.name.trim(), sku: b.sku.trim(),
    category: b.category.trim(), uom: b.unit_of_measure?.trim() || 'unit',
    cost: Number(b.cost_price) || 0, price: Number(b.selling_price) || 0,
    reorder_point: Number(b.reorder_point) || 0, reorder_qty: Number(b.reorder_qty) || 0,
    status: b.status === 'archived' ? 'archived' : 'active',
  });
  const p = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as Product;
  res.status(201).json(decorate(p, getStockLevel(tenantId, id)));
});

// PATCH /api/products/:id — edit master data (never stock).
products.patch('/:id', (req, res) => {
  const { tenantId } = req.ctx;
  const existing = db
    .prepare(`SELECT * FROM products WHERE tenant_id = ? AND id = ?`)
    .get(tenantId, req.params.id) as Product | undefined;
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const b = req.body ?? {};
  const merged = {
    name: b.name?.trim() ?? existing.name,
    category: b.category?.trim() ?? existing.category,
    unit_of_measure: b.unit_of_measure?.trim() ?? existing.unit_of_measure,
    cost_price: b.cost_price !== undefined ? Number(b.cost_price) : existing.cost_price,
    selling_price: b.selling_price !== undefined ? Number(b.selling_price) : existing.selling_price,
    reorder_point: b.reorder_point !== undefined ? Number(b.reorder_point) : existing.reorder_point,
    reorder_qty: b.reorder_qty !== undefined ? Number(b.reorder_qty) : existing.reorder_qty,
    status: b.status === 'archived' || b.status === 'active' ? b.status : existing.status,
  };
  db.prepare(
    `UPDATE products SET name=@name, category=@category, unit_of_measure=@unit_of_measure,
       cost_price=@cost_price, selling_price=@selling_price, reorder_point=@reorder_point,
       reorder_qty=@reorder_qty, status=@status
     WHERE tenant_id=@tenant_id AND id=@id`
  ).run({ ...merged, tenant_id: tenantId, id: req.params.id });
  const p = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id) as Product;
  res.json(decorate(p, getStockLevel(tenantId, p.id)));
});

// POST /api/products/:id/adjust — manual stock correction (ADJUSTMENT movement).
products.post('/:id/adjust', (req, res) => {
  const { tenantId, userId } = req.ctx;
  const p = db
    .prepare(`SELECT * FROM products WHERE tenant_id = ? AND id = ?`)
    .get(tenantId, req.params.id) as Product | undefined;
  if (!p) return res.status(404).json({ error: 'Product not found' });

  const b = req.body ?? {};
  const qty = Number(b.quantity);
  const direction = b.direction === 'IN' ? 'IN' : b.direction === 'OUT' ? 'OUT' : null;
  try {
    if (!direction) throw new ValidationError('Direction must be IN or OUT.');
    if (!(qty > 0)) throw new ValidationError('Quantity must be a positive number.');
    if (!b.reason?.trim()) throw new ValidationError('A reason is required for an adjustment.');
    const id = appendMovement({
      tenantId, productId: p.id, movementType: 'ADJUSTMENT', direction,
      quantity: qty, unitCost: direction === 'IN' ? p.cost_price : null,
      reason: b.reason.trim(), referenceDoc: b.reference_doc?.trim() || 'ADJUSTMENT', userId,
    });
    res.status(201).json({ id, level: getStockLevel(tenantId, p.id) });
  } catch (e) {
    if (e instanceof ValidationError) return res.status(400).json({ error: e.message });
    throw e;
  }
});
