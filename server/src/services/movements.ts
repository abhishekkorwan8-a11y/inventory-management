// ============================================================================
//  MOVEMENTS SERVICE — the ONLY way stock movements are written.
// ============================================================================
//
//  The ledger is append-only. This module exposes a single `appendMovement`
//  primitive plus higher-level helpers (receive PO, record sale, adjust).
//  There is intentionally no update or delete — corrections are new
//  ADJUSTMENT movements.
// ============================================================================

import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { getQtyOnHand } from './ledger.js';
import type { Direction, MovementType } from '../types.js';

export interface AppendMovementInput {
  tenantId: string;
  productId: string;
  movementType: MovementType;
  direction: Direction;
  quantity: number;
  unitCost?: number | null;
  reason?: string | null;
  referenceDoc?: string | null;
  userId?: string | null;
  occurredAt?: string; // ISO string; defaults to now
}

const insertMovement = db.prepare(
  `INSERT INTO stock_movements
     (id, tenant_id, product_id, movement_type, direction, quantity,
      unit_cost, reason, reference_doc, user_id, occurred_at)
   VALUES
     (@id, @tenant_id, @product_id, @movement_type, @direction, @quantity,
      @unit_cost, @reason, @reference_doc, @user_id, @occurred_at)`
);

/** Append a single immutable movement row. Validates the invariants. */
export function appendMovement(input: AppendMovementInput): string {
  if (!(input.quantity > 0)) {
    throw new ValidationError('Movement quantity must be a positive number.');
  }
  if (input.movementType === 'ADJUSTMENT' && !input.reason?.trim()) {
    throw new ValidationError('A stock adjustment requires a reason.');
  }

  const id = `mov_${nanoid(12)}`;
  insertMovement.run({
    id,
    tenant_id: input.tenantId,
    product_id: input.productId,
    movement_type: input.movementType,
    direction: input.direction,
    quantity: input.quantity,
    unit_cost: input.unitCost ?? null,
    reason: input.reason ?? null,
    reference_doc: input.referenceDoc ?? null,
    user_id: input.userId ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  });
  return id;
}

export interface SaleLineRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Check whether a set of outbound sale lines would drive any product below
 * zero given the current derived stock. Used to block/warn on overselling.
 */
export function checkOversell(
  tenantId: string,
  lines: SaleLineRequest[]
): { productId: string; available: number; requested: number }[] {
  const requestedByProduct = new Map<string, number>();
  for (const l of lines) {
    requestedByProduct.set(
      l.productId,
      (requestedByProduct.get(l.productId) ?? 0) + l.quantity
    );
  }

  const issues: { productId: string; available: number; requested: number }[] = [];
  for (const [productId, requested] of requestedByProduct) {
    const available = getQtyOnHand(tenantId, productId);
    if (requested > available) {
      issues.push({ productId, available, requested });
    }
  }
  return issues;
}

export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
