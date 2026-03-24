/* PAGE: purchase-orders */
import { requireAuth, getCurrentProfile, supabase, searchProducts, applySidebarRole } from '../supabase.js';

let _profile = null;

const _HTML = `<div class="page-header">
    <div>
      <div class="page-title">Purchase Orders</div>
      <div class="page-subtitle">PANDORA'S BOX · ALL LOCATIONS</div>
    </div>
    <button class="btn btn-primary" onclick="openNewPO()">New PO</button>
  </div>

  <div class="accent-line"></div>
  <div style="height:20px;"></div>

  <!-- KPI strip -->
  <div class="inv-kpi-strip" style="margin-bottom:20px;">
    <div class="inv-kpi">
      <div class="inv-kpi-label">Open Orders</div>
      <div class="inv-kpi-value" id="kpi-open">—</div>
    </div>
    <div class="inv-kpi">
      <div class="inv-kpi-label">Awaiting Delivery</div>
      <div class="inv-kpi-value" id="kpi-sent">—</div>
    </div>
    <div class="inv-kpi">
      <div class="inv-kpi-label">Partial Received</div>
      <div class="inv-kpi-value" style="color:var(--gold);" id="kpi-partial">—</div>
    </div>
    <div class="inv-kpi">
      <div class="inv-kpi-label">Received (30 days)</div>
      <div class="inv-kpi-value" style="color:var(--sage);" id="kpi-received">—</div>
    </div>
  </div>

  <!-- Filter bar -->
  <div class="filter-bar" style="margin-bottom:20px;">
    <div class="page-search-wrap">
      <span class="page-search-icon">⌕</span>
      <input type="text" id="search-input" placeholder="Search PO number, supplier…" oninput="applyFilters()">
    </div>

    <select class="filter-select" id="status-filter" onchange="applyFilters()">
      <option value="">All Statuses</option>
      <option value="draft">Draft</option>
      <option value="sent">Sent</option>
      <option value="partial">Partial</option>
      <option value="received">Received</option>
      <option value="cancelled">Cancelled</option>
    </select>

    <select class="filter-select" id="location-filter" onchange="applyFilters()">
      <option value="">All Locations</option>
    </select>

    <div class="filter-spacer"></div>
    <div class="filter-count" id="filter-count">— orders</div>
  </div>

  <!-- Main grid -->
  <div class="page-grid" id="page-grid" style="grid-template-columns:1fr;">

    <!-- PO list table -->
    <div class="data-table-card">
      <div class="data-table-scroll">
        <table class="data-table" style="min-width:700px;">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Supplier</th>
              <th>Location</th>
              <th>Ordered</th>
              <th>Expected</th>
              <th style="text-align:center;">Items</th>
              <th style="text-align:right;">Total Cost</th>
              <th style="text-align:center;">Progress</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="po-tbody">
            <tr><td colspan="10">
              <div class="state-loading">
                <div class="state-icon">◳</div>
                <div class="state-text">Loading purchase orders…</div>
              </div>
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PO detail panel (shown when a PO is selected) -->
    <div class="po-panel" id="po-panel" style="display:none;">

      <div class="po-panel-header">
        <div class="po-panel-title" id="panel-po-number">—</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span id="panel-po-status"></span>
          <div class="side-panel-close" onclick="closePanel()">×</div>
        </div>
      </div>

      <!-- PO metadata -->
      <div class="po-meta" id="panel-meta"></div>

      <!-- Line items -->
      <div class="po-items-section">
        <div class="po-items-title">Line Items</div>
        <div id="panel-line-items"></div>
      </div>

      <!-- Draft builder: add items (draft only) -->
      <div class="draft-section" id="draft-section" style="display:none;">
        <div class="po-items-title">Add Products</div>
        <div class="add-line-row">
          <div class="receive-field add-line-search">
            <label>Search Product</label>
            <input class="form-control" type="text" id="draft-product-search"
                   placeholder="SKU or name…" autocomplete="off"
                   oninput="handleDraftSearch(this.value)">
            <div class="add-line-results" id="draft-search-results"></div>
          </div>
          <div class="receive-field">
            <label>Qty</label>
            <input class="receive-input" type="number" id="draft-qty" placeholder="0" min="1">
          </div>
          <div class="receive-field">
            <label>Unit Cost ($)</label>
            <input class="receive-input" type="number" id="draft-cost" placeholder="0.00" min="0" step="0.01">
          </div>
          <div class="receive-field" style="align-self:flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="addDraftLine()">+ Add</button>
          </div>
        </div>
      </div>

      <!-- PO total -->
      <div class="po-total-row" id="panel-total-row" style="display:none;">
        <span class="po-total-label">Estimated Total</span>
        <span class="po-total-value" id="panel-total">$0.00</span>
      </div>

      <!-- Receiving form (sent/partial only) -->
      <div class="receive-section" id="receive-section" style="display:none;">
        <div class="receive-title">Record Receipt</div>
        <div id="receive-lines"></div>
        <div style="margin-top:12px;">
          <button class="btn btn-primary btn-full" onclick="submitReceipt()">
            ✓ Confirm Receipt & Update Inventory
          </button>
        </div>
      </div>

      <!-- Receipt history -->
      <div class="receipt-history" id="receipt-history" style="display:none;">
        <div class="po-items-title">Receipt History</div>
        <div id="receipt-history-list"></div>
      </div>

      <!-- Action buttons -->
      <div class="po-panel-actions" id="panel-actions"></div>

    </div><!-- /po-panel -->

  </div><!-- /page-grid -->
<!-- New PO modal -->
<div class="modal-overlay" id="new-po-modal" onclick="handleModalOverlay(event)">
  <div class="modal" style="max-width:520px;">
    <div class="modal-header">
      <div class="modal-title">New Purchase Order</div>
      <div class="modal-close" onclick="closeNewPO()">×</div>
    </div>
    <div class="modal-body">

      <div class="form-group">
        <label class="modal-label">Supplier <span style="color:var(--crimson);">*</span></label>
        <select class="form-control" id="new-supplier">
          <option value="">Select supplier…</option>
        </select>
        <div class="form-error" id="e-supplier">Supplier is required.</div>
      </div>

      <div class="form-group">
        <label class="modal-label">Receiving Location <span style="color:var(--crimson);">*</span></label>
        <select class="form-control" id="new-location">
          <option value="">Select location…</option>
        </select>
        <div class="form-hint">The primary location for this order. You can split to other locations when receiving.</div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="modal-label">Order Date</label>
          <input class="form-control" type="date" id="new-ordered-at">
        </div>
        <div class="form-group">
          <label class="modal-label">Expected Delivery</label>
          <input class="form-control" type="date" id="new-expected-at">
        </div>
      </div>

      <div class="form-group">
        <label class="modal-label">Notes</label>
        <textarea class="form-control" id="new-notes" style="min-height:60px;"
                  placeholder="Order reference, special instructions…"></textarea>
      </div>

    </div>
    <div class="modal-footer">
      <button class="modal-cancel-btn" onclick="closeNewPO()">Cancel</button>
      <button class="modal-submit-btn" onclick="createPO()">Create Draft PO</button>
    </div>
  </div>
</div>

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
let allPOs         = [];
let filtered       = [];
let suppliers      = [];
let locations      = [];
let selectedPO     = null;   // full PO object currently in panel
let selectedPOItems = [];    // line items for selected PO
let draftSelectedProduct = null;
let draftSearchTimer = null;

/* ── Init ── */
async function _run(profile) {
    const _subEl = document.getElementById('page-subtitle');
    if (_subEl) _subEl.textContent = "PANDORA'S BOX · " + (_profile.locations.length === 1 ? _profile.locations[0].location_name.toUpperCase() : 'ALL LOCATIONS');
    const _roleArr = _profile.locations.map(l => l.role);
    const _role = _roleArr.includes('owner') ? 'owner' : _roleArr.includes('manager') ? 'manager' : _roleArr.includes('employee') ? 'employee' : 'employee';

    await loadLookups();
    await loadPOs();
}

/* ── Lookups ── */
async function loadLookups() {
    const [supRes, locRes] = await Promise.all([
      supabase.from('suppliers').select('id,name,lead_days').is('deleted_at',null).order('name'),
      supabase.from('locations').select('id,name').eq('is_active',true).order('name'),
    ]);
    suppliers = supRes.data ?? [];
    locations = locRes.data ?? [];

    // Populate filter + modal dropdowns
    const locFilter = document.getElementById('location-filter');
    const newLoc    = document.getElementById('new-location');
    locations.forEach(l => {
      [locFilter, newLoc].forEach(sel => {
        const opt = document.createElement('option');
        opt.value = l.id; opt.textContent = l.name;
        sel.appendChild(opt);
      });
    });

    const supSel = document.getElementById('new-supplier');
    suppliers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name +
        (s.lead_days ? ` (${s.lead_days}d lead)` : '');
      supSel.appendChild(opt);
    });

    // Default order date to today
    document.getElementById('new-ordered-at').value = new Date().toISOString().slice(0,10);
}

/* ── Load POs ── */
async function loadPOs() {
    const { data, error } = await supabase
      .from('po_summary')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load POs: ' + error.message); return; }
    allPOs = data ?? [];
    updateKpis();
    applyFilters();

    // Refresh selected PO if one is open
    if (selectedPO) {
      const refreshed = allPOs.find(p => p.id === selectedPO.id);
      if (refreshed) selectPO(refreshed.id);
    }
}

/* ── KPIs ── */
function updateKpis() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5).toISOString();
    document.getElementById('kpi-open').textContent     = allPOs.filter(p => p.status === 'draft').length;
    document.getElementById('kpi-sent').textContent     = allPOs.filter(p => p.status === 'sent').length;
    document.getElementById('kpi-partial').textContent  = allPOs.filter(p => p.status === 'partial').length;
    document.getElementById('kpi-received').textContent = allPOs.filter(p =>
      p.status === 'received' && p.received_at > thirtyDaysAgo).length;
}

/* ── Filter ── */
window.applyFilters = function () {
    const q      = document.getElementById('search-input').value.toLowerCase().trim();
    const status = document.getElementById('status-filter').value;
    const locId  = document.getElementById('location-filter').value;
    const locName = locations.find(l => l.id === locId)?.name ?? '';

    filtered = allPOs.filter(po => {
      if (status && po.status !== status)                    return false;
      if (locName && po.location_name !== locName)           return false;
      if (q && !`${po.po_number} ${po.supplier_name}`.toLowerCase().includes(q)) return false;
      return true;
    });

    document.getElementById('filter-count').textContent =
      `${filtered.length} order${filtered.length !== 1 ? 's' : ''}`;
    renderTable();
};

/* ── Render table ── */
function renderTable() {
    const tbody = document.getElementById('po-tbody');

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="10">
        <div class="state-empty">
          <div class="state-icon">◳</div>
          <div class="state-text">${allPOs.length === 0
            ? 'No purchase orders yet.\nClick "New PO" to create your first order.'
            : 'No orders match your filters.'}</div>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(po => {
      const ordered  = po.ordered_at
        ? new Date(po.ordered_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
      const expected = po.expected_at
        ? new Date(po.expected_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
      const isOverdue = po.expected_at && new Date(po.expected_at) < new Date()
        && ['sent','partial'].includes(po.status);
      const progress = po.total_ordered > 0
        ? Math.round((po.total_received / po.total_ordered) * 100) : 0;

      return `
        <tr style="cursor:pointer;" onclick="selectPO('${po.id}')">
          <td>
            <div style="font-family:'DM Mono',monospace;font-weight:600;color:var(--gold);">${po.po_number}</div>
          </td>
          <td style="font-weight:500;">${po.supplier_name}</td>
          <td style="color:var(--text-muted);font-size:0.78rem;">${po.location_name}</td>
          <td style="font-size:0.78rem;color:var(--text-dim);">${ordered}</td>
          <td style="font-size:0.78rem;color:${isOverdue ? 'var(--crimson)' : 'var(--text-dim)'};">
            ${expected}${isOverdue ? ' ⚠' : ''}
          </td>
          <td style="text-align:center;font-family:'DM Mono',monospace;">${po.line_item_count ?? 0}</td>
          <td style="text-align:right;font-family:'DM Mono',monospace;font-size:0.78rem;">
            ${po.total_cost > 0 ? '$' + parseFloat(po.total_cost).toFixed(2) : '—'}
          </td>
          <td style="text-align:center;">
            ${po.total_ordered > 0 ? `
              <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                <div style="width:60px;height:4px;background:var(--surface3);border-radius:4px;overflow:hidden;">
                  <div style="width:${progress}%;height:100%;background:${progress===100?'var(--sage)':'var(--gold)'};border-radius:4px;"></div>
                </div>
                <span style="font-family:'DM Mono',monospace;font-size:0.68rem;color:var(--text-muted);">${progress}%</span>
              </div>` : '—'}
          </td>
          <td><span class="po-status ${po.status}">${po.status}</span></td>
          <td>
            <div class="td-actions">
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();selectPO('${po.id}')">Open</button>
            </div>
          </td>
        </tr>`;
    }).join('');
}

/* ── Select PO → show panel ── */
window.selectPO = async function (poId) {
    // Load full PO with line items and receipts
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers ( id, name, lead_days, phone, email ),
        locations ( id, name ),
        purchase_order_items (
          id, quantity_ordered, quantity_received, unit_cost,
          products ( id, name, brand,
            categories ( category_number ),
            product_number
          )
        )
      `)
      .eq('id', poId)
      .single();

    if (poErr || !po) { showToast('Failed to load PO.'); return; }

    const { data: receipts } = await supabase
      .from('po_receipts')
      .select(`*, locations(name), profiles(display_name, full_name)`)
      .eq('po_id', poId)
      .order('received_at', { ascending: false });

    selectedPO = po;
    selectedPOItems = po.purchase_order_items ?? [];

    renderPanel(po, receipts ?? []);

    document.getElementById('po-panel').style.display = '';
    document.getElementById('page-grid').style.gridTemplateColumns = '1fr 400px';
};

