import { useMemo, useState } from 'react';
import { useApi } from '../lib/useApi';
import { api, ApiError, ProductRow, Sale } from '../lib/api';
import { Loading, ErrorState, PageHeader, Modal, EmptyState, Badge } from '../components/ui';
import { IconPlus, IconCart, IconX, IconAlert } from '../components/icons';
import { useToast } from '../components/toast';
import { currency, number, dateTime } from '../lib/format';

export function Sales() {
  const { data, loading, error, refetch } = useApi<Sale[]>('/sales');
  const [showNew, setShowNew] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Sales" subtitle="Recording a sale appends SALE (OUT) movements to the ledger."
        actions={
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <IconPlus className="w-4 h-4" /> Record sale
          </button>
        } />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Reference</th>
                <th className="th">When</th>
                <th className="th text-right">Lines</th>
                <th className="th text-right">Units</th>
                <th className="th text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="td font-mono text-xs font-medium text-slate-700">{s.reference}</td>
                  <td className="td text-slate-500">{dateTime(s.created_at)}</td>
                  <td className="td text-right tabular-nums">{number(s.line_count)}</td>
                  <td className="td text-right tabular-nums">{number(s.total_qty)}</td>
                  <td className="td text-right tabular-nums font-medium">{currency(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(data ?? []).length === 0 && (
          <EmptyState icon={<IconCart className="w-10 h-10" />} title="No sales recorded"
            hint="Record a sale to issue stock. Each line appends a SALE movement." />
        )}
      </div>

      <NewSaleModal open={showNew} onClose={() => setShowNew(false)}
        onCreated={() => { setShowNew(false); refetch(); }} />
    </div>
  );
}

interface Line { product_id: string; quantity: string; unit_price: string; }
interface OversellIssue { name: string; available: number; requested: number; }

function NewSaleModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const toast = useToast();
  const { data: products } = useApi<ProductRow[]>('/products');
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity: '', unit_price: '' }]);
  const [saving, setSaving] = useState(false);
  const [oversell, setOversell] = useState<OversellIssue[] | null>(null);

  const activeProducts = useMemo(() => (products ?? []).filter((p) => p.status === 'active'), [products]);
  const stockById = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls) => [...ls, { product_id: '', quantity: '', unit_price: '' }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const onPick = (i: number, productId: string) => {
    const p = stockById.get(productId);
    setLine(i, {
      product_id: productId,
      quantity: lines[i].quantity || '1',
      unit_price: lines[i].unit_price || (p ? String(p.selling_price) : ''),
    });
  };

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0);
  const valid = lines.some((l) => l.product_id && Number(l.quantity) > 0);

  const reset = () => {
    setLines([{ product_id: '', quantity: '', unit_price: '' }]);
    setOversell(null);
  };

  const submit = async (allowOversell = false) => {
    setSaving(true);
    try {
      await api.post('/sales', {
        allow_oversell: allowOversell,
        lines: lines
          .filter((l) => l.product_id && Number(l.quantity) > 0)
          .map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), unit_price: Number(l.unit_price) || 0 })),
      });
      toast('Sale recorded — stock issued');
      reset();
      onCreated();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.error === 'oversell') {
        setOversell(e.body.issues);
      } else {
        toast((e as Error).message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Record sale" wide>
      <label className="label">Line items</label>
      <div className="space-y-2">
        {lines.map((l, i) => {
          const p = stockById.get(l.product_id);
          const over = p && Number(l.quantity) > p.qty_on_hand;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <select className="input" value={l.product_id} onChange={(e) => onPick(i, e.target.value)}>
                  <option value="">Select product…</option>
                  {activeProducts.map((pr) => (
                    <option key={pr.id} value={pr.id}>{pr.name} · {number(pr.qty_on_hand)} on hand</option>
                  ))}
                </select>
                {p && (
                  <p className={`mt-0.5 text-xs ${over ? 'text-rose-500' : 'text-slate-400'}`}>
                    {number(p.qty_on_hand)} {p.unit_of_measure} available
                  </p>
                )}
              </div>
              <input type="number" min="0" className="input w-24" placeholder="Qty"
                value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
              <input type="number" min="0" step="0.01" className="input w-28" placeholder="Price"
                value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} />
              <div className="w-24 text-right text-sm tabular-nums text-slate-500">
                {currency((Number(l.quantity) || 0) * (Number(l.unit_price) || 0))}
              </div>
              <button className="btn-ghost px-2" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                <IconX className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
      <button className="btn-ghost mt-2 text-brand-600" onClick={addLine}>
        <IconPlus className="w-4 h-4" /> Add line
      </button>

      {oversell && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
            <IconAlert className="w-4 h-4" /> Selling below available stock
          </div>
          <ul className="mt-2 space-y-1 text-sm text-rose-700">
            {oversell.map((o, i) => (
              <li key={i} className="flex justify-between">
                <span>{o.name}</span>
                <span className="tabular-nums">requested {number(o.requested)} · only {number(o.available)} on hand</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-rose-600">
            Proceeding will drive on-hand stock negative. This is recorded faithfully in the ledger.
          </p>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <div className="text-sm text-slate-500">Sale total</div>
        <div className="text-lg font-semibold text-slate-900">{currency(total)}</div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={() => { reset(); onClose(); }}>Cancel</button>
        {oversell ? (
          <button className="btn-danger" disabled={saving} onClick={() => submit(true)}>
            {saving ? 'Recording…' : 'Sell anyway'}
          </button>
        ) : (
          <button className="btn-primary" disabled={saving || !valid} onClick={() => submit(false)}>
            {saving ? 'Recording…' : 'Record sale'}
          </button>
        )}
      </div>
    </Modal>
  );
}
