import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useApi } from '../lib/useApi';
import { DashboardSummary, Movement, ProductRow } from '../lib/api';
import { Loading, ErrorState, StatCard, PageHeader, Badge, EmptyState } from '../components/ui';
import { MovementTypeBadge, QtyDelta } from '../components/MovementBadge';
import {
  IconLayers, IconDollar, IconAlert, IconBox, IconChevronRight, IconHistory,
} from '../components/icons';
import { currency, compactCurrency, number, relativeTime } from '../lib/format';

interface SeriesPoint { date: string; value: number; }
interface CatPoint { category: string; value: number; }

export function Dashboard() {
  const summary = useApi<DashboardSummary>('/dashboard');
  const series = useApi<SeriesPoint[]>('/dashboard/stock-value-series?days=90');
  const recent = useApi<Movement[]>('/dashboard/recent-movements?limit=12');
  const low = useApi<ProductRow[]>('/products/low-stock');
  const cats = useApi<CatPoint[]>('/dashboard/category-breakdown');

  if (summary.loading) return <Loading />;
  if (summary.error || !summary.data) return <ErrorState message={summary.error ?? 'Failed to load'} />;
  const s = summary.data;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live inventory position, derived from the stock movement ledger." />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active SKUs" value={number(s.total_skus)} icon={<IconLayers className="w-5 h-5" />}
          tone="blue" sub={`${number(s.units_on_hand)} units on hand`} />
        <StatCard label="Inventory value" value={currency(s.total_value)} icon={<IconDollar className="w-5 h-5" />}
          tone="green" sub="weighted-average cost" />
        <StatCard label="Low-stock items" value={number(s.low_stock_count)} icon={<IconAlert className="w-5 h-5" />}
          tone="amber" sub="at or below reorder point" />
        <StatCard label="Sales (30 days)" value={currency(s.revenue_30d)} icon={<IconBox className="w-5 h-5" />}
          tone="violet" sub={`${number(s.sales_30d)} transactions`} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Value over time */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Inventory value over time</h3>
              <p className="text-xs text-slate-400">Last 90 days · derived nightly close</p>
            </div>
            <Badge tone="green">{currency(s.total_value)} now</Badge>
          </div>
          <div className="h-64">
            {series.data && series.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series.data} margin={{ left: 4, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3366ff" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#3366ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false}
                    axisLine={false} minTickGap={48}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    width={52} tickFormatter={(v) => compactCurrency(v)} />
                  <Tooltip formatter={(v: number) => [currency(v), 'Inventory value']}
                    labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  <Area type="monotone" dataKey="value" stroke="#3366ff" strokeWidth={2}
                    fill="url(#valueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Loading label="Building chart…" />}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Value by category</h3>
          {cats.data && cats.data.length > 0 ? (
            <ul className="space-y-3">
              {cats.data.slice(0, 8).map((c) => {
                const max = cats.data![0].value || 1;
                return (
                  <li key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{c.category}</span>
                      <span className="font-medium text-slate-700 tabular-nums">{currency(c.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.max(3, (c.value / max) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <Loading />}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent movements */}
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <IconHistory className="w-4 h-4 text-slate-400" /> Recent movements
            </h3>
            <span className="text-xs text-slate-400">append-only ledger</span>
          </div>
          {recent.data && recent.data.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recent.data.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <MovementTypeBadge type={m.movement_type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{m.product_name}</p>
                    <p className="text-xs text-slate-400">
                      {m.reference_doc} · {m.user_name ?? 'system'} · {relativeTime(m.occurred_at)}
                    </p>
                  </div>
                  <QtyDelta direction={m.direction} quantity={m.quantity} uom={m.unit_of_measure} />
                </div>
              ))}
            </div>
          ) : <EmptyState title="No movements yet" />}
        </div>

        {/* Low stock panel */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <IconAlert className="w-4 h-4 text-amber-500" /> Needs reordering
            </h3>
            <Link to="/low-stock" className="text-xs text-brand-600 hover:underline flex items-center">
              View all <IconChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {low.data && low.data.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {low.data.slice(0, 7).map((p) => (
                <Link key={p.id} to={`/products/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.sku} · reorder at {p.reorder_point}</p>
                  </div>
                  <Badge tone={p.qty_on_hand <= 0 ? 'red' : 'amber'}>
                    {number(p.qty_on_hand)} left
                  </Badge>
                </Link>
              ))}
            </div>
          ) : <EmptyState title="All stocked up" hint="No products below their reorder point." />}
        </div>
      </div>
    </div>
  );
}