window.closePanel = function () {
    selectedPO = null; selectedPOItems = [];
    document.getElementById('po-panel').style.display = 'none';
    document.getElementById('page-grid').style.gridTemplateColumns = '1fr';
};

/* ── Render panel ── */
function renderPanel(po, receipts) {
    const isManager = _profile.locations.some(l => ['manager','owner'].includes(l.role));

    // Header
    document.getElementById('panel-po-number').textContent = po.po_number;
    document.getElementById('panel-po-status').innerHTML =
      `<span class="po-status ${po.status}">${po.status}</span>`;

    // Meta grid
    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
    document.getElementById('panel-meta').innerHTML = `
      <div class="po-meta-item">
        <div class="po-meta-label">Supplier</div>
        <div class="po-meta-value">${po.suppliers?.name ?? '—'}</div>
      </div>
      <div class="po-meta-item">
        <div class="po-meta-label">Location</div>
        <div class="po-meta-value">${po.locations?.name ?? '—'}</div>
      </div>
      <div class="po-meta-item">
        <div class="po-meta-label">Ordered</div>
        <div class="po-meta-value">${fmt(po.ordered_at)}</div>
      </div>
      <div class="po-meta-item">
        <div class="po-meta-label">Expected</div>
        <div class="po-meta-value">${fmt(po.expected_at)}</div>
      </div>
      ${po.notes ? `<div class="po-meta-item" style="grid-column:1/-1;">
        <div class="po-meta-label">Notes</div>
        <div class="po-meta-value" style="font-weight:400;color:var(--text-dim);">${po.notes}</div>
      </div>` : ''}
    `;

    // Line items
    const itemsHtml = selectedPOItems.map(item => {
      const sku = `${item.products?.categories?.category_number}/${item.products?.product_number}`;
      const pct = item.quantity_ordered > 0
        ? Math.round((item.quantity_received / item.quantity_ordered) * 100) : 0;
      const recClass = pct >= 100 ? 'full' : pct > 0 ? 'partial' : 'none';
      const recLabel = pct >= 100 ? '✓ Full' : pct > 0 ? `${pct}%` : 'Pending';
      return `
        <div class="po-line-item">
          <div>
            <div class="po-line-name">${item.products?.name ?? '—'}</div>
            <div class="po-line-sku">${sku}</div>
          </div>
          <div style="text-align:right;">
            <div class="po-line-qty">${item.quantity_received}/${item.quantity_ordered}</div>
            ${item.unit_cost ? `<div class="po-line-cost">$${parseFloat(item.unit_cost).toFixed(2)}/ea</div>` : ''}
          </div>
          <div><span class="po-line-received ${recClass}">${recLabel}</span></div>
        </div>`;
    }).join('') || '<div style="color:var(--text-muted);font-size:0.8rem;padding:8px 0;">No items yet.</div>';

    document.getElementById('panel-line-items').innerHTML = itemsHtml;

    // Total
    const total = selectedPOItems.reduce((s,i) => s + (i.quantity_ordered * (i.unit_cost||0)), 0);
    if (total > 0) {
      document.getElementById('panel-total-row').style.display = '';
      document.getElementById('panel-total').textContent = '$' + total.toFixed(2);
    } else {
      document.getElementById('panel-total-row').style.display = 'none';
    }

    // Draft section (add line items)
    const draftSec = document.getElementById('draft-section');
    draftSec.style.display = (po.status === 'draft' && isManager) ? '' : 'none';

    // Receiving section
    const receiveSec = document.getElementById('receive-section');
    const canReceive = ['sent','partial'].includes(po.status) && isManager;
    receiveSec.style.display = canReceive ? '' : 'none';
    if (canReceive) renderReceiveForm(po);

    // Receipt history
    const histSec = document.getElementById('receipt-history');
    if (receipts.length > 0) {
      histSec.style.display = '';
      document.getElementById('receipt-history-list').innerHTML = receipts.map(r => `
        <div class="receipt-event">
          <div class="receipt-event-dot"></div>
          <div class="receipt-event-body">
            <div class="receipt-event-text">
              <strong>${r.quantity_received} units</strong> received at ${r.locations?.name ?? '—'}
              ${r.notes ? ` — ${r.notes}` : ''}
            </div>
            <div class="receipt-event-time">
              ${new Date(r.received_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
              · ${r.profiles?.display_name || r.profiles?.full_name || 'Unknown'}
            </div>
          </div>
        </div>`).join('');
    } else {
      histSec.style.display = 'none';
    }

    // Action buttons
    renderPanelActions(po, isManager);
}

