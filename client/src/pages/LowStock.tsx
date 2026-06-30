import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { ProductRow } from '../lib/api';
import { Loading, ErrorState, PageHeader, Badge, EmptyState } from '../components/ui';
import { IconAlert, IconCheck } from '../components/icons';
import { currency, number } from '../lib/format';

export function LowStock() {
  const { data, loading, error } = useApi<ProductRow[]>('/products/low-stock');

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  const items = data ?? [];
  const reorderValue = items.reduce((s, p) => s + p.reorder_qty * p.avg_cost, 0);

  return (
    <div>
      <PageHeader title="Low Stock"
        subtitle="Every active product at or below its reorder point — derived live from the ledger." />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon={<IconCheck className="w-10 h-10 text-emerald-400" />} title="Everything is well stocked"
            hint="No active products are at or below their reorder point right now." />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="card px-5 py-3 flex items-center gap-3">
              <IconAlert className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs text-slate-400">Items needing reorder</p>
                <p className="text-lg font-semibold text-slate-900">{number(items.length)}</p>
              </div>
            </div>
            <div className="card px-5 py-3 flex items-center gap-3">
              <div>
                <p className="text-xs text-slate-400">Est. reorder cost (suggested qtys)</p>
                <p className="text-lg font-semibold text-slate-900">{currency(reorderValue)}</p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Product</th>
                    <th className="th">Category</th>
                    <th className="th text-right">On hand</th>
                    <th className="th text-right">Reorder point</th>
                    <th className="th text-right">Suggested order</th>
                    <th className="th text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="td">
                        <Link to={`/products/${p.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                          {p.name}
                        </Link>
                        <div className="text-xs text-slate-400">{p.sku}</div>
                      </td>
                      <td className="td text-slate-500">{p.category}</td>
                      <td className="td text-right tabular-nums font-medium text-amber-600">{number(p.qty_on_hand)}</td>
                      <td className="td text-right tabular-nums text-slate-500">{number(p.reorder_point)}</td>
                      <td className="td text-right tabular-nums">{number(p.reorder_qty)} {p.unit_of_measure}</td>
                      <td className="td text-right">
                        {p.qty_on_hand <= 0
                          ? <Badge tone="red">Out of stock</Badge>
                          : <Badge tone="amber">Low</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
