import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import type { Supplier } from '../types.js';

export const suppliers = Router();

// GET /api/suppliers — list with a count of products supplied.
suppliers.get('/', (req, res) => {
  const { tenantId } = req.ctx;
  const rows = db
    .prepare(`SELECT * FROM suppliers WHERE tenant_id = ? ORDER BY name ASC`)
    .all(tenantId) as Supplier[];
  const poCounts = db
    .prepare(
      `SELECT supplier_id, COUNT(*) AS po_count
         FROM purchase_orders WHERE tenant_id = ? GROUP BY supplier_id`
    )
    .all(tenantId) as { supplier_id: string; po_count: number }[];
  const map = new Map(poCounts.map((c) => [c.supplier_id, c.po_count]));
  res.json(rows.map((s) => ({ ...s, po_count: map.get(s.id) ?? 0 })));
});

suppliers.get('/:id', (req, res) => {
  const { tenantId } = req.ctx;
  const s = db
    .prepare(`SELECT * FROM suppliers WHERE tenant_id = ? AND id = ?`)
    .get(tenantId, req.params.id) as Supplier | undefined;
  if (!s) return res.status(404).json({ error: 'Supplier not found' });
  res.json(s);
});

suppliers.post('/', (req, res) => {
  const { tenantId } = req.ctx;
  const b = req.body ?? {};
  if (!b.name?.trim()) return res.status(400).json({ error: 'Supplier name is required.' });
  const id = `sup_${nanoid(8)}`;
  db.prepare(
    `INSERT INTO suppliers (id, tenant_id, name, contact, address) VALUES (?, ?, ?, ?, ?)`
  ).run(id, tenantId, b.name.trim(), b.contact?.trim() || null, b.address?.trim() || null);
  res.status(201).json(db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id));
});