/* ── Receiving form ── */
function renderReceiveForm(po) {
    const pendingItems = selectedPOItems.filter(i => i.quantity_received < i.quantity_ordered);

    if (!pendingItems.length) {
      document.getElementById('receive-lines').innerHTML =
        '<div style="color:var(--sage);font-size:0.8rem;font-family:\'DM Mono\',monospace;">All items fully received.</div>';
      return;
    }

    document.getElementById('receive-lines').innerHTML = pendingItems.map(item => {
      const sku       = `${item.products?.categories?.category_number}/${item.products?.product_number}`;
      const remaining = item.quantity_ordered - item.quantity_received;
      const locOpts   = locations.map(l =>
        `<option value="${l.id}">${l.name}</option>`).join('');

      return `
        <div class="receive-line" data-item-id="${item.id}" data-product-id="${item.products?.id}">
          <div class="receive-line-header">
            <div>
              <div class="receive-line-name">${item.products?.name ?? '—'}</div>
              <div style="font-family:'DM Mono',monospace;font-size:0.68rem;color:var(--gold);">${sku}</div>
            </div>
            <div class="receive-line-ordered">${remaining} remaining</div>
          </div>
          <div class="receive-fields">
            <div class="receive-field">
              <label>Qty Received</label>
              <input class="receive-input" type="number" min="0" max="${remaining}"
                     placeholder="0" value="${remaining}"
                     data-role="qty">
            </div>
            <div class="receive-field">
              <label>Location</label>
              <select class="receive-select" data-role="location">${locOpts}</select>
            </div>
            <div class="receive-field">
              <label>Delivery Note Qty</label>
              <input class="receive-input" type="number" min="0"
                     placeholder="${remaining}" data-role="expected">
            </div>
          </div>
          <textarea class="receive-notes-input" placeholder="Discrepancy notes, damage, etc." data-role="notes"></textarea>
        </div>`;
    }).join('');
}

