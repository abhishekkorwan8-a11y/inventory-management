import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { api, Movement, ProductRow } from '../lib/api';
import { Loading, ErrorState, Badge, Modal, StatCard, EmptyState } from '../components/ui';
import { MovementTypeBadge, QtyDelta } from '../components/MovementBadge';
import {
  IconBox, IconDollar, IconLayers, IconAlert, IconHistory, IconChevronRight,
} from '../components/icons';
import { useToast } from '../components/toast';
import { currency, number, dateTime } from '../lib/format';

export function ProductDetail() {
  const { id } = useParams();
  const product = useApi<ProductRow>(`/products/${id}`, [id]);
  const movements = useApi<Movement[]>(`/products/${id}/movements`, [id]);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  if (product.loading) return <Loading />;
  if (product.error || !product.data) return <ErrorState message={product.error ?? 'Not found'} />;
  const p = product.data;

  const reload = () => { product.refetch(); movements.refetch(); };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link to="/products" className="hover:text-slate-600">Products</Link>
        <IconChevronRight className="w-4 h-4" />
        <span className="text-slate-600">{p.sku}</span>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{p.name}</h1>
            {p.status === 'archived'
              ? <Badge tone="slate">Archived</Badge>
              : p.low_stock
                ? <Badge tone={p.qty_on_hand <= 0 ? 'red' : 'amber'}>Low stock</Badge>
                : <Badge tone="green">In stock</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {p.sku} · {p.category} · sold in {p.unit_of_measure}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn-primary" onClick={() => setShowAdjust(true)}>Adjust stock</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="On hand" value={`${number(p.qty_on_hand)} ${p.unit_of_measure}`}
          tone={p.low_stock ? 'amber' : 'blue'} icon={<IconBox className="w-5 h-5" />}
          sub={`reorder at ${number(p.reorder_point)}`} />
        <StatCard label="Weighted-avg cost" value={currency(p.avg_cost)} tone="violet"
          icon={<IconLayers className="w-5 h-5" />} sub={`list cost ${currency(p.cost_price)}`} />
        <StatCard label="Stock value" value={currency(p.stock_value)} tone="green"
          icon={<IconDollar className="w-5 h-5" />} sub="at weighted-average cost" />
        <StatCard label="Selling price" value={currency(p.selling_price)} tone="blue"
          icon={<IconDollar className="w-5 h-5" />}
          sub={p.cost_price > 0 ? `${Math.round((p.selling_price / p.cost_price - 1) * 100)}% markup` : ''} />
      </div>

      {p.low_stock && p.status === 'active' && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <IconAlert className="w-5 h-5 shrink-0" />
          On hand ({number(p.qty_on_hand)}) is at or below the reorder point ({number(p.reorder_point)}).
          Suggested reorder quantity: <strong>{number(p.reorder_qty)} {p.unit_of_measure}</strong>.
        </div>
      )}

      {/* Movement ledger */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <IconHistory className="w-4 h-4 text-slate-400" /> Movement ledger
          </h3>
          <span className="text-xs text-slate-400">
            {number(movements.data?.length ?? 0)} entries · append-only audit trail
          </span>
        </div>
        {movements.loading ? <Loading /> : movements.data && movements.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">When</th>
                  <th className="th">Type</th>
                  <th className="th text-right">Change</th>
                  <th className="th text-right">Unit cost</th>
                  <th className="th">Reference</th>
                  <th className="th">Reason</th>
                  <th className="th">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.data.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="td whitespace-nowrap text-slate-500">{dateTime(m.occurred_at)}</td>
                    <td className="td"><MovementTypeBadge type={m.movement_type} /></td>
                    <td className="td text-right">
                      <QtyDelta direction={m.direction} quantity={m.quantity} />
                    </td>
                    <td className="td text-right tabular-nums text-slate-500">
                      {m.unit_cost != null ? currency(m.unit_cost) : '—'}
                    </td>
                    <td className="td font-mono text-xs text-slate-500">{m.reference_doc ?? '—'}</td>
                    <td className="td text-slate-500">{m.reason ?? '—'}</td>
                    <td className="td text-slate-500">{m.user_name ?? 'system'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No movements yet" hint="Receive a purchase order or record an adjustment to add stock." />
        )}
      </div>

      <AdjustModal open={showAdjust} onClose={() => setShowAdjust(false)} product={p}
        onDone={() => { setShowAdjust(false); reload(); }} />
      <EditModal open={showEdit} onClose={() => setShowEdit(false)} product={p}
        onDone={() => { setShowEdit(false); reload(); }} />
    </div>
  );
}

