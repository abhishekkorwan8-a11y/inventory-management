import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  IconDashboard, IconBox, IconTruck, IconCart, IconUsers, IconAlert, IconStore,
} from './icons';
import { getActingUser, setActingUser, MeInfo } from '../lib/api';
import { useApi } from '../lib/useApi';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/products', label: 'Products', icon: IconBox },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: IconTruck },
  { to: '/sales', label: 'Sales', icon: IconCart },
  { to: '/low-stock', label: 'Low Stock', icon: IconAlert },
  { to: '/suppliers', label: 'Suppliers', icon: IconUsers },
];

export function Layout({ children }: { children: ReactNode }) {
  const { data: me, refetch } = useApi<MeInfo>('/me');

  const onUserChange = (id: string) => {
    setActingUser(id);
    refetch();
  };
  const current = getActingUser() || me?.current_user_id || '';

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside className="lg:fixed lg:inset-y-0 lg:w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <div className="rounded-lg bg-brand-500 p-1.5 text-white">
            <IconStore className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <p className="text-white font-semibold text-sm">Cornerstone</p>
            <p className="text-[11px] text-slate-400">Inventory Control</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                 ${isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
              }>
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 text-[11px] text-slate-500">
          Ledger-based stock control
          <div className="text-slate-600">Movements: append-only</div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur px-5">
          <div className="text-sm text-slate-500">
            {me?.tenant?.name ?? 'Loading…'}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 hidden sm:block">Acting as</label>
            <select value={current} onChange={(e) => onUserChange(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700
                focus:outline-none focus:ring-2 focus:ring-brand-100">
              {me?.users?.map((u) => (
                <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
              ))}
            </select>
          </div>
        </header>
        <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