/* ── Submit receipt ── */
window.submitReceipt = async function () {
    if (!selectedPO) return;

    const receiveLines = document.querySelectorAll('.receive-line');
    const receipts = [];

    receiveLines.forEach(line => {
      const qty = parseInt(line.querySelector('[data-role="qty"]').value, 10);
      if (!qty || qty <= 0) return;  // skip lines with 0 qty

      receipts.push({
        po_item_id:        line.dataset.itemId,
        location_id:       line.querySelector('[data-role="location"]').value,
        quantity_received: qty,
        quantity_expected: parseInt(line.querySelector('[data-role="expected"]').value, 10) || null,
        notes:             line.querySelector('[data-role="notes"]').value.trim() || null,
      });
    });

    if (!receipts.length) { showToast('Enter at least one quantity to receive.'); return; }

    const btn = document.querySelector('#receive-section .btn-primary');
    btn.disabled = true; btn.textContent = 'Saving…';

    const { data, error } = await supabase.rpc('receive_po_items', {
      p_po_id:    selectedPO.id,
      p_receipts: receipts,
    });

    btn.disabled = false;
    btn.textContent = '✓ Confirm Receipt & Update Inventory';

    if (error) { showToast('Receipt failed: ' + error.message); return; }

    const result = data;
    showToast(`Receipt saved — ${result.transactions_written} inventory update${result.transactions_written !== 1 ? 's' : ''} written.`);
    await loadPOs();
    selectPO(selectedPO.id);
};

