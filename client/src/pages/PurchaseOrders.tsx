import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { api, ProductRow, PurchaseOrder, Supplier } from '../lib/api';
import { Loading, ErrorState, PageHeader, Badge, Modal, EmptyState } from '../components/ui';
import { IconPlus, IconTruck, IconX } from '../components/icons';
import { useToast } from '../components/toast';
import { currency, number, dateShort } from '../lib/format';

export function PurchaseOrders() {
  const { data, loading, error, refetch } = useApi<PurchaseOrder[]>('/purchase-orders');
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'received'>('all');
  const navigate = useNavigate();

  const rows = (data ?? []).filter((po) => filter === 'all' ? true : po.status === filter);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  const draftCount = (data ?? []).filter((p) => p.status === 'draft').length;

  return (
    <div>
      <PageHeader title="Purchase Orders"
        subtitle={`${number(data?.length ?? 0)} orders · ${draftCount} awaiting receipt`}
        actions={
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <IconPlus className="w-4 h-4" /> New purchase order
          </button>
        } />

      <div className="mb-4 flex gap-1.5">
        {(['all', 'draft', 'received'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn ${filter === f ? 'bg-slate-900 text-white' : 'btn-secondary'} capitalize`}>
            {f}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Reference</th>
                <th className="th">Supplier</th>
                <th className="th text-right">Lines</th>
                <th className="th text-right">Units</th>
                <th className="th text-right">Order value</th>
                <th className="th">Created</th>
                <th className="th text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                  <td className="td font-mono text-xs font-medium text-slate-700">{po.reference}</td>
                  <td className="td font-medium text-slate-700">{po.supplier_name}</td>
                  <td className="td text-right tabular-nums">{number(po.line_count)}</td>
                  <td className="td text-right tabular-nums">{number(po.total_qty)}</td>
                  <td className="td text-right tabular-nums font-medium">{currency(po.total_cost)}</td>
                  <td className="td text-slate-500">{dateShort(po.created_at)}</td>
                  <td className="td text-right">
                    {po.status === 'received'
                      ? <Badge tone="green">Received</Badge>
                      : <Badge tone="amber">Draft</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <EmptyState icon={<IconTruck className="w-10 h-10" />} title="No purchase orders"
            hint="Create a purchase order to bring stock in. Receiving it appends purchase-receipt movements." />
        )}
      </div>

      <NewPOModal open={showNew} onClose={() => setShowNew(false)}
        onCreated={(id) => { setShowNew(false); refetch(); navigate(`/purchase-orders/${id}`); }} />
    </div>
  );
}

interface Line { product_id: string; quantity: string; unit_cost: string; }

function NewPOModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const { data: suppliers } = useApi<Supplier[]>('/suppliers');
  const { data: products } = useApi<ProductRow[]>('/products');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity: '', unit_cost: '' }]);
  const [saving, setSaving] = useState(false);

  const activeProducts = useMemo(() => (products ?? []).filter((p) => p.status === 'active'), [products]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls) => [...ls, { product_id: '', quantity: '', unit_cost: '' }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const onPickProduct = (i: number, productId: string) => {
    const p = activeProducts.find((x) => x.id === productId);
    setLine(i, {
      product_id: productId,
      quantity: lines[i].quantity || (p ? String(p.reorder_qty) : ''),
      unit_cost: lines[i].unit_cost || (p ? String(p.cost_price) : ''),
    });
  };

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);
  const valid = supplierId && lines.some((l) => l.product_id && Number(l.quantity) > 0);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        supplier_id: supplierId,
        notes,
        lines: lines
          .filter((l) => l.product_id && Number(l.quantity) > 0)
          .map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) || 0 })),
      };
      const res = await api.post<{ id: string }>('/purchase-orders', payload);
      toast('Purchase order created');
      setSupplierId(''); setNotes(''); setLines([{ product_id: '', quantity: '', unit_cost: '' }]);
      onCreated(res.id);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New purchase order" wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="label">Supplier</label>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Select a supplier…</option>
            {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Weekly replenishment" />
        </div>
      </div>

      <label className="label">Line items</label>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <select className="input flex-1" value={l.product_id} onChange={(e) => onPickProduct(i, e.target.value)}>
              <option value="">Select product…</option>
              {activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <input type="number" min="0" className="input w-24" placeholder="Qty"
              value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
            <input type="number" min="0" step="0.01" className="input w-28" placeholder="Unit cost"
              value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} />
            <div className="w-24 text-right text-sm tabular-nums text-slate-500">
              {currency((Number(l.quantity) || 0) * (Number(l.unit_cost) || 0))}
            </div>
            <button className="btn-ghost px-2" onClick={() => removeLine(i)} disabled={lines.length === 1}>
              <IconX className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button className="btn-ghost mt-2 text-brand-600" onClick={addLine}>
        <IconPlus className="w-4 h-4" /> Add line
      </button>

      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <div className="text-sm text-slate-500">Order total</div>
        <div className="text-lg font-semibold text-slate-900">{currency(total)}</div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving || !valid} onClick={submit}>
          {saving ? 'Saving…' : 'Create draft PO'}
        </button>
      </div>
    </Modal>
  );
}
