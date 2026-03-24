import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  useAppSettings,
  useSaveInventorySettings,
  useSavePricingSettings,
  useSaveNotificationSettings,
  useSaveAccount,
  useSettingsUsers,
  useSaveUser,
  useDeactivateUser,
  useReactivateUser,
  useSettingsLocations,
  useSaveLocation,
  useAddLocation,
  useDeleteLocation,
  useCategories,
  useSaveCategory,
  useDeleteCategory,
  useBrands,
  useSaveBrand,
  useDeleteBrand,
} from '@/hooks/useSettings';
import type { LocationRow, CategoryRow, BrandRow } from '@/services/settingsService';

type Section = 'users' | 'stores' | 'inventory' | 'pricing' | 'categories' | 'brands' | 'notifications' | 'account';

const NAV_ITEMS: { section: Section; label: string; minRole?: string }[] = [
  { section: 'users', label: 'Users & Access', minRole: 'owner' },
  { section: 'stores', label: 'Store Setup', minRole: 'owner' },
  { section: 'inventory', label: 'Inventory Defaults', minRole: 'owner' },
  { section: 'pricing', label: 'Pricing & Tax', minRole: 'owner' },
  { section: 'categories', label: 'Categories', minRole: 'manager' },
  { section: 'brands', label: 'Brands', minRole: 'manager' },
  { section: 'notifications', label: 'Notifications', minRole: 'manager' },
  { section: 'account', label: 'My Account' },
];

const ROLE_ORDER: Record<string, number> = { owner: 3, manager: 2, employee: 1 };

