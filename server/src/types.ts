export type Role = 'owner' | 'staff';
export type ProductStatus = 'active' | 'archived';
export type MovementType = 'PURCHASE_RECEIPT' | 'SALE' | 'ADJUSTMENT' | 'RETURN';
export type Direction = 'IN' | 'OUT';
export type POStatus = 'draft' | 'received';

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku: string;
  category: string;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  reorder_point: number;
  reorder_qty: number;
  status: ProductStatus;
  created_at: string;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact: string | null;
  address: string | null;
  created_at: string;
}

export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  movement_type: MovementType;
  direction: Direction;
  quantity: number;
  unit_cost: number | null;
  reason: string | null;
  reference_doc: string | null;
  user_id: string | null;
  occurred_at: string;
  created_at: string;
}

/** Derived per-product stock position — computed from the ledger, never stored. */
export interface StockLevel {
  product_id: string;
  qty_on_hand: number;
  avg_cost: number;   // weighted-average cost
  value: number;      // qty_on_hand * avg_cost
}
