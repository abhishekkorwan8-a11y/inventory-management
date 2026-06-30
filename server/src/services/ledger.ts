// ============================================================================
//  LEDGER SERVICE — the single source of truth for derived stock figures.
// ============================================================================
//
//  Nothing in this codebase stores a stock quantity. Every figure a user
//  sees — quantity-on-hand, inventory value, weighted-average cost, the
//  low-stock flag — is DERIVED here by replaying the immutable
//  `stock_movements` ledger in chronological order.
//
//  This is the one place that "knows how to read the ledger". Routes and
//  the rest of the app depend on these functions and never sum movements
//  themselves.
// ============================================================================

import { db } from '../db/index.js';
import type { Direction, StockLevel } from '../types.js';

interface MovementRow {
  product_id: string;
  direction: Direction;
  quantity: number;
  unit_cost: number | null;
}

/**
 * Replay the ledger to produce the current stock position of every product
 * for a tenant, using the weighted-average (moving-average) cost method.
 *
 * Moving-average cost rules:
 *   - On an inbound movement of qty q at unit cost u:
 *       new_avg = (qty_before * avg_before + q * u) / (qty_before + q)
 *   - On an outbound movement: quantity falls, the average cost is unchanged
 *     (stock leaves "at cost"). This is the textbook moving-average behaviour.
 */
export function getStockLevels(tenantId: string): Map<string, StockLevel> {
  const rows = db
    .prepare(
      `SELECT product_id, direction, quantity, unit_cost
         FROM stock_movements
        WHERE tenant_id = ?
        ORDER BY occurred_at ASC, created_at ASC, id ASC`
    )
    .all(tenantId) as MovementRow[];

  const levels = new Map<string, StockLevel>();

  for (const m of rows) {
    let level = levels.get(m.product_id);
    if (!level) {
      level = { product_id: m.product_id, qty_on_hand: 0, avg_cost: 0, value: 0 };
      levels.set(m.product_id, level);
    }

    if (m.direction === 'IN') {
      const incomingCost = m.unit_cost ?? level.avg_cost;
      const newQty = level.qty_on_hand + m.quantity;
      if (newQty > 0) {
        level.avg_cost =
          (level.qty_on_hand * level.avg_cost + m.quantity * incomingCost) / newQty;
      }
      level.qty_on_hand = newQty;
    } else {
      // OUT — quantity decreases, weighted-average cost is preserved.
      level.qty_on_hand -= m.quantity;
    }
  }

  // Final valuation pass.
  for (const level of levels.values()) {
    level.value = round2(level.qty_on_hand * level.avg_cost);
    level.avg_cost = round2(level.avg_cost);
    level.qty_on_hand = round2(level.qty_on_hand);
  }

  return levels;
}

/** Derived stock position for a single product (zeroed if it has no ledger rows). */
export function getStockLevel(tenantId: string, productId: string): StockLevel {
  return (
    getStockLevels(tenantId).get(productId) ?? {
      product_id: productId,
      qty_on_hand: 0,
      avg_cost: 0,
      value: 0,
    }
  );
}

/** Convenience: just the derived quantity-on-hand for one product. */
export function getQtyOnHand(tenantId: string, productId: string): number {
  return getStockLevel(tenantId, productId).qty_on_hand;
}

/** Total inventory valuation across the tenant (sum of derived line values). */
export function getInventoryValuation(tenantId: string): number {
  let total = 0;
  for (const level of getStockLevels(tenantId).values()) total += level.value;
  return round2(total);
}

/**
 * Derive total inventory value at the end of each of the last `days` days by
 * replaying the ledger once and snapshotting whenever a day boundary is crossed.
 */
export function getStockValueSeries(
  tenantId: string,
  days = 90
): { date: string; value: number }[] {
  const rows = db
    .prepare(
      `SELECT product_id, direction, quantity, unit_cost, occurred_at
         FROM stock_movements
        WHERE tenant_id = ?
        ORDER BY occurred_at ASC, created_at ASC, id ASC`
    )
    .all(tenantId) as (MovementRow & { occurred_at: string })[];

  const now = new Date();
  const thresholds: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(23, 59, 59, 999);
    d.setUTCDate(d.getUTCDate() - i);
    thresholds.push(d.getTime());
  }

  const state = new Map<string, { qty: number; avg: number }>();
  const totalValue = () => {
    let t = 0;
    for (const s of state.values()) t += s.qty * s.avg;
    return round2(t);
  };

  const series: { date: string; value: number }[] = [];
  let ti = 0;
  for (const m of rows) {
    const t = new Date(m.occurred_at).getTime();
    while (ti < thresholds.length && t > thresholds[ti]) {
      series.push({ date: new Date(thresholds[ti]).toISOString().slice(0, 10), value: totalValue() });
      ti++;
    }
    let s = state.get(m.product_id);
    if (!s) {
      s = { qty: 0, avg: 0 };
      state.set(m.product_id, s);
    }
    if (m.direction === 'IN') {
      const cost = m.unit_cost ?? s.avg;
      const nq = s.qty + m.quantity;
      if (nq > 0) s.avg = (s.qty * s.avg + m.quantity * cost) / nq;
      s.qty = nq;
    } else {
      s.qty -= m.quantity;
    }
  }
  while (ti < thresholds.length) {
    series.push({ date: new Date(thresholds[ti]).toISOString().slice(0, 10), value: totalValue() });
    ti++;
  }
  return series;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
