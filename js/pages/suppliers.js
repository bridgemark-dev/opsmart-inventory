/* PAGE: suppliers */
import { requireAuth, getCurrentProfile, supabase, applySidebarRole } from '../supabase.js';

let _profile = null;

const _HTML = `<div class="page-header">
    <div>
      <div class="page-title">Suppliers</div>
      <div class="page-subtitle">PANDORA'S BOX · ALL LOCATIONS</div>
    </div>
    <button class="btn btn-primary" onclick="openPanel()">
      Add Supplier
    </button>
  </div>

  <div class="accent-line"></div>
  <div style="height:20px;"></div>

  <!-- Filter bar -->
  <div class="filter-bar" style="margin-bottom:20px;">
    <div class="page-search-wrap">
      <span class="page-search-icon">⌕</span>
      <input type="text" id="search-input" placeholder="Search suppliers…" oninput="applyFilters()">
    </div>
    <div class="filter-spacer"></div>
    <div class="filter-count" id="filter-count">— suppliers</div>
  </div>

  <div class="page-grid" id="page-grid" style="grid-template-columns:1fr;">

    <!-- Supplier table -->
    <div class="data-table-card">
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th onclick="sortBy('name')"         id="th-name">Supplier Name</th>
              <th onclick="sortBy('contact_name')" id="th-contact">Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th onclick="sortBy('lead_days')"    id="th-lead" style="text-align:center;">Lead Days</th>
              <th style="text-align:right;"></th>
            </tr>
          </thead>
          <tbody id="suppliers-tbody">
            <tr><td colspan="6" class="state-loading">
              <div class="state-icon">◎</div>
              <div class="state-text">Loading suppliers…</div>
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Side panel: Add / Edit -->
    <div class="side-panel" id="side-panel" style="display:none;">
      <div class="side-panel-header">
        <div class="side-panel-title" id="panel-title">Add Supplier</div>
        <div class="side-panel-close" onclick="closePanel()">×</div>
      </div>

      <div class="side-panel-body">

        <div class="form-group">
          <label>Supplier Name <span class="required">*</span></label>
          <input class="form-control" type="text" id="f-name" placeholder="e.g. VPR Brands">
          <div class="form-error" id="e-name">Name is required.</div>
        </div>

        <div class="form-group">
          <label>Contact Name</label>
          <input class="form-control" type="text" id="f-contact" placeholder="Sales rep name">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Phone</label>
            <input class="form-control" type="tel" id="f-phone" placeholder="(509) 555-0100">
          </div>
          <div class="form-group">
            <label>Lead Days</label>
            <input class="form-control" type="number" id="f-lead" placeholder="7" min="0" max="365">
            <div class="form-hint">Avg days from order to receipt</div>
          </div>
        </div>

        <div class="form-group">
          <label>Email</label>
          <input class="form-control" type="email" id="f-email" placeholder="orders@supplier.com">
        </div>

        <div class="form-group">
          <label>Website</label>
          <input class="form-control" type="url" id="f-website" placeholder="https://supplier.com">
        </div>

        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-control" id="f-notes" placeholder="Min order amounts, payment terms, special instructions…"></textarea>
        </div>

      </div>

      <div class="side-panel-footer">
        <button class="btn btn-primary btn-full" id="save-btn" onclick="saveSupplier()">
          Save Supplier
        </button>
      </div>

      <!-- Danger zone (edit mode only) -->
      <div id="danger-zone" style="display:none;padding:0 22px 18px;">
        <div style="font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);font-family:'DM Mono',monospace;margin-bottom:8px;">Danger Zone</div>
        <button class="btn btn-danger btn-full btn-sm" onclick="deleteSupplier()">
          Deactivate Supplier
        </button>
        <div class="form-hint" style="margin-top:5px;">Removes from active list. Products linked to this supplier are unaffected.</div>
      </div>
    </div>

  </div><!-- /page-grid -->
<!-- Confirm dialog -->
<div class="confirm-overlay" id="confirm-overlay">
  <div class="confirm-box">
    <div class="confirm-title" id="confirm-title">Are you sure?</div>
    <div class="confirm-msg"   id="confirm-msg"></div>
    <div class="confirm-actions">
      <button class="btn btn-secondary" onclick="closeConfirm()">Cancel</button>
      <button class="btn btn-danger"    id="confirm-ok-btn">Confirm</button>
    </div>
  </div>
</div>

<div class="notif-panel" id="notif-panel">
  <div class="notif-head">
    <span class="notif-head-title">Notifications</span>
    <span class="notif-head-clear" id="notif-clear-btn">Mark all read</span>
  </div>
  <div class="notif-list" id="notif-list">
    <div style="padding:16px;text-align:center;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;">Loading…</div>
  </div>
</div>`;

