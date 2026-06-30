export const currency = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const number = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

export const compactCurrency = (n: number | null | undefined) => {
  const v = n ?? 0;
  if (Math.abs(v) >= 1000)
    return '$' + (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k';
  return currency(v);
};

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

export const dateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return dateShort(iso);
};
