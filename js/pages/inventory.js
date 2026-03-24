/* PAGE: inventory */
import { requireAuth, getCurrentProfile, supabase, searchProducts, applySidebarRole } from '../supabase.js';

let _profile = null; // module-level, set by init()

const _HTML = `<!-- Page Header -->
  <div class="page-header">
    <div>
      <div class="page-title">Inventory</div>
      <div class="page-subtitle" id="page-subtitle">PANDORA'S BOX · ALL LOCATIONS</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <button class="btn btn-secondary" id="inv-export-btn" onclick="exportCSV()">⬇ Export CSV</button>
      <button class="btn btn-primary" onclick="openAdjustModal(null)">⊿ Adjust Stock</button>
    </div>
  </div>

  <div class="accent-line"></div>
  <div style="height:20px;"></div>

  <!-- KPI Strip -->
  <div class="inv-kpi-strip">
    <div class="inv-kpi">
      <div class="inv-kpi-label">Total SKUs</div>
      <div class="inv-kpi-value" id="kpi-skus">—</div>
    </div>
    <div class="inv-kpi">
      <div class="inv-kpi-label">Total Units</div>
      <div class="inv-kpi-value" id="kpi-units">—</div>
    </div>
    <div class="inv-kpi">
      <div class="inv-kpi-label">Low Stock</div>
      <div class="inv-kpi-value danger" id="kpi-low">—</div>
    </div>
    <div class="inv-kpi">
      <div class="inv-kpi-label">Out of Stock</div>
      <div class="inv-kpi-value danger" id="kpi-out">—</div>
    </div>
  </div>

  <!-- Filter Bar -->
  <div class="filter-bar">
    <input class="filter-input" type="text" id="search-filter"
           placeholder="Search name, SKU, brand…"
           oninput="applyFilters()"
           style="min-width:300px;">

    <select class="filter-select" id="location-filter" onchange="applyFilters()">
      <option value="">All Locations</option>
    </select>

    <select class="filter-select" id="category-filter" onchange="applyFilters()">
      <option value="">All Categories</option>
    </select>

    <button class="filter-btn" id="low-stock-btn" onclick="toggleLowStockFilter()">
      ⚠ Low Stock Only
    </button>

    <div class="filter-spacer"></div>

    <div class="filter-count" id="filter-count">— items</div>
  </div>

  <!-- Inventory Table -->
  <div class="inv-table-card">
    <div class="inv-table-scroll">
      <table class="inv-table">
        <thead>
          <tr>
            <th onclick="sortBy('sku')"           id="th-sku">SKU</th>
            <th onclick="sortBy('product_name')"  id="th-name">Product</th>
            <th onclick="sortBy('category_name')" id="th-cat">Category</th>
            <th onclick="sortBy('location_name')" id="th-loc">Location</th>
            <th onclick="sortBy('quantity_on_hand')" id="th-qty" style="text-align:center;">Qty</th>
            <th style="text-align:center;">Reorder At</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="inv-tbody">
          <tr><td colspan="8" class="table-loading">Loading inventory…</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination" id="pagination" style="display:none;">
      <span id="page-info">Showing 1–50 of 0</span>
      <div class="page-btns" id="page-btns"></div>
    </div>
  </div>
<!-- ═══════════════════════════════════════════════════════════
     ADJUSTMENT MODAL
════════════════════════════════════════════════════════════ -->
<div class="modal-overlay" id="adj-modal" onclick="handleOverlayClick(event)">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">Adjust Stock</div>
      <div class="modal-close" onclick="closeAdjustModal()">×</div>
    </div>

    <div class="modal-body">

      <!-- Product search (shown when opened without a specific product) -->
      <div id="modal-search-field" class="modal-field" style="display:none;">
        <label class="modal-label">Search Product</label>
        <input class="modal-input" type="text" id="modal-product-search"
               placeholder="Type SKU or product name…"
               oninput="handleModalProductSearch(this.value)">
        <div id="modal-search-results" style="
          background:var(--surface2); border:1px solid var(--border);
          border-radius:var(--radius); margin-top:4px; display:none;
          max-height:180px; overflow-y:auto;
        "></div>
      </div>

      <!-- Selected product info -->
      <div class="modal-product-info" id="modal-product-info" style="display:none;">
        <div class="modal-product-sku"  id="modal-sku">—</div>
        <div class="modal-product-name" id="modal-name">—</div>
        <div class="modal-product-loc"  id="modal-loc">—</div>
      </div>

      <!-- Location selector (shown when opened without a specific location) -->
      <div class="modal-field" id="modal-location-field">
        <label class="modal-label">Location</label>
        <select class="modal-select" id="modal-location" onchange="loadCurrentQty()">
          <option value="">Select location…</option>
        </select>
      </div>

      <!-- Current qty display -->
      <div class="current-qty-display" id="modal-current-qty-display" style="display:none;">
        <span class="cqd-label">Current Stock</span>
        <span class="cqd-value" id="modal-current-qty">—</span>
      </div>

      <!-- Adjustment type -->
      <div class="modal-field">
        <label class="modal-label">Adjustment Type</label>
        <div class="adj-type-group">
          <div class="adj-type-btn add active" onclick="setAdjType('add')">+ Add</div>
          <div class="adj-type-btn remove"     onclick="setAdjType('remove')">− Remove</div>
          <div class="adj-type-btn set"        onclick="setAdjType('set')">= Set to</div>
        </div>
      </div>

      <!-- Quantity -->
      <div class="modal-field">
        <label class="modal-label" id="qty-label">Quantity to Add</label>
        <input class="modal-input" type="number" id="modal-qty"
               min="0" placeholder="0" oninput="updatePreview()">
      </div>

      <!-- Preview -->
      <div class="current-qty-display" id="modal-preview" style="display:none;">
        <span class="cqd-label">New Quantity Will Be</span>
        <span class="cqd-value" id="modal-preview-qty" style="color:var(--gold);">—</span>
      </div>

      <!-- Reason -->
      <div class="modal-field">
        <label class="modal-label">Reason / Notes</label>
        <textarea class="modal-textarea" id="modal-reason"
                  placeholder="e.g. Damaged stock removed, Physical count correction, Opening stock entry…"></textarea>
      </div>

    </div>

    <div class="modal-footer">
      <button class="modal-cancel-btn" onclick="closeAdjustModal()">Cancel</button>
      <button class="modal-submit-btn" id="modal-submit-btn" onclick="submitAdjustment()">
        Save Adjustment
      </button>
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

/* ─────────────────────────────────────────────────────────
     STATE
───────────────────────────────────────────────────────── */
let allRows        = [];      // full dataset from inventory_status view
let filteredRows   = [];      // after filters applied
let sortCol        = 'product_name';
let sortDir        = 'asc';
let lowStockOnly   = false;
let currentPage    = 1;
const PAGE_SIZE    = 50;

// Adjustment modal state
let adjProductId   = null;
let adjLocationId  = null;
let adjCurrentQty  = 0;
let adjType        = 'add';   // 'add' | 'remove' | 'set'
let modalSearchTimer = null;

/* ─────────────────────────────────────────────────────────
     INIT
───────────────────────────────────────────────────────── */
async function _run(profile) {
  const _rArr  = (profile?.locations || []).map(l => l.role);
  const role   = _rArr.includes('owner') ? 'owner' : _rArr.includes('manager') ? 'manager' : 'employee';
  const locLabel = profile?.locations?.length === 1
    ? _profile.locations[0].location_name.toUpperCase() : 'ALL LOCATIONS';

  const subEl = document.getElementById('page-subtitle');
  if (subEl) subEl.textContent = "PANDORA'S BOX · " + locLabel;

  if (role === 'employee' || role === 'manager') {
    const exportBtn = document.getElementById('inv-export-btn');
    if (exportBtn) exportBtn.style.display = 'none';
  }

  await populateFilterDropdowns();
  await loadInventory();
  populateModalLocationSelect();
}

/* ─────────────────────────────────────────────────────────
     LOAD DATA
───────────────────────────────────────────────────────── */
async function loadInventory() {
    document.getElementById('inv-tbody').innerHTML =
      '<tr><td colspan="8" class="table-loading">Loading inventory…</td></tr>';

    const { data, error } = await supabase
      .from('inventory_status')
      .select('*')
      .order('product_name');

    if (error) {
      document.getElementById('inv-tbody').innerHTML =
        `<tr><td colspan="8" class="table-empty"><div class="table-empty-icon">⚠</div><div class="table-empty-text">Failed to load: ${error.message}</div></td></tr>`;
      return;
    }

    allRows = data ?? [];
    updateKpis(allRows);
    applyFilters();
}

/* ─────────────────────────────────────────────────────────
     FILTER DROPDOWNS
───────────────────────────────────────────────────────── */
async function populateFilterDropdowns() {
    // Locations the user can access
    const locSelect = document.getElementById('location-filter');
    _profile.locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value       = loc.location_name;
      opt.textContent = loc.location_name;
      locSelect.appendChild(opt);
    });

    // Categories from DB
    const { data: cats } = await supabase
      .from('categories')
      .select('category_number, name')
      .is('deleted_at', null)
      .order('category_number');

    const catSelect = document.getElementById('category-filter');
    (cats ?? []).forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c.name;
      opt.textContent = `${c.category_number} — ${c.name}`;
      catSelect.appendChild(opt);
    });
}

function populateModalLocationSelect() {
    const sel = document.getElementById('modal-location');
    _profile.locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value       = loc.location_id;
      opt.textContent = loc.location_name;
      sel.appendChild(opt);
    });
}

/* ─────────────────────────────────────────────────────────
     FILTERS & SORT
───────────────────────────────────────────────────────── */
window.applyFilters = function() {
    const search   = document.getElementById('search-filter').value.toLowerCase().trim();
    const location = document.getElementById('location-filter').value;
    const category = document.getElementById('category-filter').value;

    filteredRows = allRows.filter(row => {
      if (location && row.location_name !== location)   return false;
      if (category && row.category_name !== category)   return false;
      if (lowStockOnly && !row.is_low_stock)            return false;
      if (search) {
        const hay = `${row.sku} ${row.product_name} ${row.brand ?? ''} ${row.category_name}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    sortRows();
    currentPage = 1;
    renderTable();
};