export async function init(profile) {
  _profile = profile;
  document.getElementById('outlet').innerHTML = _HTML;
  
  await _run(profile);
}

/* ── State ── */
let allSuppliers  = [];
let filtered      = [];
let editingId     = null;   // null = add mode, uuid = edit mode
let sortCol       = 'name';
let sortDir       = 'asc';
let confirmCb     = null;

/* ── Init ── */
async function _run(profile) {
    const _subEl = document.getElementById('page-subtitle');
    if (_subEl) _subEl.textContent = "PANDORA'S BOX · " + (_profile.locations.length === 1 ? _profile.locations[0].location_name.toUpperCase() : 'ALL LOCATIONS');
    const _roleArr = _profile.locations.map(l => l.role);
    const _role = _roleArr.includes('owner') ? 'owner' : _roleArr.includes('manager') ? 'manager' : _roleArr.includes('employee') ? 'employee' : 'employee';

    await loadSuppliers();
}

/* ── Load ── */
async function loadSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    if (error) { showToast('Failed to load suppliers.'); return; }
    allSuppliers = data ?? [];
    applyFilters();
}

/* ── Filter & sort ── */
window.applyFilters = function () {
    const q = document.getElementById('search-input').value.toLowerCase().trim();
    filtered = allSuppliers.filter(s => {
      if (!q) return true;
      return `${s.name} ${s.contact_name ?? ''} ${s.email ?? ''} ${s.phone ?? ''}`.toLowerCase().includes(q);
    });
    sortRows();
    renderTable();
};