function getTopRole(locations: { role: string }[]): string {
  const roles = locations.map((l) => l.role);
  if (roles.includes('owner')) return 'owner';
  if (roles.includes('manager')) return 'manager';
  return 'employee';
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ── Section: Users & Access ── */

function UsersSection({ profileId, isOwner }: { profileId: string; isOwner: boolean }) {
  const { show } = useToast();
  const { data, isLoading } = useSettingsUsers();
  const { data: allLocations } = useSettingsLocations();
  const saveUser = useSaveUser();
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [uuid, setUuid] = useState('');
  const [locRoles, setLocRoles] = useState<Record<string, string>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  const locationMap = useMemo(() => {
    const m: Record<string, { role: string; location: string }[]> = {};
    (data?.userLocations ?? []).forEach((r) => {
      if (!m[r.user_id]) m[r.user_id] = [];
      m[r.user_id].push({ role: r.role, location: r.locations?.name ?? '—' });
    });
    return m;
  }, [data]);

  const openAdd = () => {
    setEditId(null);
    setFullName(''); setDisplayName(''); setEmail(''); setUuid('');
    setLocRoles({});
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    const { data: detail } = await supabase.from('profiles').select('*').eq('id', id).single();
    const { data: locs } = await supabase.from('user_locations').select('location_id, role').eq('user_id', id);
    setEditId(id);
    setFullName(detail?.full_name || '');
    setDisplayName(detail?.display_name || '');
    setEmail('(already set)');
    setUuid(id);
    const lr: Record<string, string> = {};
    (locs ?? []).forEach((l: { location_id: string; role: string }) => { lr[l.location_id] = l.role; });
    setLocRoles(lr);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!fullName.trim() || !uuid.trim()) { show('Full name and UUID are required.'); return; }
    const locationRoles = (allLocations ?? []).map((loc) => ({
      locationId: loc.id, role: locRoles[loc.id] || '',
    }));
    try {
      await saveUser.mutateAsync({ uuid: uuid.trim(), fullName: fullName.trim(), displayName: displayName.trim() || null, locationRoles });
      setModalOpen(false);
      show(`${fullName.trim()} saved.`);
    } catch (err: any) { show('Failed: ' + err.message); }
  };

  const handleDeactivate = (id: string, name: string) => {
    setConfirmTarget({ id, name });
    setConfirmOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!confirmTarget) return;
    try {
      await deactivate.mutateAsync(confirmTarget.id);
      show(`${confirmTarget.name} deactivated.`);
    } catch (err: any) { show('Failed: ' + err.message); }
    setConfirmOpen(false);
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivate.mutateAsync(id);
      show('User reactivated.');
    } catch (err: any) { show('Failed: ' + err.message); }
  };

  if (isLoading) return <Spinner />;

  return (
    <>
      <div className="settings-panel">
        <div className="settings-panel-header">
          <div>
            <div className="settings-panel-title">Users & Access</div>
            <div className="settings-panel-sub">Manage who can access the system and what they can do</div>
          </div>
          {isOwner && <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add User</button>}
        </div>
        <div className="settings-panel-body">
          {!(data?.users ?? []).length ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No users yet.</div>
          ) : (
            (data?.users ?? []).map((u) => {
              const isSelf = u.id === profileId;
              const chips = (locationMap[u.id] ?? []);
              return (
                <div className="user-card" key={u.id}>
                  <div className="user-card-avatar">{initials(u.display_name || u.full_name)}</div>
                  <div className="user-card-info">
                    <div className="user-card-name">
                      {u.full_name}
                      {u.display_name && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({u.display_name})</span>}
                    </div>
                    <div className="user-card-roles">
                      {chips.map((c, i) => (
                        <span key={i} className={`role-chip ${c.role}`}>{c.location} — {c.role}</span>
                      ))}
                      {!u.is_active && <span className="role-chip inactive">Inactive</span>}
                    </div>
                  </div>
                  {isOwner && (
                    <div className="user-card-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u.id)}>Edit</button>
                      {!isSelf ? (
                        u.is_active
                          ? <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} onClick={() => handleDeactivate(u.id, u.full_name)}>Deactivate</button>
                          : <button className="btn btn-ghost btn-sm" style={{ color: 'var(--sage)' }} onClick={() => handleReactivate(u.id)}>Reactivate</button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(you)</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Role guide */}
      <div className="settings-panel">
        <div className="settings-panel-header">
          <div className="settings-panel-title">Role Permissions</div>
        </div>
        <div className="settings-panel-body">
          {(['owner', 'manager', 'employee'] as const).map((role) => (
            <div className="setting-row" key={role}>
              <div className="setting-info">
                <div className="setting-label"><span className={`role-chip ${role}`}>{role.charAt(0).toUpperCase() + role.slice(1)}</span></div>
                <div className="setting-desc" style={{ marginTop: 4 }}>
                  {role === 'owner' && 'Full access to all locations, settings, user management, and financial data. Can add/remove users and change roles.'}
                  {role === 'manager' && 'Full inventory access at assigned locations. Can approve nightly submissions, adjust stock, create POs, and view reports. Cannot manage users or system settings.'}
                  {role === 'employee' && 'Can view inventory and submit nightly totals at their assigned location. Cannot adjust stock, approve submissions, or access reports.'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit User' : 'Add User'} size="md">
        <div className="form-group">
          <label className="modal-label">Full Name <span style={{ color: 'var(--crimson)' }}>*</span></label>
          <input className="form-control" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Employee full name" />
        </div>
        <div className="form-group">
          <label className="modal-label">Display Name</label>
          <input className="form-control" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Jordan M." />
        </div>
        <div className="form-group">
          <label className="modal-label">Email Address <span style={{ color: 'var(--crimson)' }}>*</span></label>
          <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@email.com" disabled={!!editId} />
          <div className="form-hint">A Supabase account must be created manually for this user in the Supabase dashboard, then their UUID entered below.</div>
        </div>
        <div className="form-group">
          <label className="modal-label">Supabase User UUID <span style={{ color: 'var(--crimson)' }}>*</span></label>
          <input className="form-control" type="text" value={uuid} onChange={(e) => setUuid(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.82rem' }}
            disabled={!!editId}
          />
          <div className="form-hint">Found in Supabase Dashboard → Authentication → Users → click the user.</div>
        </div>
        <div style={{ marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>
          ASSIGN TO LOCATIONS
        </div>
        {(allLocations ?? []).map((loc) => (
          <div key={loc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{loc.name}</span>
            <select className="setting-select" style={{ width: 140 }} value={locRoles[loc.id] || ''}
              onChange={(e) => setLocRoles((prev) => ({ ...prev, [loc.id]: e.target.value }))}>
              <option value="">No access</option>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saveUser.isPending}>
            {saveUser.isPending ? 'Saving…' : 'Save User'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title={`Deactivate ${confirmTarget?.name}?`}
        message="They will lose access. Records are preserved."
        confirmLabel="Deactivate"
        danger
        onConfirm={confirmDeactivate}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

/* ── Section: Stores ── */

function StoresSection() {
  const { show } = useToast();
  const { data: locations, isLoading } = useSettingsLocations();
  const saveLoc = useSaveLocation();
  const addLoc = useAddLocation();
  const delLoc = useDeleteLocation();

  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [showNew, setShowNew] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: '', phone: '', address: '', city: '', state: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<{ id: string; name: string } | null>(null);

  const getVal = (loc: LocationRow, field: string) => edits[loc.id]?.[field] ?? (loc as any)[field] ?? '';

  const setField = (id: string, field: string, val: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const handleSave = async (loc: LocationRow) => {
    const fields = {
      name: getVal(loc, 'name'), city: getVal(loc, 'city'), state: getVal(loc, 'state'),
      address: getVal(loc, 'address') || null, phone: getVal(loc, 'phone') || null,
    };
    try {
      await saveLoc.mutateAsync({ id: loc.id, fields });
      show(`${fields.name || 'Location'} updated.`);
      setEdits((prev) => { const next = { ...prev }; delete next[loc.id]; return next; });
    } catch (err: any) { show('Save failed: ' + err.message); }
  };

  const handleAdd = async () => {
    if (!newLoc.name.trim()) { show('Location name is required.'); return; }
    try {
      await addLoc.mutateAsync(newLoc);
      show(`${newLoc.name} added.`);
      setNewLoc({ name: '', phone: '', address: '', city: '', state: '' });
      setShowNew(false);
    } catch (err: any) { show('Failed: ' + err.message); }
  };

  const handleDelete = (id: string, name: string) => { setDelTarget({ id, name }); setConfirmOpen(true); };

  const confirmDelete = async () => {
    if (!delTarget) return;
    try { await delLoc.mutateAsync(delTarget.id); show(`${delTarget.name} removed.`); } catch (err: any) { show('Failed: ' + err.message); }
    setConfirmOpen(false);
  };

  if (isLoading) return <Spinner />;

  return (
    <>
      <div className="settings-panel">
        <div className="settings-panel-header">
          <div className="settings-panel-title">Store Locations</div>
          <div className="settings-panel-sub">Add, edit, or remove store locations</div>
        </div>
        <div className="settings-panel-body">
          {(locations ?? []).map((loc) => (
            <div className="location-card" key={loc.id}>
              <div className="location-card-header">
                <div className="location-card-name">{loc.name}</div>
                <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  {loc.state || '—'}
                </span>
              </div>
              <div className="location-card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label-sm">Location Name</label>
                    <input className="form-control" value={getVal(loc, 'name')} onChange={(e) => setField(loc.id, 'name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label-sm">Phone</label>
                    <input className="form-control" type="tel" value={getVal(loc, 'phone')} onChange={(e) => setField(loc.id, 'phone', e.target.value)} placeholder="(509) 555-0100" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label-sm">Address</label>
                  <input className="form-control" value={getVal(loc, 'address')} onChange={(e) => setField(loc.id, 'address', e.target.value)} placeholder="Street address" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label-sm">City</label>
                    <input className="form-control" value={getVal(loc, 'city')} onChange={(e) => setField(loc.id, 'city', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label-sm">State</label>
                    <input className="form-control" value={getVal(loc, 'state')} onChange={(e) => setField(loc.id, 'state', e.target.value)} maxLength={2} style={{ textTransform: 'uppercase' }} />
                  </div>
                </div>
                <div className="location-card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => handleSave(loc)}>Save Changes</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)', borderColor: 'var(--crimson)', marginLeft: 'auto' }}
                    onClick={() => handleDelete(loc.id, loc.name)}>Delete Location</button>
                </div>
              </div>
            </div>
          ))}

          {showNew && (
            <div className="location-card" style={{ border: '1px solid var(--gold)' }}>
              <div className="location-card-header">
                <div className="location-card-name" style={{ color: 'var(--text)' }}>New Location</div>
              </div>
              <div className="location-card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label-sm">Location Name *</label>
                    <input className="form-control" value={newLoc.name} onChange={(e) => setNewLoc((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Tri-Cities WA" />
                  </div>
                  <div className="form-group">
                    <label className="form-label-sm">Phone</label>
                    <input className="form-control" type="tel" value={newLoc.phone} onChange={(e) => setNewLoc((p) => ({ ...p, phone: e.target.value }))} placeholder="(509) 555-0100" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label-sm">Address</label>
                  <input className="form-control" value={newLoc.address} onChange={(e) => setNewLoc((p) => ({ ...p, address: e.target.value }))} placeholder="Street address" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label-sm">City</label>
                    <input className="form-control" value={newLoc.city} onChange={(e) => setNewLoc((p) => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label-sm">State</label>
                    <input className="form-control" value={newLoc.state} onChange={(e) => setNewLoc((p) => ({ ...p, state: e.target.value }))} maxLength={2} style={{ textTransform: 'uppercase' }} />
                  </div>
                </div>
                <div className="location-card-actions">
                  <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add Location</button>
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowNew(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="add-location-wrap">
            <button className="btn btn-secondary" onClick={() => setShowNew(true)}>+ Add Location</button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${delTarget?.name}"?`}
        message="This will permanently remove this location. All associated inventory and records will be affected."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

/* ── Section: Inventory Defaults ── */

function InventorySection() {
  const { show } = useToast();
  const { data: settings } = useAppSettings();
  const save = useSaveInventorySettings();

  const [reorderPoint, setReorderPoint] = useState(5);
  const [reorderQty, setReorderQty] = useState(20);
  const [negativeInv, setNegativeInv] = useState(false);
  const [skuFormat, setSkuFormat] = useState('manual');

  useEffect(() => {
    if (!settings) return;
    setReorderPoint(settings.default_reorder_point);
    setReorderQty(settings.default_reorder_qty);
    setNegativeInv(settings.allow_negative_inventory);
    setSkuFormat(settings.sku_format);
  }, [settings]);

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        default_reorder_point: reorderPoint, default_reorder_qty: reorderQty,
        allow_negative_inventory: negativeInv, sku_format: skuFormat as 'manual' | 'auto',
      });
      show('Inventory settings saved.');
    } catch (err: any) { show('Save failed: ' + err.message); }
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <div className="settings-panel-title">Inventory Defaults</div>
      </div>
      <div className="settings-panel-body">
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Default Reorder Point</div>
            <div className="setting-desc">Low-stock alert fires when quantity drops to or below this number.</div>
          </div>
          <div className="setting-control">
            <input className="setting-input" type="number" min={0} value={reorderPoint} onChange={(e) => setReorderPoint(Number(e.target.value))} />
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Default Reorder Quantity</div>
            <div className="setting-desc">Suggested quantity to order when a product hits its reorder point.</div>
          </div>
          <div className="setting-control">
            <input className="setting-input" type="number" min={0} value={reorderQty} onChange={(e) => setReorderQty(Number(e.target.value))} />
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Allow Negative Inventory</div>
            <div className="setting-desc">If enabled, stock can go below zero.</div>
          </div>
          <div className="setting-control">
            <label className="setting-checkbox-label" onClick={() => setNegativeInv(!negativeInv)}>
              <input type="checkbox" className="setting-checkbox" checked={negativeInv} readOnly />
              <span className="setting-checkbox-box" />
            </label>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">SKU Format</div>
            <div className="setting-desc">Manual = you set category/product numbers. Auto = system generates sequentially.</div>
          </div>
          <div className="setting-control">
            <select className="setting-select" value={skuFormat} onChange={(e) => setSkuFormat(e.target.value)}>
              <option value="manual">Manual</option>
              <option value="auto">Auto-generate</option>
            </select>
          </div>
        </div>
        <div className="settings-save-bar">
          <button className="btn btn-primary" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Section: Pricing & Tax ── */

function PricingSection() {
  const { show } = useToast();
  const { data: settings } = useAppSettings();
  const save = useSavePricingSettings();

  const [taxWa, setTaxWa] = useState(8.6);
  const [taxOr, setTaxOr] = useState(0);
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [markup, setMarkup] = useState('');
  const [minMargin, setMinMargin] = useState('');

  useEffect(() => {
    if (!settings) return;
    setTaxWa(settings.tax_wa);
    setTaxOr(settings.tax_or);
    setTaxIncluded(settings.tax_included_in_price);
    setMarkup(settings.default_markup_pct != null ? String(settings.default_markup_pct) : '');
    setMinMargin(settings.min_margin_pct != null ? String(settings.min_margin_pct) : '');
  }, [settings]);

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        tax_wa: taxWa, tax_or: taxOr, tax_included_in_price: taxIncluded,
        default_markup_pct: markup ? parseFloat(markup) : null,
        min_margin_pct: minMargin ? parseFloat(minMargin) : null,
      });
      show('Pricing settings saved.');
    } catch (err: any) { show('Save failed: ' + err.message); }
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <div className="settings-panel-title">Pricing & Tax</div>
      </div>
      <div className="settings-panel-body">
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Washington Tax Rate (%)</div>
            <div className="setting-desc">Applied to Richland and Kennewick locations.</div>
          </div>
          <div className="setting-control">
            <input className="setting-input" type="number" min={0} max={30} step={0.1} value={taxWa} onChange={(e) => setTaxWa(Number(e.target.value))} />
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Oregon Tax Rate (%)</div>
            <div className="setting-desc">Applied to Pendleton location.</div>
          </div>
          <div className="setting-control">
            <input className="setting-input" type="number" min={0} max={30} step={0.1} value={taxOr} onChange={(e) => setTaxOr(Number(e.target.value))} />
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Tax Included in Price</div>
            <div className="setting-desc">If on, retail prices already include tax.</div>
          </div>
          <div className="setting-control">
            <label className="setting-checkbox-label" onClick={() => setTaxIncluded(!taxIncluded)}>
              <input type="checkbox" className="setting-checkbox" checked={taxIncluded} readOnly />
              <span className="setting-checkbox-box" />
            </label>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Default Markup %</div>
            <div className="setting-desc">Products without a retail price default to cost x (1 + markup).</div>
          </div>
          <div className="setting-control">
            <input className="setting-input" type="number" min={0} max={500} step={1} value={markup} onChange={(e) => setMarkup(e.target.value)} placeholder="—" />
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Minimum Margin %</div>
            <div className="setting-desc">Warn if a product's margin falls below this threshold.</div>
          </div>
          <div className="setting-control">
            <input className="setting-input" type="number" min={0} max={100} step={1} value={minMargin} onChange={(e) => setMinMargin(e.target.value)} placeholder="—" />
          </div>
        </div>
        <div className="settings-save-bar">
          <button className="btn btn-primary" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Section: Categories ── */

function CategoriesSection() {
  const { show } = useToast();
  const { data: categories, isLoading } = useCategories();
  const saveCat = useSaveCategory();
  const delCat = useDeleteCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [catNum, setCatNum] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<{ id: string; name: string } | null>(null);

  const openForm = (cat?: CategoryRow) => {
    setEditId(cat?.id ?? null);
    setCatNum(cat ? String(cat.category_number) : '');
    setCatName(cat?.name ?? '');
    setCatDesc(cat?.description ?? '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    const num = parseInt(catNum, 10);
    if (!num || !catName.trim()) { show('Category number and name are required.'); return; }
    try {
      await saveCat.mutateAsync({ id: editId, categoryNumber: num, name: catName.trim(), description: catDesc.trim() || null });
      setModalOpen(false);
      show(`${catName.trim()} saved.`);
    } catch (err: any) { show('Save failed: ' + err.message); }
  };

  const handleDelete = (id: string, name: string) => { setDelTarget({ id, name }); setConfirmOpen(true); };
  const confirmDelete = async () => {
    if (!delTarget) return;
    try { await delCat.mutateAsync(delTarget.id); show(`${delTarget.name} removed.`); } catch (err: any) { show('Failed: ' + err.message); }
    setConfirmOpen(false);
  };

  if (isLoading) return <Spinner />;

  return (
    <>
      <div className="settings-panel">
        <div className="settings-panel-header">
          <div className="settings-panel-title">Product Categories</div>
          <button className="btn btn-primary btn-sm" onClick={() => openForm()}>+ Add</button>
        </div>
        <div className="settings-panel-body">
          {!(categories ?? []).length ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No categories yet.</div>
          ) : (
            (categories ?? []).map((c) => (
              <div className="list-item" key={c.id}>
                <div className="list-item-num">{c.category_number}</div>
                <div>
                  <div className="list-item-name">{c.name}</div>
                  {c.description && <div className="list-item-sub">{c.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openForm(c)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} onClick={() => handleDelete(c.id, c.name)}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Category' : 'Add Category'} size="sm">
        <div className="form-row">
          <div className="form-group">
            <label className="modal-label">Category # <span style={{ color: 'var(--crimson)' }}>*</span></label>
            <input className="form-control" type="number" min={1} value={catNum} onChange={(e) => setCatNum(e.target.value)} placeholder="10" />
            <div className="form-hint">The SKU prefix (e.g. 10 → 10/172)</div>
          </div>
          <div className="form-group">
            <label className="modal-label">Name <span style={{ color: 'var(--crimson)' }}>*</span></label>
            <input className="form-control" type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Disposables" />
          </div>
        </div>
        <div className="form-group">
          <label className="modal-label">Description</label>
          <input className="form-control" type="text" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Optional description" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saveCat.isPending}>Save Category</button>
        </div>
      </Modal>

      <ConfirmDialog open={confirmOpen} title={`Remove "${delTarget?.name}"?`} message="Category will be hidden. Products unaffected."
        confirmLabel="Remove" danger onConfirm={confirmDelete} onCancel={() => setConfirmOpen(false)} />
    </>
  );
}

/* ── Section: Brands ── */

function BrandsSection() {
  const { show } = useToast();
  const { data: brands, isLoading } = useBrands();
  const saveBrand = useSaveBrand();
  const delBrand = useDeleteBrand();

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<{ id: string; name: string } | null>(null);

  const openForm = (b?: BrandRow) => {
    setEditId(b?.id ?? null);
    setBrandName(b?.name ?? '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!brandName.trim()) { show('Brand name is required.'); return; }
    try {
      await saveBrand.mutateAsync({ id: editId, name: brandName.trim() });
      setModalOpen(false);
      show(`${brandName.trim()} saved.`);
    } catch (err: any) { show('Save failed: ' + err.message); }
  };

  const handleDelete = (id: string, name: string) => { setDelTarget({ id, name }); setConfirmOpen(true); };
  const confirmDelete = async () => {
    if (!delTarget) return;
    try { await delBrand.mutateAsync(delTarget.id); show(`${delTarget.name} removed.`); } catch (err: any) { show('Failed: ' + err.message); }
    setConfirmOpen(false);
  };

  if (isLoading) return <Spinner />;

  return (
    <>
      <div className="settings-panel">
        <div className="settings-panel-header">
          <div>
            <div className="settings-panel-title">Brand List</div>
            <div className="settings-panel-sub">Standardised brand names for consistent product data</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => openForm()}>+ Add</button>
        </div>
        <div className="settings-panel-body">
          {!(brands ?? []).length ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No brands yet.</div>
          ) : (
            (brands ?? []).map((b) => (
              <div className="list-item" key={b.id}>
                <div className="list-item-name">{b.name}</div>
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openForm(b)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} onClick={() => handleDelete(b.id, b.name)}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Brand' : 'Add Brand'} size="sm">
        <div className="form-group">
          <label className="modal-label">Brand Name <span style={{ color: 'var(--crimson)' }}>*</span></label>
          <input className="form-control" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Elf Bar" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saveBrand.isPending}>Save Brand</button>
        </div>
      </Modal>

      <ConfirmDialog open={confirmOpen} title={`Remove "${delTarget?.name}"?`} message="Brand will be removed."
        confirmLabel="Remove" danger onConfirm={confirmDelete} onCancel={() => setConfirmOpen(false)} />
    </>
  );
}

/* ── Section: Notifications ── */

function NotificationsSection() {
  const { show } = useToast();
  const { data: settings } = useAppSettings();
  const save = useSaveNotificationSettings();

  const [notifyLow, setNotifyLow] = useState(true);
  const [notifyOos, setNotifyOos] = useState(true);
  const [notifyDaily, setNotifyDaily] = useState(true);

  useEffect(() => {
    if (!settings) return;
    setNotifyLow(settings.notify_low_stock);
    setNotifyOos(settings.notify_out_of_stock);
    setNotifyDaily(settings.notify_daily_summary);
  }, [settings]);

  const handleSave = async () => {
    try {
      await save.mutateAsync({ notify_low_stock: notifyLow, notify_out_of_stock: notifyOos, notify_daily_summary: notifyDaily });
      show('Notification preferences saved.');
    } catch (err: any) { show('Save failed: ' + err.message); }
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <div className="settings-panel-title">Notification Preferences</div>
      </div>
      <div className="settings-panel-body">
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Low Stock Alerts</div>
            <div className="setting-desc">Show a notification when any product drops to or below its reorder point.</div>
          </div>
          <div className="setting-control">
            <label className="setting-checkbox-label" onClick={() => setNotifyLow(!notifyLow)}>
              <input type="checkbox" className="setting-checkbox" checked={notifyLow} readOnly />
              <span className="setting-checkbox-box" />
            </label>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Out of Stock Alerts</div>
            <div className="setting-desc">Show a notification when any product hits zero stock.</div>
          </div>
          <div className="setting-control">
            <label className="setting-checkbox-label" onClick={() => setNotifyOos(!notifyOos)}>
              <input type="checkbox" className="setting-checkbox" checked={notifyOos} readOnly />
              <span className="setting-checkbox-box" />
            </label>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Daily Sales Summary</div>
            <div className="setting-desc">Show a summary of the day's approved nightly submissions on the dashboard.</div>
          </div>
          <div className="setting-control">
            <label className="setting-checkbox-label" onClick={() => setNotifyDaily(!notifyDaily)}>
              <input type="checkbox" className="setting-checkbox" checked={notifyDaily} readOnly />
              <span className="setting-checkbox-box" />
            </label>
          </div>
        </div>
        <div className="settings-save-bar">
          <button className="btn btn-primary" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Section: My Account ── */

function AccountSection() {
  const { profile } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const save = useSaveAccount();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setDisplayName(profile.display_name || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!fullName.trim()) { show('Full name is required.'); return; }
    try {
      await save.mutateAsync({ userId: profile!.id, fullName: fullName.trim(), displayName: displayName.trim() || null });
      show('Account updated.');
    } catch (err: any) { show('Save failed: ' + err.message); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <div className="settings-panel-title">My Account</div>
      </div>
      <div className="settings-panel-body">
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Full Name</div>
            <div className="setting-desc">Your legal name — used in audit logs and reports.</div>
          </div>
          <div className="setting-control">
            <input className="setting-input wide" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Display Name</div>
            <div className="setting-desc">Short name shown in the header and activity feed.</div>
          </div>
          <div className="setting-control">
            <input className="setting-input wide" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Interface Theme</div>
            <div className="setting-desc">Saved to this browser only.</div>
          </div>
          <div className="setting-control">
            <select className="setting-select" defaultValue="dark">
              <option value="dark">Dark</option>
              <option value="light">Light (coming soon)</option>
            </select>
          </div>
        </div>
        <div className="settings-save-bar">
          <button className="btn btn-primary" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" style={{ color: 'var(--crimson)', borderColor: 'var(--crimson)' }} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Settings Page ── */

export default function SettingsPage() {
  const { profile } = useAuth();
  const role = useMemo(() => getTopRole(profile?.locations ?? []), [profile]);
  const defaultSection: Section = role === 'employee' ? 'account' : 'users';
  const [activeSection, setActiveSection] = useState<Section>(defaultSection);

  const visibleNav = useMemo(() =>
    NAV_ITEMS.filter((item) => {
      if (!item.minRole) return true;
      return (ROLE_ORDER[role] || 0) >= (ROLE_ORDER[item.minRole] || 0);
    }),
  [role]);

  const isOwner = role === 'owner';

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="PANDORA'S BOX — SYSTEM CONFIGURATION"
      />

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      <div className="settings-grid">
        {/* Left nav */}
        <div className="settings-nav">
          {visibleNav.map((item) => (
            <div
              key={item.section}
              className={`settings-nav-item${activeSection === item.section ? ' active' : ''}`}
              onClick={() => setActiveSection(item.section)}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* Right content */}
        <div>
          {activeSection === 'users' && <UsersSection profileId={profile?.id ?? ''} isOwner={isOwner} />}
          {activeSection === 'stores' && <StoresSection />}
          {activeSection === 'inventory' && <InventorySection />}
          {activeSection === 'pricing' && <PricingSection />}
          {activeSection === 'categories' && <CategoriesSection />}
          {activeSection === 'brands' && <BrandsSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'account' && <AccountSection />}
        </div>
      </div>
    </>
  );
}
