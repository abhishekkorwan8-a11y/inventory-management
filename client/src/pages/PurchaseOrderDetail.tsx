import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { api, POLine } from '../lib/api';
import { Loading, ErrorState, Badge } from '../components/ui';
import { IconChevronRight, IconCheck, IconTruck } from '../components/icons';
import { useToast } from '../components/toast';
import { currency, number, dateTime } from '../lib/format';

interface PODetail {
  id: string; reference: string; supplier_name: string; status: 'draft' | 'received';
  notes: string | null; created_at: string; received_at: string | null; lines: POLine[];
}

export function PurchaseOrderDetail() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useApi<PODetail>(`/purchase-orders/${id}`, [id]);
  const toast = useToast();
  const [receiving, setReceiving] = useState(false);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? 'Not found'} />;

  const total = data.lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const totalUnits = data.lines.reduce((s, l) => s + l.quantity, 0);

  const receive = async () => {
    if (!confirm(`Receive ${data.reference}? This appends purchase-receipt movements and cannot be undone.`)) return;
    setReceiving(true);
    try {
      await api.post(`/purchase-orders/${data.id}/receive`);
      toast('Stock received — movements posted to the ledger');
      refetch();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link to="/purchase-orders" className="hover:text-slate-600">Purchase Orders</Link>
        <IconChevronRight className="w-4 h-4" />
        <span className="text-slate-600 font-mono">{data.reference}</span>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{data.reference}</h1>
            {data.status === 'received'
              ? <Badge tone="green">Received</Badge>
              : <Badge tone="amber">Draft</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {data.supplier_name} · created {dateTime(data.created_at)}
            {data.received_at && ` · received ${dateTime(data.received_at)}`}
          </p>
          {data.notes && <p className="mt-1 text-sm text-slate-400">{data.notes}</p>}
        </div>
        {data.status === 'draft' && (
          <button className="btn-primary" disabled={receiving} onClick={receive}>
            <IconCheck className="w-4 h-4" /> {receiving ? 'Receiving…' : 'Receive stock'}
          </button>
        )}
      </div>

      {data.status === 'draft' && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <IconTruck className="w-5 h-5 shrink-0" />
          This order is awaiting delivery. Receiving it will append a PURCHASE_RECEIPT movement for each line —
          stock increases only when the ledger is written.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Product</th>
                <th className="th text-right">Quantity</th>
                <th className="th text-right">Unit cost</th>
                <th className="th text-right">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.lines.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link to={`/products/${l.product_id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {l.product_name}
                    </Link>
                    <div className="text-xs text-slate-400">{l.sku}</div>
                  </td>
                  <td className="td text-right tabular-nums">{number(l.quantity)} {l.unit_of_measure}</td>
                  <td className="td text-right tabular-nums">{currency(l.unit_cost)}</td>
                  <td className="td text-right tabular-nums font-medium">{currency(l.quantity * l.unit_cost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold text-slate-800">
                <td className="td">Total</td>
                <td className="td text-right tabular-nums">{number(totalUnits)} units</td>
                <td className="td"></td>
                <td className="td text-right tabular-nums">{currency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