window.sortBy = function (col) {
    sortDir = sortCol === col ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    sortCol = col;
    document.querySelectorAll('.data-table th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
    const thMap = { name:'th-name', contact_name:'th-contact', lead_days:'th-lead' };
    if (thMap[col]) document.getElementById(thMap[col])?.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    sortRows();
    renderTable();
};

function sortRows() {
    filtered.sort((a, b) => {
      const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
}

/* ── Render ── */
function renderTable() {
    const tbody = document.getElementById('suppliers-tbody');
    document.getElementById('filter-count').textContent =
      `${filtered.length} supplier${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="state-empty">
            <div class="state-icon">◎</div>
            <div class="state-text">${allSuppliers.length === 0
              ? 'No suppliers yet.\nClick "Add Supplier" to get started.'
              : 'No suppliers match your search.'}</div>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td>
          <div style="font-weight:500;">${s.name}</div>
          ${s.website ? `<div style="font-size:0.7rem;color:var(--text-muted);font-family:'DM Mono',monospace;">${s.website}</div>` : ''}
        </td>
        <td style="color:var(--text-dim);">${s.contact_name || '—'}</td>
        <td style="font-family:'DM Mono',monospace;font-size:0.78rem;color:var(--text-dim);">${s.phone || '—'}</td>
        <td style="font-size:0.78rem;color:var(--text-dim);">${s.email || '—'}</td>
        <td style="text-align:center;font-family:'DM Mono',monospace;">
          ${s.lead_days != null
            ? `<span style="color:var(--gold);">${s.lead_days}</span> <span style="color:var(--text-muted);font-size:0.7rem;">days</span>`
            : '—'}
        </td>
        <td>
          <div class="td-actions">
            <button class="btn btn-ghost btn-sm" onclick="editSupplier('${s.id}')">Edit</button>
          </div>
        </td>
      </tr>
    `).join('');
}

/* ── Panel: open/close ── */
window.openPanel = function (supplier = null) {
    editingId = supplier?.id ?? null;
    clearForm();

    document.getElementById('panel-title').textContent =
      supplier ? 'Edit Supplier' : 'Add Supplier';
    document.getElementById('danger-zone').style.display =
      supplier ? '' : 'none';
    document.getElementById('save-btn').textContent =
      supplier ? 'Update Supplier' : 'Save Supplier';

    if (supplier) populateForm(supplier);

    document.getElementById('side-panel').style.display = '';
    document.getElementById('page-grid').style.gridTemplateColumns = '1fr 360px';
    document.getElementById('f-name').focus();
};

window.closePanel = function () {
    document.getElementById('side-panel').style.display = 'none';
    document.getElementById('page-grid').style.gridTemplateColumns = '1fr';
    editingId = null;
    clearForm();
};

window.editSupplier = function (id) {
    const s = allSuppliers.find(s => s.id === id);
    if (s) openPanel(s);
};

function clearForm() {
    ['f-name','f-contact','f-phone','f-lead','f-email','f-website','f-notes']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
    document.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
}

function populateForm(s) {
    document.getElementById('f-name').value    = s.name        ?? '';
    document.getElementById('f-contact').value = s.contact_name ?? '';
    document.getElementById('f-phone').value   = s.phone       ?? '';
    document.getElementById('f-lead').value    = s.lead_days   ?? '';
    document.getElementById('f-email').value   = s.email       ?? '';
    document.getElementById('f-website').value = s.website     ?? '';
    document.getElementById('f-notes').value   = s.notes       ?? '';
}

/* ── Save ── */
window.saveSupplier = async function () {
    // Validate
    const name = document.getElementById('f-name').value.trim();
    if (!name) {
      document.getElementById('f-name').classList.add('error');
      document.getElementById('e-name').classList.add('visible');
      document.getElementById('f-name').focus();
      return;
    }
    document.getElementById('f-name').classList.remove('error');
    document.getElementById('e-name').classList.remove('visible');

    const btn = document.getElementById('save-btn');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    const { error } = await supabase.rpc('upsert_supplier', {
      p_id:        editingId ?? null,
      p_name:      name,
      p_contact:   document.getElementById('f-contact').value.trim() || null,
      p_phone:     document.getElementById('f-phone').value.trim()   || null,
      p_lead_days: parseInt(document.getElementById('f-lead').value, 10) || null,
      p_email:     document.getElementById('f-email').value.trim()   || null,
      p_website:   document.getElementById('f-website').value.trim() || null,
      p_notes:     document.getElementById('f-notes').value.trim()   || null,
    });

    btn.disabled    = false;
    btn.textContent = editingId ? 'Update Supplier' : 'Save Supplier';

    if (error) { showToast('Save failed: ' + error.message); return; }

    showToast(editingId ? 'Supplier updated.' : `${name} added.`);
    closePanel();
    await loadSuppliers();
};

/* ── Delete (soft) ── */
window.deleteSupplier = function () {
    const s = allSuppliers.find(s => s.id === editingId);
    if (!s) return;
    showConfirm(
      `Deactivate ${s.name}?`,
      'This supplier will be removed from your active list. Products linked to them will not be affected.',
      async () => {
        const { error } = await supabase.rpc('delete_supplier', { p_id: editingId });
        if (error) { showToast('Failed: ' + error.message); return; }
        showToast(`${s.name} deactivated.`);
        closePanel();
        await loadSuppliers();
      }
    );
};

/* ── Confirm dialog ── */
function showConfirm(title, msg, cb) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent   = msg;
    confirmCb = cb;
    document.getElementById('confirm-overlay').classList.add('open');
    document.getElementById('confirm-ok-btn').onclick = () => { closeConfirm(); cb(); };
}

window.closeConfirm = function () {
    document.getElementById('confirm-overlay').classList.remove('open');
    confirmCb = null;
};

