import { useState } from 'react';
import { useApi } from '../lib/useApi';
import { api, Supplier } from '../lib/api';
import { Loading, ErrorState, PageHeader, Modal, EmptyState, Badge } from '../components/ui';
import { IconPlus, IconUsers } from '../components/icons';
import { useToast } from '../components/toast';
import { number } from '../lib/format';

export function Suppliers() {
  const { data, loading, error, refetch } = useApi<Supplier[]>('/suppliers');
  const [showNew, setShowNew] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Suppliers" subtitle={`${number(data?.length ?? 0)} suppliers`}
        actions={
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <IconPlus className="w-4 h-4" /> New supplier
          </button>
        } />

      {(data ?? []).length === 0 ? (
        <div className="card">
          <EmptyState icon={<IconUsers className="w-10 h-10" />} title="No suppliers yet"
            hint="Add suppliers to raise purchase orders against them." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data!.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900">{s.name}</h3>
                <Badge tone="blue">{number(s.po_count ?? 0)} POs</Badge>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-400">Contact</dt>
                  <dd className="text-slate-600">{s.contact || '—'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-400">Address</dt>
                  <dd className="text-slate-600">{s.address || '—'}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}

      <NewSupplierModal open={showNew} onClose={() => setShowNew(false)}
        onCreated={() => { setShowNew(false); refetch(); }} />
    </div>
  );
}

function NewSupplierModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', contact: '', address: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/suppliers', form);
      toast('Supplier added');
      setForm({ name: '', contact: '', address: '' });
      onCreated();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New supplier">
      <div className="space-y-4">
        <div>
          <label className="label">Supplier name</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Greenfield Wholesale Co." />
        </div>
        <div>
          <label className="label">Contact (email or phone)</label>
          <input className="input" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving || !form.name.trim()} onClick={submit}>
          {saving ? 'Saving…' : 'Add supplier'}
        </button>
      </div>
    </Modal>
  );
}