/* ── Draft line items ── */
window.handleDraftSearch = function (val) {
    clearTimeout(draftSearchTimer);
    const results = document.getElementById('draft-search-results');
    if (val.trim().length < 2) { results.style.display = 'none'; return; }

    draftSearchTimer = setTimeout(async () => {
      const products = await searchProducts(val);
      if (!products.length) { results.style.display = 'none'; return; }
      results.style.display = '';
      results.innerHTML = products.map(p => `
        <div class="add-line-result-item" onclick="selectDraftProduct(${JSON.stringify(p).replace(/"/g,'&quot;')})">
          <div class="add-line-sku">${p.sku}</div>
          <div class="add-line-name">${p.name}${p.brand ? ' · '+p.brand : ''}</div>
        </div>`).join('');
    }, 280);
};

window.selectDraftProduct = function (product) {
    draftSelectedProduct = product;
    document.getElementById('draft-product-search').value = `${product.sku} — ${product.name}`;
    document.getElementById('draft-search-results').style.display = 'none';
    // Pre-fill cost from product record
    if (product.cost_price) document.getElementById('draft-cost').value = product.cost_price;
    document.getElementById('draft-qty').focus();
};

window.addDraftLine = async function () {
    if (!draftSelectedProduct || !selectedPO) { showToast('Select a product first.'); return; }
    const qty  = parseInt(document.getElementById('draft-qty').value, 10);
    const cost = parseFloat(document.getElementById('draft-cost').value) || null;

    if (!qty || qty < 1) { showToast('Enter a quantity.'); return; }

    // Check if product already on this PO
    const existing = selectedPOItems.find(i => i.products?.id === draftSelectedProduct.id);
    if (existing) {
      // Update quantity
      const { error } = await supabase
        .from('purchase_order_items')
        .update({ quantity_ordered: existing.quantity_ordered + qty, unit_cost: cost ?? existing.unit_cost })
        .eq('id', existing.id);
      if (error) { showToast('Update failed: ' + error.message); return; }
    } else {
      const { error } = await supabase
        .from('purchase_order_items')
        .insert({
          po_id:            selectedPO.id,
          product_id:       draftSelectedProduct.id,
          quantity_ordered: qty,
          unit_cost:        cost,
        });
      if (error) { showToast('Add failed: ' + error.message); return; }
    }

    // Clear draft fields
    document.getElementById('draft-product-search').value = '';
    document.getElementById('draft-qty').value            = '';
    document.getElementById('draft-cost').value           = '';
    draftSelectedProduct = null;

    showToast(`${draftSelectedProduct?.name ?? 'Product'} added to PO.`);
    await selectPO(selectedPO.id);
};

