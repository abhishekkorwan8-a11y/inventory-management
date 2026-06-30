import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db, tx } from '../db/index.js';
import { appendMovement } from '../services/movements.js';

export const purchaseOrders = Router();

const nextReference = (tenantId: string, prefix: string, table: string) => {
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE tenant_id = ?`)
    .get(tenantId) as { c: number };
  return `${prefix}-${1000 + row.c + 1}`;
};

// GET /api/purchase-orders — list with supplier name + line/value summary.
purchaseOrders.get('/', (req, res) => {
  const { tenantId } = req.ctx;
  const rows = db
    .prepare(
      `SELECT po.*, s.name AS supplier_name,
              COUNT(l.id) AS line_count,
              COALESCE(SUM(l.quantity * l.unit_cost), 0) AS total_cost,
              COALESCE(SUM(l.quantity), 0) AS total_qty
         FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         LEFT JOIN purchase_order_lines l ON l.po_id = po.id
        WHERE po.tenant_id = ?
        GROUP BY po.id
        ORDER BY po.created_at DESC`
    )
    .all(tenantId);
  res.json(rows);
});

// GET /api/purchase-orders/:id — header + line items.
purchaseOrders.get('/:id', (req, res) => {
  const { tenantId } = req.ctx;
  const po = db
    .prepare(
      `SELECT po.*, s.name AS supplier_name FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.tenant_id = ? AND po.id = ?`
    )
    .get(tenantId, req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  const lines = db
    .prepare(
      `SELECT l.*, p.name AS product_name, p.sku, p.unit_of_measure
         FROM purchase_order_lines l JOIN products p ON p.id = l.product_id
        WHERE l.po_id = ?`
    )
    .all(req.params.id);
  res.json({ ...po, lines });
});

// POST /api/purchase-orders — create a draft PO.
purchaseOrders.post('/', (req, res) => {
  const { tenantId } = req.ctx;
  const b = req.body ?? {};
  if (!b.supplier_id) return res.status(400).json({ error: 'A supplier is required.' });
  const lines = Array.isArray(b.lines) ? b.lines : [];
  if (lines.length === 0) return res.status(400).json({ error: 'Add at least one line item.' });
  for (const l of lines) {
    if (!l.product_id || !(Number(l.quantity) > 0) || !(Number(l.unit_cost) >= 0)) {
      return res.status(400).json({ error: 'Each line needs a product, positive quantity and unit cost.' });
    }
  }

  const id = `po_${nanoid(8)}`;
  const reference = b.reference?.trim() || nextReference(tenantId, 'PO', 'purchase_orders');
  tx(() => {
    db.prepare(
      `INSERT INTO purchase_orders (id, tenant_id, supplier_id, reference, status, notes)
       VALUES (?, ?, ?, ?, 'draft', ?)`
    ).run(id, tenantId, b.supplier_id, reference, b.notes?.trim() || null);
    for (const l of lines) {
      db.prepare(
        `INSERT INTO purchase_order_lines (id, tenant_id, po_id, product_id, quantity, unit_cost)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(`pol_${nanoid(8)}`, tenantId, id, l.product_id, Number(l.quantity), Number(l.unit_cost));
    }
  });
  res.status(201).json({ id, reference });
});

// POST /api/purchase-orders/:id/receive — receive stock; append PURCHASE_RECEIPT movements.
purchaseOrders.post('/:id/receive', (req, res) => {
  const { tenantId, userId } = req.ctx;
  const po = db
    .prepare(`SELECT * FROM purchase_orders WHERE tenant_id = ? AND id = ?`)
    .get(tenantId, req.params.id) as { id: string; reference: string; status: string } | undefined;
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  if (po.status === 'received') return res.status(400).json({ error: 'This PO has already been received.' });

  const lines = db
    .prepare(`SELECT * FROM purchase_order_lines WHERE po_id = ?`)
    .all(po.id) as { product_id: string; quantity: number; unit_cost: number }[];
  if (lines.length === 0) return res.status(400).json({ error: 'This PO has no line items to receive.' });

  const receivedAt = new Date().toISOString();
  tx(() => {
    for (const l of lines) {
      appendMovement({
        tenantId, productId: l.product_id, movementType: 'PURCHASE_RECEIPT',
        direction: 'IN', quantity: l.quantity, unitCost: l.unit_cost,
        referenceDoc: po.reference, userId, occurredAt: receivedAt,
      });
    }
    db.prepare(`UPDATE purchase_orders SET status = 'received', received_at = ? WHERE id = ?`)
      .run(receivedAt, po.id);
  });
  res.json({ id: po.id, status: 'received', received_at: receivedAt, lines_received: lines.length });
});
