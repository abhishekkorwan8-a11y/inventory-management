import { Router } from 'express';
import { db } from '../db/index.js';
import {
  getStockLevels,
  getInventoryValuation,
  getStockValueSeries,
} from '../services/ledger.js';
import type { Product } from '../types.js';

export const dashboard = Router();

// GET /api/dashboard — headline metrics for the landing screen.
dashboard.get('/', (req, res) => {
  const { tenantId } = req.ctx;
  const productRows = db
    .prepare(`SELECT * FROM products WHERE tenant_id = ? AND status = 'active'`)
    .all(tenantId) as Product[];
  const levels = getStockLevels(tenantId);

  let lowStock = 0;
  let unitsOnHand = 0;
  for (const p of productRows) {
    const lvl = levels.get(p.id);
    const qty = lvl?.qty_on_hand ?? 0;
    unitsOnHand += qty;
    if (qty <= p.reorder_point) lowStock++;
  }

  const totalSkus = productRows.length;
  const totalValue = getInventoryValuation(tenantId);

  // Sales in the trailing 30 days (revenue context for the dashboard).
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sales30 = db
    .prepare(`SELECT COALESCE(SUM(total), 0) AS rev, COUNT(*) AS cnt
                FROM sales WHERE tenant_id = ? AND created_at >= ?`)
    .get(tenantId, since) as { rev: number; cnt: number };

  res.json({
    total_skus: totalSkus,
    total_value: totalValue,
    low_stock_count: lowStock,
    units_on_hand: Math.round(unitsOnHand),
    revenue_30d: Math.round(sales30.rev * 100) / 100,
    sales_30d: sales30.cnt,
  });
});

// GET /api/dashboard/stock-value-series — for the value-over-time chart.
dashboard.get('/stock-value-series', (req, res) => {
  const { tenantId } = req.ctx;
  const days = Math.min(180, Math.max(7, Number(req.query.days) || 90));
  res.json(getStockValueSeries(tenantId, days));
});

// GET /api/dashboard/recent-movements — append-only feed across all products.
dashboard.get('/recent-movements', (req, res) => {
  const { tenantId } = req.ctx;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const rows = db
    .prepare(
      `SELECT m.id, m.movement_type, m.direction, m.quantity, m.unit_cost,
              m.reason, m.reference_doc, m.occurred_at,
              p.name AS product_name, p.sku, p.unit_of_measure,
              u.name AS user_name
         FROM stock_movements m
         JOIN products p ON p.id = m.product_id
         LEFT JOIN users u ON u.id = m.user_id
        WHERE m.tenant_id = ?
        ORDER BY m.occurred_at DESC, m.created_at DESC
        LIMIT ?`
    )
    .all(tenantId, limit);
  res.json(rows);
});

// GET /api/dashboard/category-breakdown — inventory value grouped by category.
dashboard.get('/category-breakdown', (req, res) => {
  const { tenantId } = req.ctx;
  const products = db
    .prepare(`SELECT id, category FROM products WHERE tenant_id = ?`)
    .all(tenantId) as { id: string; category: string }[];
  const levels = getStockLevels(tenantId);
  const byCat = new Map<string, number>();
  for (const p of products) {
    const v = levels.get(p.id)?.value ?? 0;
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + v);
  }
  const out = [...byCat.entries()]
    .map(([category, value]) => ({ category, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
  res.json(out);
});