/* ── Panel actions ── */
function renderPanelActions(po, isManager) {
    const actions = document.getElementById('panel-actions');
    const btns = [];

    if (po.status === 'draft' && isManager) {
      btns.push(`<button class="btn btn-primary btn-full" onclick="markSent()">Mark as Sent to Supplier</button>`);
      btns.push(`<button class="btn btn-danger btn-full btn-sm" onclick="cancelPO()">Cancel Order</button>`);
    }
    if (po.status === 'sent' && isManager) {
      btns.push(`<button class="btn btn-secondary btn-full btn-sm" onclick="cancelPO()">Cancel Order</button>`);
    }
    if (po.status === 'cancelled') {
      btns.push(`<div style="font-size:0.78rem;color:var(--crimson);font-family:'DM Mono',monospace;text-align:center;">This order has been cancelled.</div>`);
    }
    if (po.status === 'received') {
      btns.push(`<div style="font-size:0.78rem;color:var(--sage);font-family:'DM Mono',monospace;text-align:center;">✓ Fully received — inventory updated.</div>`);
    }

    actions.innerHTML = btns.join('');
}

window.markSent = async function () {
    if (!selectedPO) return;
    if (!selectedPOItems.length) { showToast('Add at least one item before marking as sent.'); return; }

    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'sent', ordered_at: new Date().toISOString() })
      .eq('id', selectedPO.id);

    if (error) { showToast('Failed: ' + error.message); return; }
    showToast('PO marked as sent. You can record receipts when goods arrive.');
    await loadPOs();
    selectPO(selectedPO.id);
};

