import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { api, ProductRow } from '../lib/api';
import { Loading, ErrorState, PageHeader, Badge, Modal, EmptyState } from '../components/ui';
import { IconPlus, IconSearch, IconBox } from '../components/icons';
import { useToast } from '../components/toast';
import { currency, number } from '../lib/format';

type SortKey = 'name' | 'category' | 'qty_on_hand' | 'stock_value' | 'selling_price';

export function Products() {
  const { data, loading, error, refetch } = useApi<ProductRow[]>('/products');
  const { data: categories } = useApi<string[]>('/categories');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'archived' | 'low'>('active');
  const [sort, setSort] = useState<SortKey>('name');
  const [asc, setAsc] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const rows = useMemo(() => {
    let r = data ?? [];
    if (q.trim()) {
      const t = q.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t));
    }
    if (cat) r = r.filter((p) => p.category === cat);
    if (status === 'active') r = r.filter((p) => p.status === 'active');
    else if (status === 'archived') r = r.filter((p) => p.status === 'archived');
    else if (status === 'low') r = r.filter((p) => p.low_stock);
    r = [...r].sort((a, b) => {
      const av = a[sort], bv = b[sort];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return asc ? cmp : -cmp;
    });
    return r;
  }, [data, q, cat, status, sort, asc]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setAsc(!asc);
    else { setSort(key); setAsc(true); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={`th cursor-pointer select-none ${right ? 'text-right' : ''}`} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sort === k && <span className="text-slate-400">{asc ? '▲' : '▼'}</span>}
      </span>
    </th>
  );

  return (
    <div>
      <PageHeader title="Products" subtitle={`${number(data?.length ?? 0)} SKUs · stock derived from the ledger`}
        actions={
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <IconPlus className="w-4 h-4" /> New product
          </button>
        } />

      <div className="card mb-4 p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name or SKU…"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories?.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="active">Active</option>
          <option value="low">Low stock</option>
          <option value="archived">Archived</option>
          <option value="all">All statuses</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th k="name">Product</Th>
                <Th k="category">Category</Th>
                <Th k="qty_on_hand" right>On hand</Th>
                <th className="th text-right">Avg cost</th>
                <Th k="selling_price" right>Price</Th>
                <Th k="stock_value" right>Stock value</Th>
                <th className="th text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <ProductRowItem key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <EmptyState icon={<IconBox className="w-10 h-10" />} title="No products match your filters"
            hint="Try clearing the search or category filter." />
        )}
      </div>

      <NewProductModal open={showNew} onClose={() => setShowNew(false)}
        categories={categories ?? []} onCreated={() => { setShowNew(false); refetch(); }} />
    </div>
  );
}

function ProductRowItem({ p }: { p: ProductRow }) {
  const navigate = useNavigate();
  return (
    <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/products/${p.id}`)}>
      <td className="td">
        <div className="font-medium text-slate-800">{p.name}</div>
        <div className="text-xs text-slate-400">{p.sku} · {p.unit_of_measure}</div>
      </td>
      <td className="td text-slate-500">{p.category}</td>
      <td className="td text-right tabular-nums font-medium">
        <span className={p.low_stock ? 'text-amber-600' : 'text-slate-800'}>{number(p.qty_on_hand)}</span>
      </td>
      <td className="td text-right tabular-nums text-slate-500">{currency(p.avg_cost)}</td>
      <td className="td text-right tabular-nums">{currency(p.selling_price)}</td>
      <td className="td text-right tabular-nums font-medium">{currency(p.stock_value)}</td>
      <td className="td text-right">
        {p.status === 'archived'
          ? <Badge tone="slate">Archived</Badge>
          : p.low_stock
            ? <Badge tone={p.qty_on_hand <= 0 ? 'red' : 'amber'}>Low</Badge>
            : <Badge tone="green">In stock</Badge>}
      </td>
    </tr>
  );
}

function NewProductModal({ open, onClose, onCreated, categories }: {
  open: boolean; onClose: () => void; onCreated: () => void; categories: string[];
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '', sku: '', category: '', unit_of_measure: 'unit',
    cost_price: '', selling_price: '', reorder_point: '', reorder_qty: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/products', {
        ...form,
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        reorder_point: Number(form.reorder_point) || 0,
        reorder_qty: Number(form.reorder_qty) || 0,
      });
      toast('Product created');
      setForm({ name: '', sku: '', category: '', unit_of_measure: 'unit',
        cost_price: '', selling_price: '', reorder_point: '', reorder_qty: '' });
      onCreated();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New product" wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Product name</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Marigold Whole Milk 1L" />
        </div>
        <div>
          <label className="label">SKU code</label>
          <input className="input" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. DAI-2001" />
        </div>
        <div>
          <label className="label">Category</label>
          <input className="input" list="cat-list" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Dairy & Eggs" />
          <datalist id="cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
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
      </div>
      <p className="mt-4 text-xs text-slate-400">
        New products start at zero on-hand. Add stock by receiving a purchase order or recording an adjustment —
        quantity is always derived from movements.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving || !form.name || !form.sku || !form.category} onClick={submit}>
          {saving ? 'Saving…' : 'Create product'}
        </button>
      </div>
    </Modal>
  );
}
