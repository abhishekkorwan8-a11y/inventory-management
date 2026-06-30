// Thin typed client for the inventory API. The acting user is sent as a
// header so movements are attributed correctly.

let actingUserId = localStorage.getItem('actingUserId') || '';

export function setActingUser(id: string) {
  actingUserId = id;
  localStorage.setItem('actingUserId', id);
}
export function getActingUser() {
  return actingUserId;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.message || body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(actingUserId ? { 'x-user-id': actingUserId } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b),
};

// ---- types -----------------------------------------------------------------
export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  reorder_point: number;
  reorder_qty: number;
  status: 'active' | 'archived';
  qty_on_hand: number;
  avg_cost: number;
  stock_value: number;
  low_stock: boolean;
}

export interface Movement {
  id: string;
  movement_type: 'PURCHASE_RECEIPT' | 'SALE' | 'ADJUSTMENT' | 'RETURN';
  direction: 'IN' | 'OUT';
  quantity: number;
  unit_cost: number | null;
  reason: string | null;
  reference_doc: string | null;
  occurred_at: string;
  product_name?: string;
  sku?: string;
  unit_of_measure?: string;
  user_name?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  po_count?: number;
}

export interface PurchaseOrder {
  id: string;
  reference: string;
  supplier_id: string;
  supplier_name: string;
  status: 'draft' | 'received';
  notes: string | null;
  created_at: string;
  received_at: string | null;
  line_count: number;
  total_cost: number;
  total_qty: number;
}

export interface POLine {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit_of_measure: string;
  quantity: number;
  unit_cost: number;
}

export interface Sale {
  id: string;
  reference: string;
  total: number;
  notes: string | null;
  created_at: string;
  line_count: number;
  total_qty: number;
}

export interface DashboardSummary {
  total_skus: number;
  total_value: number;
  low_stock_count: number;
  units_on_hand: number;
  revenue_30d: number;
  sales_30d: number;
}

export interface MeInfo {
  tenant: { id: string; name: string };
  users: { id: string; name: string; role: 'owner' | 'staff' }[];
  current_user_id: string;
}