window.cancelPO = function () {
    showConfirm(
      `Cancel ${selectedPO?.po_number}?`,
      'This order will be marked cancelled. No inventory changes will be made.',
      async () => {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ status: 'cancelled' })
          .eq('id', selectedPO.id);
        if (error) { showToast('Failed: ' + error.message); return; }
        showToast('Order cancelled.');
        await loadPOs();
        selectPO(selectedPO.id);
      }
    );
};

/* ── New PO modal ── */
window.openNewPO = function () {
    document.getElementById('new-po-modal').classList.add('open');
};

window.closeNewPO = function () {
    document.getElementById('new-po-modal').classList.remove('open');
    document.getElementById('new-supplier').value = '';
    document.getElementById('new-location').value = '';
    document.getElementById('new-notes').value    = '';
    document.getElementById('e-supplier').classList.remove('visible');
};

window.handleModalOverlay = function (e) {
    if (e.target === document.getElementById('new-po-modal')) closeNewPO();
};

window.createPO = async function () {
    const supplierId = document.getElementById('new-supplier').value;
    const locationId = document.getElementById('new-location').value;

    if (!supplierId) {
      document.getElementById('e-supplier').classList.add('visible');
      return;
    }
    document.getElementById('e-supplier').classList.remove('visible');

    const orderedAt  = document.getElementById('new-ordered-at').value  || null;
    const expectedAt = document.getElementById('new-expected-at').value || null;
    const notes      = document.getElementById('new-notes').value.trim() || null;

    const user = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id: supplierId,
        location_id: locationId || locations[0]?.id,
        status:      'draft',
        ordered_at:  orderedAt  ? new Date(orderedAt).toISOString()  : null,
        expected_at: expectedAt ? new Date(expectedAt).toISOString() : null,
        notes,
        created_by:  user.data.user?.id,
        po_number:   '',   // trigger generates this
      })
      .select()
      .single();

    if (error) { showToast('Failed: ' + error.message); return; }

    closeNewPO();
    showToast(`${data.po_number} created.`);
    await loadPOs();
    selectPO(data.id);
};

/* ── Confirm dialog ── */
function showConfirm(title, msg, cb) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent   = msg;
    document.getElementById('confirm-overlay').classList.add('open');
    document.getElementById('confirm-ok-btn').onclick = () => { closeConfirm(); cb(); };
}

window.closeConfirm = function () {
    document.getElementById('confirm-overlay').classList.remove('open');
};

