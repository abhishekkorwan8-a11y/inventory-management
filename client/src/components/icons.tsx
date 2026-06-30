// Minimal inline icon set (stroke-based, inherits currentColor).
type P = { className?: string };
const base = (d: React.ReactNode, vb = '0 0 24 24') => ({ className }: P) => (
  <svg viewBox={vb} fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-5 h-5'}>
    {d}
  </svg>
);

export const IconDashboard = base(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>);
export const IconBox = base(<><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>);
export const IconTruck = base(<><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>);
export const IconCart = base(<><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.4 12.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 7H6" /></>);
export const IconUsers = base(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 4.5a3.2 3.2 0 0 1 0 7" /><path d="M18 14.6c2 .7 3 2.5 3 5.4" /></>);
export const IconAlert = base(<><path d="M12 4 2 20h20z" /><path d="M12 10v4" /><path d="M12 17h.01" /></>);
export const IconHistory = base(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" /></>);
export const IconPlus = base(<><path d="M12 5v14M5 12h14" /></>);
export const IconSearch = base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>);
export const IconArrowDown = base(<><path d="M12 5v14M19 12l-7 7-7-7" /></>);
export const IconArrowUp = base(<><path d="M12 19V5M5 12l7-7 7 7" /></>);
export const IconCheck = base(<><path d="M20 6 9 17l-5-5" /></>);
export const IconX = base(<><path d="M18 6 6 18M6 6l12 12" /></>);
export const IconChevronRight = base(<><path d="m9 6 6 6-6 6" /></>);
export const IconStore = base(<><path d="M3 9 4.5 4h15L21 9" /><path d="M3 9v11h18V9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M9 20v-6h6v6" /></>);
export const IconDollar = base(<><path d="M12 2v20M17 6.5C17 4.6 14.8 4 12 4S7 4.6 7 7s2.5 3 5 3.5 5 1.2 5 3.5-2.2 3-5 3-5-.6-5-2.5" /></>);
export const IconLayers = base(<><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 13 9 5 9-5" /></>);