window.toggleLowStockFilter = function() {
    lowStockOnly = !lowStockOnly;
    const btn = document.getElementById('low-stock-btn');
    btn.classList.toggle('active', lowStockOnly);
    applyFilters();
};

window.sortBy = function(col) {
    if (sortCol === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortCol = col;
      sortDir = 'asc';
    }
    // Update header classes
    document.querySelectorAll('.inv-table th').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
    });
    const thMap = {
      sku: 'th-sku', product_name: 'th-name',
      category_name: 'th-cat', location_name: 'th-loc', quantity_on_hand: 'th-qty'
    };
    if (thMap[col]) {
      document.getElementById(thMap[col])?.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
    sortRows();
    renderTable();
};

function sortRows() {
    filteredRows.sort((a, b) => {
      let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
}

/* ─────────────────────────────────────────────────────────
     RENDER TABLE
───────────────────────────────────────────────────────── */
function renderTable() {
    const tbody    = document.getElementById('inv-tbody');
    const total    = filteredRows.length;
    const start    = (currentPage - 1) * PAGE_SIZE;
    const end      = Math.min(start + PAGE_SIZE, total);
    const pageRows = filteredRows.slice(start, end);

    document.getElementById('filter-count').textContent =
      `${total.toLocaleString()} item${total !== 1 ? 's' : ''}`;

    if (pageRows.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8" class="table-empty">
          <div class="table-empty-icon">◫</div>
          <div class="table-empty-text">${allRows.length === 0 ? 'No products in database yet — import your catalog first.' : 'No items match the current filters.'}</div>
        </td></tr>`;
      document.getElementById('pagination').style.display = 'none';
      return;
    }

    const isManager = _profile.locations.some(l => ['manager','owner'].includes(l.role));

    tbody.innerHTML = pageRows.map(row => {
      const rowCls = row.is_out_of_stock ? 'out-of-stock' : row.is_low_stock ? 'low-stock' : '';
      const qtyCls = row.is_out_of_stock ? 'out' : row.is_low_stock ? 'low' : 'ok';
      const pill   = row.is_out_of_stock
        ? '<span class="stock-pill out">● Out of Stock</span>'
        : row.is_low_stock
          ? '<span class="stock-pill low">⚠ Low</span>'
          : '<span class="stock-pill ok">● OK</span>';

      return `
        <tr class="${rowCls}" data-product-id="${row.product_id}" data-location-name="${row.location_name}">
          <td class="td-sku">${row.sku}</td>
          <td>
            <div class="td-name">${row.product_name}</div>
            ${row.brand ? `<div class="td-brand">${row.brand}</div>` : ''}
          </td>
          <td style="color:var(--text-muted);font-size:0.78rem;">${row.category_name}</td>
          <td class="td-location">${row.location_name}</td>
          <td class="td-qty ${qtyCls}">${row.quantity_on_hand}</td>
          <td class="reorder-pt">${row.reorder_point}</td>
          <td>${pill}</td>
          <td>
            ${isManager ? `
              <button class="adj-btn"
                onclick="openAdjustModal({
                  productId:'${row.product_id}',
                  locationName:'${row.location_name}',
                  sku:'${row.sku}',
                  name:${JSON.stringify(row.product_name)},
                  qty:${row.quantity_on_hand}
                })">
                Adjust
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    renderPagination(total, start, end);
}

/* ─────────────────────────────────────────────────────────
     PAGINATION
───────────────────────────────────────────────────────── */
function renderPagination(total, start, end) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(total / PAGE_SIZE);

    if (totalPages <= 1) { pagination.style.display = 'none'; return; }
    pagination.style.display = 'flex';

    document.getElementById('page-info').textContent =
      `Showing ${start + 1}–${end} of ${total.toLocaleString()}`;

    const btns = document.getElementById('page-btns');
    btns.innerHTML = '';

    // Prev
    const prev = document.createElement('button');
    prev.className = 'page-btn'; prev.textContent = '←';
    prev.disabled = currentPage === 1;
    prev.onclick = () => { currentPage--; renderTable(); };
    btns.appendChild(prev);

    // Page numbers (show max 7)
    const pages = getPageNumbers(currentPage, totalPages);
    pages.forEach(p => {
      const btn = document.createElement('button');
      if (p === '…') {
        btn.className = 'page-btn'; btn.textContent = '…'; btn.disabled = true;
      } else {
        btn.className = `page-btn${p === currentPage ? ' active' : ''}`;
        btn.textContent = p;
        btn.onclick = () => { currentPage = p; renderTable(); };
      }
      btns.appendChild(btn);
    });

    // Next
    const next = document.createElement('button');
    next.className = 'page-btn'; next.textContent = '→';
    next.disabled = currentPage === totalPages;
    next.onclick = () => { currentPage++; renderTable(); };
    btns.appendChild(next);
}

function getPageNumbers(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4)   return [1, 2, 3, 4, 5, '…', total];
    if (cur >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
    return [1, '…', cur-1, cur, cur+1, '…', total];
}

/* ─────────────────────────────────────────────────────────
     KPI STRIP
───────────────────────────────────────────────────────── */
function updateKpis(rows) {
    // Unique products (by product_id — same product across locations counted once)
    const uniqueProducts = new Set(rows.map(r => r.product_id)).size;
    const totalUnits     = rows.reduce((s, r) => s + (r.quantity_on_hand || 0), 0);
    const lowCount       = rows.filter(r => r.is_low_stock && !r.is_out_of_stock).length;
    const outCount       = rows.filter(r => r.is_out_of_stock).length;

    document.getElementById('kpi-skus').textContent  = uniqueProducts.toLocaleString();
    document.getElementById('kpi-units').textContent = totalUnits.toLocaleString();
    document.getElementById('kpi-low').textContent   = lowCount;
    document.getElementById('kpi-out').textContent   = outCount;

    // Show notif dot if there are low/out-of-stock items
    if (lowCount + outCount > 0) {
      document.getElementById('notif-dot').style.display = '';
    }
}

/* ─────────────────────────────────────────────────────────
     ADJUSTMENT MODAL
───────────────────────────────────────────────────────── */
window.openAdjustModal = function(row) {
    resetAdjModal();
    const overlay = document.getElementById('adj-modal');
    overlay.classList.add('open');

    if (row) {
      // Called from a table row — product is known
      adjProductId  = row.productId;
      adjCurrentQty = row.qty;

      document.getElementById('modal-search-field').style.display  = 'none';
      document.getElementById('modal-product-info').style.display  = '';
      document.getElementById('modal-sku').textContent             = row.sku;
      document.getElementById('modal-name').textContent            = row.name;

      // Pre-select location
      const locSel = document.getElementById('modal-location');
      const locOpt = Array.from(locSel.options).find(o => o.textContent === row.locationName);
      if (locOpt) {
        locSel.value  = locOpt.value;
        adjLocationId = locOpt.value;
      }
      document.getElementById('modal-location-field').style.display = 'none';
      showCurrentQty(adjCurrentQty, row.locationName);

    } else {
      // Generic — show search field
      document.getElementById('modal-search-field').style.display = '';
      document.getElementById('modal-product-info').style.display = 'none';
      setTimeout(() => document.getElementById('modal-product-search').focus(), 100);
    }
};

window.closeAdjustModal = function() {
    document.getElementById('adj-modal').classList.remove('open');
    resetAdjModal();
};

window.handleOverlayClick = function(e) {
    if (e.target === document.getElementById('adj-modal')) closeAdjustModal();
};

function resetAdjModal() {
    adjProductId = null; adjLocationId = null; adjCurrentQty = 0; adjType = 'add';
    document.getElementById('modal-product-search').value = '';
    document.getElementById('modal-search-results').style.display = 'none';
    document.getElementById('modal-qty').value            = '';
    document.getElementById('modal-reason').value         = '';
    document.getElementById('modal-current-qty-display').style.display = 'none';
    document.getElementById('modal-preview').style.display = 'none';
    document.getElementById('modal-location-field').style.display = '';
    document.getElementById('modal-location').value      = '';
    document.getElementById('modal-search-field').style.display  = 'none';
    document.getElementById('modal-product-info').style.display  = 'none';
    // Reset type buttons
    document.querySelectorAll('.adj-type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.adj-type-btn.add').classList.add('active');
    setAdjType('add');
}

/* ── Product search inside modal ── */
window.handleModalProductSearch = function(val) {
    clearTimeout(modalSearchTimer);
    const results = document.getElementById('modal-search-results');
    if (val.trim().length < 2) { results.style.display = 'none'; return; }
    modalSearchTimer = setTimeout(async () => {
      const products = await searchProducts(val);
      if (!products.length) { results.style.display = 'none'; return; }
      results.style.display = '';
      results.innerHTML = products.map(p => `
        <div onclick="selectModalProduct(${JSON.stringify(p).replace(/"/g,'&quot;')})"
             style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);font-size:0.82rem;transition:background 0.15s;"
             onmouseover="this.style.background='var(--surface3)'"
             onmouseout="this.style.background=''">
          <span style="color:var(--gold);font-family:'DM Mono',monospace;font-size:0.72rem;">${p.sku}</span>
          <span style="margin-left:8px;font-weight:500;">${p.name}</span>
          ${p.brand ? `<span style="color:var(--text-muted);font-size:0.72rem;margin-left:6px;">${p.brand}</span>` : ''}
        </div>
      `).join('');
    }, 280);
};

window.selectModalProduct = function(product) {
    adjProductId = product.id;
    document.getElementById('modal-product-search').value          = '';
    document.getElementById('modal-search-results').style.display  = 'none';
    document.getElementById('modal-product-info').style.display    = '';
    document.getElementById('modal-sku').textContent  = product.sku;
    document.getElementById('modal-name').textContent = product.name;
    document.getElementById('modal-loc').textContent  = '';
    loadCurrentQty();
};

/* ── Load qty when product + location are both selected ── */
window.loadCurrentQty = async function() {
    adjLocationId = document.getElementById('modal-location').value;
    if (!adjProductId || !adjLocationId) return;

    const locName = document.getElementById('modal-location').selectedOptions[0]?.textContent ?? '';
    document.getElementById('modal-loc').textContent = locName;

    const { data } = await supabase
      .from('inventory')
      .select('quantity_on_hand')
      .eq('product_id',   adjProductId)
      .eq('location_id',  adjLocationId)
      .single();

    adjCurrentQty = data?.quantity_on_hand ?? 0;
    showCurrentQty(adjCurrentQty, locName);
    updatePreview();
};

function showCurrentQty(qty, locName) {
    document.getElementById('modal-current-qty-display').style.display = '';
    document.getElementById('modal-current-qty').textContent = qty;
    document.getElementById('modal-loc').textContent = locName;
}

/* ── Adjustment type ── */
window.setAdjType = function(type) {
    adjType = type;
    document.querySelectorAll('.adj-type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.adj-type-btn.${type}`).classList.add('active');
    const labels = { add: 'Quantity to Add', remove: 'Quantity to Remove', set: 'Set Stock To' };
    document.getElementById('qty-label').textContent = labels[type];
    updatePreview();
};

