import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useSuppliers, useUpsertSupplier, useDeleteSupplier } from '@/hooks/useSuppliers';
import type { Supplier } from '@/services/suppliersService';

interface SupplierForm {
  name: string;
  contact: string;
  phone: string;
  lead_days: string;
  email: string;
  website: string;
  notes: string;
}

export default function SuppliersPage() {
  const { show } = useToast();
  const { data: suppliers, isLoading } = useSuppliers();
  const upsert = useUpsertSupplier();
  const remove = useDeleteSupplier();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierForm>();

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    if (!searchQuery) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.contact_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q),
    );
  }, [suppliers, searchQuery]);

  const openAdd = () => {
    setEditingId(null);
    reset({ name: '', contact: '', phone: '', lead_days: '', email: '', website: '', notes: '' });
    setPanelOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    reset({
      name: s.name,
      contact: s.contact_name || '',
      phone: s.phone || '',
      lead_days: s.lead_time_days != null ? String(s.lead_time_days) : '',
      email: s.email || '',
      website: s.website || '',
      notes: s.notes || '',
    });
    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setEditingId(null); };

  const onSubmit = async (data: SupplierForm) => {
    try {
      await upsert.mutateAsync({
        id: editingId,
        input: {
          name: data.name,
          contact: data.contact || null,
          phone: data.phone || null,
          lead_days: data.lead_days ? parseInt(data.lead_days, 10) : null,
          email: data.email || null,
          website: data.website || null,
          notes: data.notes || null,
        },
      });
      show(editingId ? 'Supplier updated.' : `${data.name} added.`);
      closePanel();
    } catch (err: any) {
      show('Save failed: ' + err.message);
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    const s = suppliers?.find((x) => x.id === editingId);
    if (!s) return;
    setConfirmTarget({ id: s.id, name: s.name });
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    try {
      await remove.mutateAsync(confirmTarget.id);
      show(`${confirmTarget.name} deactivated.`);
      closePanel();
    } catch (err: any) {
      show('Failed: ' + err.message);
    }
    setConfirmOpen(false);
  };

  const columns: Column<Supplier>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (s) => <strong>{s.name}</strong> },
    { key: 'contact_name', header: 'Contact', sortable: true, render: (s) => s.contact_name || '—' },
    { key: 'email', header: 'Email', sortable: true, render: (s) => s.email || '—' },
    { key: 'phone', header: 'Phone', render: (s) => s.phone || '—' },
    {
      key: 'lead_time_days', header: 'Lead Days', sortable: true, align: 'right',
      render: (s) => s.lead_time_days != null ? `${s.lead_time_days}d` : '—',
    },
    {
      key: 'actions', header: '', sortable: false,
      render: (s) => (
        <div className="td-actions">
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(s); }}>Edit</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="PANDORA'S BOX · VENDOR MANAGEMENT"
        actions={<button className="btn btn-primary" onClick={openAdd}>+ Add Supplier</button>}
      />

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="page-search-wrap">
          <span className="page-search-icon">⌕</span>
          <input type="text" placeholder="Search suppliers…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="filter-spacer" />
        <div className="filter-count">{filtered.length} supplier{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        emptyMessage="No suppliers found."
        rowKey={(s) => s.id}
        onRowClick={openEdit}
      />

      {/* Side panel */}
      {panelOpen && (
        <div className="side-panel open">
          <div className="side-panel-header">
            <div className="side-panel-title">{editingId ? 'Edit Supplier' : 'Add Supplier'}</div>
            <div className="side-panel-close" onClick={closePanel}>×</div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="side-panel-body">
              <div className="form-group">
                <label className="modal-label">Supplier Name <span className="required">*</span></label>
                <input className={`form-control${errors.name ? ' error' : ''}`} type="text" placeholder="e.g. VPR Brands"
                  {...register('name', { required: true })} />
                {errors.name && <div className="form-error visible">Name is required.</div>}
              </div>
              <div className="form-group">
                <label className="modal-label">Contact Name</label>
                <input className="form-control" type="text" placeholder="Sales rep name" {...register('contact')} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="modal-label">Phone</label>
                  <input className="form-control" type="tel" placeholder="(509) 555-0100" {...register('phone')} />
                </div>
                <div className="form-group">
                  <label className="modal-label">Lead Days</label>
                  <input className="form-control" type="number" placeholder="7" min={0} max={365} {...register('lead_days')} />
                  <div className="form-hint">Avg days from order to receipt</div>
                </div>
              </div>
              <div className="form-group">
                <label className="modal-label">Email</label>
                <input className="form-control" type="email" placeholder="orders@supplier.com" {...register('email')} />
              </div>
              <div className="form-group">
                <label className="modal-label">Website</label>
                <input className="form-control" type="url" placeholder="https://supplier.com" {...register('website')} />
              </div>
              <div className="form-group">
                <label className="modal-label">Notes</label>
                <textarea className="form-control" placeholder="Min order amounts, payment terms, special instructions…" rows={3} {...register('notes')} />
              </div>

              {editingId && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <button type="button" className="btn btn-danger btn-full btn-sm" onClick={handleDelete}>
                    Deactivate Supplier
                  </button>
                  <div className="form-hint" style={{ marginTop: 6 }}>
                    Removes from active list. Products linked to this supplier are unaffected.
                  </div>
                </div>
              )}
            </div>
            <div className="side-panel-footer">
              <button type="submit" className="btn btn-primary btn-full" disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : editingId ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Deactivate ${confirmTarget?.name}?`}
        message="This supplier will be removed from your active list. Products linked to them will not be affected."
        confirmLabel="Deactivate"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
