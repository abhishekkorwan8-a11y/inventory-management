import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { appendMovement, checkOversell } from '../services/movements.js';

export const sales = Router();

const nextReference = (tenantId: string) => {
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM sales WHERE tenant_id = ?`)
    .get(tenantId) as { c: number };
  return `INV-${5000 + row.c + 1}`;
};

// GET /api/sales — list with line/value summary.
sales.get('/', (req, res) => {
  const { tenantId } = req.ctx;
  const rows = db
    .prepare(
      `SELECT s.*, COUNT(l.id) AS line_count, COALESCE(SUM(l.quantity), 0) AS total_qty
         FROM sales s LEFT JOIN sale_lines l ON l.sale_id = s.id
        WHERE s.tenant_id = ?
        GROUP BY s.id ORDER BY s.created_at DESC LIMIT 200`
    )
    .all(tenantId);
  res.json(rows);
});

sales.get('/:id', (req, res) => {
  const { tenantId } = req.ctx;
  const sale = db
    .prepare(`SELECT * FROM sales WHERE tenant_id = ? AND id = ?`)
    .get(tenantId, req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  const lines = db
    .prepare(
      `SELECT l.*, p.name AS product_name, p.sku FROM sale_lines l
         JOIN products p ON p.id = l.product_id WHERE l.sale_id = ?`
    )
    .all(req.params.id);
  res.json({ ...sale, lines });
});

// POST /api/sales — record a sale; appends SALE (OUT) movements.
// Blocks overselling unless { allow_oversell: true } is passed (warn-and-confirm).
sales.post('/', (req, res) => {
  const { tenantId, userId } = req.ctx;
  const b = req.body ?? {};
  const lines = Array.isArray(b.lines) ? b.lines : [];
  if (lines.length === 0) return res.status(400).json({ error: 'Add at least one line item.' });
  for (const l of lines) {
    if (!l.product_id || !(Number(l.quantity) > 0)) {
      return res.status(400).json({ error: 'Each line needs a product and a positive quantity.' });
    }
  }

  const normalized = lines.map((l: any) => ({
    productId: l.product_id,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unit_price) || 0,
  }));

  // Oversell guard — derived from the ledger.
  const issues = checkOversell(tenantId, normalized);
  if (issues.length > 0 && !b.allow_oversell) {
    const named = issues.map((i) => {
      const p = db.prepare(`SELECT name FROM products WHERE id = ?`).get(i.productId) as { name: string };
      return { ...i, name: p?.name ?? i.productId };
    });
    return res.status(409).json({
      error: 'oversell',
      message: 'Some items would go below zero on-hand stock.',
      issues: named,
    });
  }

  const id = `sale_${nanoid(8)}`;
  const reference = b.reference?.trim() || nextReference(tenantId);
  const occurredAt = new Date().toISOString();
  const total = normalized.reduce((sum: number, l: any) => sum + l.quantity * l.unitPrice, 0);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO sales (id, tenant_id, reference, total, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, tenantId, reference, Math.round(total * 100) / 100, b.notes?.trim() || null, occurredAt);
    for (const l of normalized) {
      db.prepare(
        `INSERT INTO sale_lines (id, tenant_id, sale_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(`sl_${nanoid(8)}`, tenantId, id, l.productId, l.quantity, l.unitPrice);
      appendMovement({
        tenantId, productId: l.productId, movementType: 'SALE', direction: 'OUT',
        quantity: l.quantity, referenceDoc: reference, userId, occurredAt,
      });
    }
  });
  tx();
  res.status(201).json({ id, reference, total: Math.round(total * 100) / 100 });
});