function AdjustModal({ open, onClose, product, onDone }: {
  open: boolean; onClose: () => void; product: ProductRow; onDone: () => void;
}) {
  const toast = useToast();
  const [direction, setDirection] = useState<'IN' | 'OUT'>('OUT');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/products/${product.id}/adjust`, {
        direction, quantity: Number(quantity), reason,
      });
      toast('Adjustment recorded');
      setQuantity(''); setReason('');
      onDone();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const projected = product.qty_on_hand + (direction === 'IN' ? 1 : -1) * (Number(quantity) || 0);

  return (
    <Modal open={open} onClose={onClose} title="Stock adjustment">
      <p className="text-sm text-slate-500 mb-4">
        Adjustments are recorded as an immutable <strong>ADJUSTMENT</strong> movement, not an edit.
        A reason is mandatory.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button onClick={() => setDirection('OUT')}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${direction === 'OUT'
            ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-300 text-slate-600'}`}>
          Decrease (−)
        </button>
        <button onClick={() => setDirection('IN')}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${direction === 'IN'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'}`}>
          Increase (+)
        </button>
      </div>
      <div className="mb-4">
        <label className="label">Quantity ({product.unit_of_measure})</label>
        <input type="number" min="0" step="0.01" className="input" value={quantity}
          onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
      </div>
      <div className="mb-4">
        <label className="label">Reason (required)</label>
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Damaged in storage, stock count correction" list="reasons" />
        <datalist id="reasons">
          <option value="Stock count correction" /><option value="Damaged in storage" />
          <option value="Expired stock removed" /><option value="Breakage" /><option value="Found stock" />
        </datalist>
      </div>
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 flex justify-between">
        <span>On hand after adjustment</span>
        <span className={`font-semibold ${projected < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
          {number(product.qty_on_hand)} → {number(projected)}
        </span>
      </div>
      {projected < 0 && (
        <p className="mt-2 text-xs text-rose-600">Warning: this would drive on-hand stock below zero.</p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving || !(Number(quantity) > 0) || !reason.trim()} onClick={submit}>
          {saving ? 'Saving…' : 'Record adjustment'}
        </button>
      </div>
    </Modal>
  );
}

function EditModal({ open, onClose, product, onDone }: {
  open: boolean; onClose: () => void; product: ProductRow; onDone: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: product.name, category: product.category, unit_of_measure: product.unit_of_measure,
    cost_price: String(product.cost_price), selling_price: String(product.selling_price),
    reorder_point: String(product.reorder_point), reorder_qty: String(product.reorder_qty),
    status: product.status,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await api.patch(`/products/${product.id}`, {
        ...form,
        cost_price: Number(form.cost_price), selling_price: Number(form.selling_price),
        reorder_point: Number(form.reorder_point), reorder_qty: Number(form.reorder_qty),
      });
      toast('Product updated');
      onDone();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit product" wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Product name</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Category</label>
          <input className="input" value={form.category} onChange={(e) => set('category', e.target.value)} />
        </div>
        <div>
          <label className="label">Unit of measure</label>
          <input className="input" value={form.unit_of_measure} onChange={(e) => set('unit_of_measure', e.target.value)} />
        </div>
        <div>
          <label className="label">Cost price</label>
          <input type="number" step="0.01" className="input" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} />
        </div>
        <div>
          <label className="label">Selling price</label>
          <input type="number" step="0.01" className="input" value={form.selling_price} onChange={(e) => set('selling_price', e.target.value)} />
        </div>
        <div>
          <label className="label">Reorder point</label>
          <input type="number" className="input" value={form.reorder_point} onChange={(e) => set('reorder_point', e.target.value)} />
        </div>
        <div>
          <label className="label">Reorder quantity</label>
          <input type="number" className="input" value={form.reorder_qty} onChange={(e) => set('reorder_qty', e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        Editing master data never changes stock. On-hand quantity only ever changes via ledger movements.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving} onClick={submit}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </Modal>
  );
}