window.updatePreview = function() {
    const qty = parseInt(document.getElementById('modal-qty').value, 10);
    if (isNaN(qty) || !adjProductId) {
      document.getElementById('modal-preview').style.display = 'none';
      return;
    }
    let newQty;
    if (adjType === 'add')    newQty = adjCurrentQty + qty;
    if (adjType === 'remove') newQty = Math.max(0, adjCurrentQty - qty);
    if (adjType === 'set')    newQty = qty;

    document.getElementById('modal-preview').style.display    = '';
    document.getElementById('modal-preview-qty').textContent  = Math.max(0, newQty);
};

/* ── Submit adjustment ── */
window.submitAdjustment = async function() {
    if (!adjProductId || !adjLocationId) { showToast('Select a product and location.'); return; }

    const qty    = parseInt(document.getElementById('modal-qty').value, 10);
    const reason = document.getElementById('modal-reason').value.trim();

    if (isNaN(qty) || qty < 0) { showToast('Enter a valid quantity.'); return; }
    if (!reason)               { showToast('Please enter a reason for this adjustment.'); return; }

    const btn = document.getElementById('modal-submit-btn');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    let delta, newQty;
    if (adjType === 'add')    { delta = qty;                               newQty = adjCurrentQty + delta; }
    if (adjType === 'remove') { delta = -qty;                              newQty = Math.max(0, adjCurrentQty - qty); }
    if (adjType === 'set')    { delta = qty - adjCurrentQty;               newQty = qty; }

    // Call the DB function — validates permissions, writes the
    // transaction, and the trigger updates inventory automatically.
    const { data: newActualQty, error } = await supabase.rpc('apply_manual_adjustment', {
      p_product_id:  adjProductId,
      p_location_id: adjLocationId,
      p_delta:       delta,
      p_new_qty:     Math.max(0, newQty),
      p_notes:       reason,
    });

    btn.disabled    = false;
    btn.textContent = 'Save Adjustment';

    if (error) {
      showToast('Error: ' + (error.message ?? 'Adjustment failed.'));
      return;
    }

    showToast(`Stock updated — new qty: ${newActualQty ?? Math.max(0, newQty)}`);
    closeAdjustModal();
    await loadInventory(); // Refresh table
};

/* ─────────────────────────────────────────────────────────
     GLOBAL SEARCH (header)
───────────────────────────────────────────────────────── */
window.handleGlobalSearch = function(val) {
    document.getElementById('search-filter').value = val;
    applyFilters();
};

/* ─────────────────────────────────────────────────────────
     EXPORT CSV
───────────────────────────────────────────────────────── */
window.exportCSV = function() {
    if (!filteredRows.length) { showToast('No data to export.'); return; }
    const headers = ['SKU','Product','Brand','Category','Location','Qty on Hand','Reorder Point','Status'];
    const rows = filteredRows.map(r => [
      r.sku, r.product_name, r.brand ?? '', r.category_name, r.location_name,
      r.quantity_on_hand, r.reorder_point,
      r.is_out_of_stock ? 'Out of Stock' : r.is_low_stock ? 'Low Stock' : 'OK'
    ]);
    const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `pandoras-inventory-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast('Exported ' + filteredRows.length + ' rows.');
};

/* ─────────────────────────────────────────────────────────
     BOOT
───────────────────────────────────────────────────────── */

