/* PAGE: products */
import { requireAuth, getCurrentProfile, supabase, applySidebarRole } from '../supabase.js';

let _profile = null;


const _HTML = `<div class="page-header">
    <div>
      <div class="page-title">Products</div>
      <div class="page-subtitle" id="page-subtitle">PANDORA'S BOX · ALL LOCATIONS</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn btn-secondary" id="bulk-import-btn" onclick="window.location.href='import.html'">
        ⬆ Bulk Import
      </button>
      <button class="btn btn-primary" onclick="openPanel()">
        Add Product
      </button>
    </div>
  </div>

  <div class="accent-line"></div>
  <div style="height:20px;"></div>

  <!-- Filter bar -->
  <div class="filter-bar" style="margin-bottom:20px;">
    <div class="page-search-wrap">
      <span class="page-search-icon">⌕</span>
      <input type="text" id="search-input" placeholder="Search name, SKU, brand…" oninput="applyFilters()">
    </div>

    <select class="filter-select" id="cat-filter" onchange="applyFilters()">
      <option value="">All Categories</option>
    </select>

    <select class="filter-select" id="supplier-filter" onchange="applyFilters()">
      <option value="">All Suppliers</option>
    </select>

    <button class="filter-btn" id="inactive-btn" onclick="toggleInactive()">
      Show Inactive
    </button>

    <div class="filter-spacer"></div>
    <div class="filter-count" id="filter-count">— products</div>
  </div>

  <div class="page-grid" id="page-grid" style="grid-template-columns:1fr;">

    <!-- Product table -->
    <div class="data-table-card">
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th onclick="sortBy('sku')"           id="th-sku">SKU</th>
              <th onclick="sortBy('name')"           id="th-name">Product</th>
              <th onclick="sortBy('category_name')" id="th-cat">Category</th>
              <th>Stock by Location</th>
              <th onclick="sortBy('retail_price')"  id="th-retail" style="text-align:right;">Retail</th>
              <th onclick="sortBy('cost_price')"    id="th-cost"   style="text-align:right;">Cost</th>
              <th>Supplier</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="products-tbody">
            <tr><td colspan="8">
              <div class="state-loading">
                <div class="state-icon">◈</div>
                <div class="state-text">Loading products…</div>
              </div>
            </td></tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination" id="pagination" style="display:none;">
        <span id="page-info">Showing 1–50</span>
        <div class="page-btns" id="page-btns"></div>
      </div>
    </div>

    <!-- Side panel -->
    <div class="side-panel" id="side-panel" style="display:none;">

      <!-- Tabs (Details / Stock / Attributes) -->
      <div class="panel-tabs">
        <div class="panel-tab active" id="tab-details"    onclick="switchTab('details')">Details</div>
        <div class="panel-tab"        id="tab-stock"      onclick="switchTab('stock')">Stock</div>
        <div class="panel-tab"        id="tab-attributes" onclick="switchTab('attributes')">Attributes</div>
      </div>

      <!-- ── TAB: Details ── -->
      <div class="panel-tab-content active" id="content-details">
        <div class="side-panel-body">

          <div class="form-row">
            <div class="form-group">
              <label>Category <span class="required">*</span></label>
              <select class="form-control" id="f-category" onchange="updateSkuPreview()">
                <option value="">Select…</option>
              </select>
              <div class="form-error" id="e-category">Category is required.</div>
            </div>
            <div class="form-group">
              <label>Product # <span class="required">*</span></label>
              <input class="form-control" type="number" id="f-prodnum"
                     placeholder="172" min="1" oninput="updateSkuPreview()">
              <div class="form-error" id="e-prodnum">Required.</div>
            </div>
          </div>

          <!-- SKU preview -->
          <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:0.62rem;color:var(--text-muted);font-family:'DM Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;">SKU Preview</span>
            <span style="font-family:'DM Mono',monospace;font-size:0.9rem;color:var(--gold);" id="sku-preview">—</span>
          </div>

          <div class="form-group">
            <label>Product Name <span class="required">*</span></label>
            <input class="form-control" type="text" id="f-name" placeholder="e.g. Elf Bar BC5000">
            <div class="form-error" id="e-name">Name is required.</div>
          </div>

          <div class="form-group">
            <label>Brand</label>
            <input class="form-control" type="text" id="f-brand" placeholder="e.g. Elf Bar">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Retail Price</label>
              <div class="input-prefix-wrap">
                <span class="input-prefix">$</span>
                <input class="form-control" type="number" id="f-retail"
                       placeholder="18.99" min="0" step="0.01">
              </div>
            </div>
            <div class="form-group">
              <label>Cost Price</label>
              <div class="input-prefix-wrap">
                <span class="input-prefix">$</span>
                <input class="form-control" type="number" id="f-cost"
                       placeholder="9.50" min="0" step="0.01">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Supplier</label>
            <select class="form-control" id="f-supplier">
              <option value="">None / Unknown</option>
            </select>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea class="form-control" id="f-notes" placeholder="Any notes about this product…"></textarea>
          </div>

        </div>
      </div>

      <!-- ── TAB: Stock / Reorder Points ── -->
      <div class="panel-tab-content" id="content-stock">
        <div class="side-panel-body">
          <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
            Set reorder thresholds per location. A low-stock alert fires when quantity on hand drops to or below the reorder point.
          </div>

          <table class="reorder-table" id="reorder-table">
            <thead>
              <tr>
                <th>Location</th>
                <th style="text-align:center;">On Hand</th>
                <th style="text-align:center;">Reorder At</th>
                <th style="text-align:center;">Reorder Qty</th>
              </tr>
            </thead>
            <tbody id="reorder-tbody">
              <tr><td colspan="4" style="color:var(--text-muted);font-size:0.78rem;padding:12px 8px;">
                Save the product first, then set reorder points here.
              </td></tr>
            </tbody>
          </table>

          <div style="margin-top:14px;">
            <button class="btn btn-secondary btn-full btn-sm" id="save-reorder-btn"
                    onclick="saveReorderPoints()" style="display:none;">
              Save Reorder Points
            </button>
          </div>
        </div>
      </div>

      <!-- ── TAB: Attributes ── -->
      <div class="panel-tab-content" id="content-attributes">
        <div class="side-panel-body">
          <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
            Optional fields for category-specific details. Leave blank what doesn't apply.
          </div>

          <div class="attr-grid">
            <div class="form-group" style="margin-bottom:0;">
              <label>Puff Count</label>
              <input class="form-control" type="number" id="a-puff" placeholder="5000">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Nicotine</label>
              <input class="form-control" type="text" id="a-nic" placeholder="5%">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Size (ml)</label>
              <input class="form-control" type="number" id="a-size" placeholder="60">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>VG / PG Ratio</label>
              <input class="form-control" type="text" id="a-vgpg" placeholder="70/30">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Flavor</label>
              <input class="form-control" type="text" id="a-flavor" placeholder="Watermelon Ice">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Variant / Color</label>
              <input class="form-control" type="text" id="a-variant" placeholder="Black">
            </div>
          </div>

          <div class="form-group" style="margin-top:8px;">
            <label>Other (JSON)</label>
            <textarea class="form-control" id="a-other"
                      placeholder='{"resistance":"0.6ohm"}'
                      style="min-height:56px;font-family:&quot;DM Mono&quot;,monospace;font-size:0.8rem;"></textarea>
            <div class="form-hint">Any extra fields as JSON. Leave blank if not needed.</div>
            <div class="form-error" id="e-json">Invalid JSON format.</div>
          </div>

        </div>
      </div>

      <!-- Panel footer -->
      <div class="side-panel-footer">
        <button class="btn btn-ghost" onclick="closePanel()">Cancel</button>
        <button class="btn btn-primary" id="save-btn" onclick="saveProduct()" style="flex:1;">
          Save Product
        </button>
      </div>

      <!-- Danger zone -->
      <div id="danger-zone" style="display:none;padding:0 22px 18px;">
        <div style="font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);font-family:'DM Mono',monospace;margin-bottom:8px;">Danger Zone</div>
        <button class="btn btn-danger btn-full btn-sm" id="deactivate-btn" onclick="toggleActive()"></button>
        <div class="form-hint" style="margin-top:5px;">Inactive products are hidden from employees but preserved in historical records.</div>
      </div>

    </div><!-- /side-panel -->

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

// Inject page-specific styles
function _injectStyle() {
  let el = document.getElementById('page-style-products');
  if (!el) {
    el = document.createElement('style');
    el.id = 'page-style-products';
    document.head.appendChild(el);
  }
  el.textContent = `/* Products-specific overrides */
    .data-table { min-width: 860px; }

    .product-sku {
      font-family: 'DM Mono', monospace;
      font-size: 0.74rem;
      color: var(--gold);
    }

    .stock-mini {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .stock-loc {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 4px 8px;
      min-width: 52px;
    }

    .stock-loc-name {
      font-size: 0.58rem;
      color: var(--text-muted);
      font-family: 'DM Mono', monospace;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .stock-loc-qty {
      font-family: 'DM Mono', monospace;
      font-size: 0.88rem;
      font-weight: 500;
      line-height: 1.2;
    }

    .stock-loc-qty.low { color: var(--crimson); }
    .stock-loc-qty.ok  { color: var(--text); }
    .stock-loc-qty.out { color: var(--crimson); opacity: 0.5; }

    /* Attribute chips in panel */
    .attr-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }

    .attr-chip {
      background: var(--surface3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 8px 10px;
      font-size: 0.75rem;
    }

    .attr-chip-label {
      font-size: 0.6rem;
      color: var(--text-muted);
      font-family: 'DM Mono', monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    /* Reorder points table inside panel */
    .reorder-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }

    .reorder-table th {
      font-size: 0.6rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-family: 'DM Mono', monospace;
      padding: 5px 8px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .reorder-table td {
      padding: 6px 8px;
      border-bottom: 1px solid var(--border);
      font-size: 0.8rem;
    }

    .reorder-table tr:last-child td { border-bottom: none; }

    .reorder-input {
      width: 64px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 4px 7px;
      color: var(--text);
      font-family: 'DM Mono', monospace;
      font-size: 0.82rem;
      text-align: center;
      outline: none;
      transition: border-color var(--transition);
    }

    .reorder-input:focus { border-color: var(--gold); }

    /* Panel tabs */
    .panel-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      background: var(--surface2);
    }

    .panel-tab {
      flex: 1;
      padding: 10px;
      text-align: center;
      font-size: 0.72rem;
      font-family: 'DM Mono', monospace;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: var(--transition);
    }

    .panel-tab.active {
      color: var(--gold);
      border-bottom-color: var(--gold);
      background: var(--surface);
    }

    .panel-tab-content { display: none; }
    .panel-tab-content.active { display: block; }`;
}

export async function init(profile) {
  _profile = profile;
  document.getElementById('outlet').innerHTML = _HTML;
  _injectStyle();
  await _run(profile);
}

/* ── State ── */
let allProducts   = [];
let filtered      = [];
let categories    = [];
let suppliers     = [];
let locations     = [];
let editingId     = null;
let showInactive  = false;
let sortCol       = 'name';
let sortDir       = 'asc';
let currentPage   = 1;
const PAGE_SIZE   = 50;
let activeTab     = 'details';

/* ── Init ── */
async function _run(profile) {
    const _subEl = document.getElementById('page-subtitle');
    if (_subEl) _subEl.textContent = "PANDORA'S BOX · " + (_profile.locations.length === 1 ? _profile.locations[0].location_name.toUpperCase() : 'ALL LOCATIONS');
    const _roleArr = _profile.locations.map(l => l.role);
    const _role = _roleArr.includes('owner') ? 'owner' : _roleArr.includes('manager') ? 'manager' : _roleArr.includes('employee') ? 'employee' : 'employee';

    // Role-based: hide Bulk Import from managers (owner only)
    if (_role !== 'owner') {
      const importBtn = document.getElementById('bulk-import-btn');
      if (importBtn) importBtn.style.display = 'none';
    }

    await Promise.all([loadLookups(), loadProducts()]);
    populateFilterDropdowns();
}

/* ── Load lookups ── */
async function loadLookups() {
    const [catRes, supRes, locRes] = await Promise.all([
      supabase.from('categories').select('id,category_number,name').is('deleted_at',null).order('category_number'),
      supabase.from('suppliers').select('id,name').is('deleted_at',null).order('name'),
      supabase.from('locations').select('id,name').eq('is_active',true).order('name'),
    ]);
    categories = catRes.data ?? [];
    suppliers  = supRes.data ?? [];
    locations  = locRes.data ?? [];

    // Populate panel selects
    const catSel = document.getElementById('f-category');
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.category_number} — ${c.name}`;
      catSel.appendChild(opt);
    });

    const supSel = document.getElementById('f-supplier');
    suppliers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      supSel.appendChild(opt);
    });
}

/* ── Load products (with inventory + category + supplier) ── */
async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, product_number, name, brand,
        retail_price, cost_price, is_active, notes,
        attributes,
        categories ( id, category_number, name ),
        suppliers  ( id, name ),
        inventory  ( location_id, quantity_on_hand, reorder_point, reorder_quantity,
                     locations ( name ) )
      `)
      .order('name');

    if (error) { showToast('Failed to load: ' + error.message); return; }

    // Flatten to a usable shape
    allProducts = (data ?? []).map(p => ({
      ...p,
      sku:            `${p.categories?.category_number}/${p.product_number}`,
      category_name:  p.categories?.name ?? '—',
      category_number: p.categories?.category_number,
      supplier_name:  p.suppliers?.name ?? null,
    }));

    applyFilters();
}

/* ── Populate filter dropdowns ── */
function populateFilterDropdowns() {
    const catSel = document.getElementById('cat-filter');
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.category_number} — ${c.name}`;
      catSel.appendChild(opt);
    });

    const supSel = document.getElementById('supplier-filter');
    suppliers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      supSel.appendChild(opt);
    });
}

/* ── Filter & sort ── */
window.applyFilters = function () {
    const q      = document.getElementById('search-input').value.toLowerCase().trim();
    const cat    = document.getElementById('cat-filter').value;
    const sup    = document.getElementById('supplier-filter').value;

    filtered = allProducts.filter(p => {
      if (!showInactive && !p.is_active) return false;
      if (cat && p.category_name !== cat)       return false;
      if (sup && p.supplier_name !== sup)       return false;
      if (q) {
        const hay = `${p.sku} ${p.name} ${p.brand ?? ''} ${p.category_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    sortRows();
    currentPage = 1;
    renderTable();
};

window.toggleInactive = function () {
    showInactive = !showInactive;
    document.getElementById('inactive-btn').classList.toggle('active', showInactive);
    applyFilters();
};

window.sortBy = function (col) {
    sortDir = sortCol === col ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    sortCol = col;
    document.querySelectorAll('.data-table th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
    const thMap = { sku:'th-sku', name:'th-name', category_name:'th-cat', retail_price:'th-retail', cost_price:'th-cost' };
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

/* ── Render table ── */
function renderTable() {
    const tbody  = document.getElementById('products-tbody');
    const total  = filtered.length;
    const start  = (currentPage - 1) * PAGE_SIZE;
    const end    = Math.min(start + PAGE_SIZE, total);
    const rows   = filtered.slice(start, end);

    document.getElementById('filter-count').textContent =
      `${total.toLocaleString()} product${total !== 1 ? 's' : ''}`;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8">
        <div class="state-empty">
          <div class="state-icon">◈</div>
          <div class="state-text">${allProducts.length === 0
            ? 'No products yet.\nUse Bulk Import or Add Product to get started.'
            : 'No products match your filters.'}</div>
        </div>
      </td></tr>`;
      document.getElementById('pagination').style.display = 'none';
      return;
    }

    tbody.innerHTML = rows.map(p => {
      // Build per-location stock mini-display
      const stockHtml = locations.map(loc => {
        const inv = (p.inventory ?? []).find(i => i.locations?.name === loc.name);
        const qty = inv?.quantity_on_hand ?? 0;
        const qtyClass = qty === 0 ? 'out' : qty <= (inv?.reorder_point ?? 5) ? 'low' : 'ok';
        return `
          <div class="stock-loc">
            <span class="stock-loc-name">${loc.name.slice(0,3)}</span>
            <span class="stock-loc-qty ${qtyClass}">${qty}</span>
          </div>`;
      }).join('');

      return `
        <tr class="${p.is_active ? '' : 'inactive'}">
          <td class="product-sku">${p.sku}</td>
          <td>
            <div style="font-weight:500;">${p.name}</div>
            ${p.brand ? `<div style="font-size:0.7rem;color:var(--text-muted);">${p.brand}</div>` : ''}
            ${!p.is_active ? '<span class="tag tag-inactive" style="margin-top:3px;">Inactive</span>' : ''}
          </td>
          <td style="color:var(--text-muted);font-size:0.78rem;">${p.category_name}</td>
          <td><div class="stock-mini">${stockHtml}</div></td>
          <td style="text-align:right;font-family:'DM Mono',monospace;font-size:0.8rem;">
            ${p.retail_price != null ? '$' + parseFloat(p.retail_price).toFixed(2) : '—'}
          </td>
          <td style="text-align:right;font-family:'DM Mono',monospace;font-size:0.8rem;color:var(--text-muted);">
            ${p.cost_price != null ? '$' + parseFloat(p.cost_price).toFixed(2) : '—'}
          </td>
          <td style="font-size:0.78rem;color:var(--text-muted);">${p.supplier_name || '—'}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button>
              <button class="btn btn-ghost btn-sm"
                style="color:${p.is_active ? 'var(--crimson)' : 'var(--sage)'};border-color:${p.is_active ? 'var(--crimson)' : 'var(--sage)'};"
                onclick="quickToggleActive('${p.id}', ${p.is_active})"
                title="${p.is_active ? 'Deactivate' : 'Reactivate'} product">
                ${p.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    renderPagination(total, start, end);
}

/* ── Pagination ── */
function renderPagination(total, start, end) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const pg = document.getElementById('pagination');
    if (totalPages <= 1) { pg.style.display = 'none'; return; }
    pg.style.display = 'flex';
    document.getElementById('page-info').textContent = `Showing ${start+1}–${end} of ${total}`;

    const btns = document.getElementById('page-btns');
    btns.innerHTML = '';
    const prev = document.createElement('button');
    prev.className = 'page-btn'; prev.textContent = '←'; prev.disabled = currentPage === 1;
    prev.onclick = () => { currentPage--; renderTable(); };
    btns.appendChild(prev);

    const pages = currentPage <= 4 ? [1,2,3,4,5,'…',totalPages]
      : currentPage >= totalPages-3 ? [1,'…',totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages]
      : [1,'…',currentPage-1,currentPage,currentPage+1,'…',totalPages];

    pages.filter((v,i,a) => a.indexOf(v)===i).forEach(p => {
      const btn = document.createElement('button');
      btn.className = `page-btn${p === currentPage ? ' active' : ''}`;
      btn.textContent = p; btn.disabled = p === '…';
      if (p !== '…') btn.onclick = () => { currentPage = p; renderTable(); };
      btns.appendChild(btn);
    });

    const next = document.createElement('button');
    next.className = 'page-btn'; next.textContent = '→'; next.disabled = currentPage === totalPages;
    next.onclick = () => { currentPage++; renderTable(); };
    btns.appendChild(next);
}

/* ── Panel: open/close/tabs ── */
window.openPanel = function (product = null) {
    editingId = product?.id ?? null;
    clearForm();
    switchTab('details');

    document.getElementById('panel-title') &&
      (document.getElementById('panel-title').textContent =
        product ? 'Edit Product' : 'Add Product');

    document.getElementById('save-btn').textContent =
      product ? 'Update Product' : 'Save Product';

    document.getElementById('danger-zone').style.display =
      product ? '' : 'none';

    if (product) {
      populateForm(product);
      loadReorderRows(product);
    } else {
      document.getElementById('reorder-tbody').innerHTML =
        '<tr><td colspan="4" style="color:var(--text-muted);font-size:0.78rem;padding:12px 8px;">Save the product first, then set reorder points here.</td></tr>';
      document.getElementById('save-reorder-btn').style.display = 'none';
    }

    document.getElementById('side-panel').style.display = '';
    document.getElementById('page-grid').style.gridTemplateColumns = '1fr 380px';
    setTimeout(() => document.getElementById('f-name').focus(), 80);
};

window.closePanel = function () {
    document.getElementById('side-panel').style.display = 'none';
    document.getElementById('page-grid').style.gridTemplateColumns = '1fr';
    editingId = null;
};

window.editProduct = function (id) {
    const p = allProducts.find(p => p.id === id);
    if (p) openPanel(p);
};

window.switchTab = function (tab) {
    activeTab = tab;
    ['details','stock','attributes'].forEach(t => {
      document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
      document.getElementById(`content-${t}`).classList.toggle('active', t === tab);
    });
};

window.updateSkuPreview = function () {
    const catEl  = document.getElementById('f-category');
    const prodEl = document.getElementById('f-prodnum');
    const catOpt = catEl.selectedOptions[0];
    const catNum = catOpt ? categories.find(c => c.id === catOpt.value)?.category_number : null;
    const prodNum = prodEl.value.trim();
    document.getElementById('sku-preview').textContent =
      catNum && prodNum ? `${catNum}/${prodNum}` : '—';
};

/* ── Form population ── */
function clearForm() {
    ['f-name','f-brand','f-retail','f-cost','f-notes',
     'a-puff','a-nic','a-size','a-vgpg','a-flavor','a-variant','a-other']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('f-category').value = '';
    document.getElementById('f-supplier').value = '';
    document.getElementById('f-prodnum').value  = '';
    document.getElementById('sku-preview').textContent = '—';
    document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
    document.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
}

function populateForm(p) {
    document.getElementById('f-category').value = p.categories?.id ?? '';
    document.getElementById('f-prodnum').value  = p.product_number ?? '';
    document.getElementById('f-name').value     = p.name           ?? '';
    document.getElementById('f-brand').value    = p.brand          ?? '';
    document.getElementById('f-retail').value   = p.retail_price   ?? '';
    document.getElementById('f-cost').value     = p.cost_price     ?? '';
    document.getElementById('f-supplier').value = p.suppliers?.id  ?? '';
    document.getElementById('f-notes').value    = p.notes          ?? '';

    // Attributes
    const attrs = p.attributes ?? {};
    document.getElementById('a-puff').value    = attrs.puff_count ?? '';
    document.getElementById('a-nic').value     = attrs.nicotine   ?? '';
    document.getElementById('a-size').value    = attrs.size_ml    ?? '';
    document.getElementById('a-vgpg').value    = attrs.vg_pg      ?? '';
    document.getElementById('a-flavor').value  = attrs.flavor     ?? '';
    document.getElementById('a-variant').value = attrs.variant    ?? '';

    // Remaining JSON (strip known keys)
    const known = ['puff_count','nicotine','size_ml','vg_pg','flavor','variant'];
    const other = Object.fromEntries(Object.entries(attrs).filter(([k]) => !known.includes(k)));
    document.getElementById('a-other').value = Object.keys(other).length ? JSON.stringify(other, null, 2) : '';

    // Deactivate button label
    const btn = document.getElementById('deactivate-btn');
    btn.textContent = p.is_active ? 'Deactivate Product' : 'Reactivate Product';
    btn.className   = p.is_active ? 'btn btn-danger btn-full btn-sm' : 'btn btn-secondary btn-full btn-sm';

    updateSkuPreview();
}

/* ── Reorder rows ── */
async function loadReorderRows(product) {
    document.getElementById('save-reorder-btn').style.display = '';
    const tbody = document.getElementById('reorder-tbody');

    tbody.innerHTML = locations.map(loc => {
      const inv = (product.inventory ?? []).find(i => i.locations?.name === loc.name);
      return `
        <tr>
          <td style="font-weight:500;">${loc.name}</td>
          <td style="text-align:center;font-family:'DM Mono',monospace;">${inv?.quantity_on_hand ?? 0}</td>
          <td style="text-align:center;">
            <input class="reorder-input" type="number" min="0"
                   data-loc="${loc.id}" data-field="reorder_point"
                   value="${inv?.reorder_point ?? 5}" placeholder="5">
          </td>
          <td style="text-align:center;">
            <input class="reorder-input" type="number" min="0"
                   data-loc="${loc.id}" data-field="reorder_quantity"
                   value="${inv?.reorder_quantity ?? 20}" placeholder="20">
          </td>
        </tr>`;
    }).join('');
}

window.saveReorderPoints = async function () {
    if (!editingId) return;
    const inputs = document.querySelectorAll('#reorder-tbody .reorder-input');
    const updates = {};

    inputs.forEach(input => {
      const loc   = input.dataset.loc;
      const field = input.dataset.field;
      if (!updates[loc]) updates[loc] = {};
      updates[loc][field] = parseInt(input.value, 10) || 0;
    });

    const btn = document.getElementById('save-reorder-btn');
    btn.disabled = true; btn.textContent = 'Saving…';

    for (const [locationId, vals] of Object.entries(updates)) {
      await supabase.rpc('upsert_reorder_point', {
        p_product_id:    editingId,
        p_location_id:   locationId,
        p_reorder_point: vals.reorder_point  ?? 5,
        p_reorder_qty:   vals.reorder_quantity ?? 20,
      });
    }

    btn.disabled = false; btn.textContent = 'Save Reorder Points';
    showToast('Reorder points updated.');
    await loadProducts();
};

/* ── Save product ── */
window.saveProduct = async function () {
    // Validate required fields
    const errors = [];
    const catId   = document.getElementById('f-category').value;
    const prodNum = parseInt(document.getElementById('f-prodnum').value, 10);
    const name    = document.getElementById('f-name').value.trim();

    if (!catId)         { errors.push(['f-category','e-category']); }
    if (isNaN(prodNum)) { errors.push(['f-prodnum','e-prodnum']);   }
    if (!name)          { errors.push(['f-name','e-name']);         }

    errors.forEach(([fieldId, errId]) => {
      document.getElementById(fieldId).classList.add('error');
      document.getElementById(errId).classList.add('visible');
    });
    if (errors.length) { switchTab('details'); return; }

    // Clear error states
    ['f-category','f-prodnum','f-name'].forEach(id =>
      document.getElementById(id).classList.remove('error'));
    ['e-category','e-prodnum','e-name'].forEach(id =>
      document.getElementById(id).classList.remove('visible'));

    // Build attributes object
    let attrs = {};
    const puff    = document.getElementById('a-puff').value.trim();
    const nic     = document.getElementById('a-nic').value.trim();
    const size    = document.getElementById('a-size').value.trim();
    const vgpg    = document.getElementById('a-vgpg').value.trim();
    const flavor  = document.getElementById('a-flavor').value.trim();
    const variant = document.getElementById('a-variant').value.trim();
    const otherRaw = document.getElementById('a-other').value.trim();

    if (puff)    attrs.puff_count = parseInt(puff, 10);
    if (nic)     attrs.nicotine   = nic;
    if (size)    attrs.size_ml    = parseFloat(size);
    if (vgpg)    attrs.vg_pg      = vgpg;
    if (flavor)  attrs.flavor     = flavor;
    if (variant) attrs.variant    = variant;

    if (otherRaw) {
      try {
        const extra = JSON.parse(otherRaw);
        attrs = { ...attrs, ...extra };
      } catch {
        document.getElementById('e-json').classList.add('visible');
        switchTab('attributes');
        return;
      }
    }
    document.getElementById('e-json').classList.remove('visible');

    const supId = document.getElementById('f-supplier').value || null;
    const retail = parseFloat(document.getElementById('f-retail').value) || null;
    const cost   = parseFloat(document.getElementById('f-cost').value)   || null;

    const payload = {
      category_id:    catId,
      product_number: prodNum,
      name,
      brand:        document.getElementById('f-brand').value.trim() || null,
      retail_price: retail,
      cost_price:   cost,
      supplier_id:  supId,
      notes:        document.getElementById('f-notes').value.trim() || null,
      attributes:   attrs,
      is_active:    true,
    };

    const btn = document.getElementById('save-btn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const { error } = await supabase.rpc('upsert_product', {
      p_id:             editingId ?? null,
      p_category_id:    payload.category_id,
      p_product_number: payload.product_number,
      p_name:           payload.name,
      p_brand:          payload.brand,
      p_retail_price:   payload.retail_price,
      p_cost_price:     payload.cost_price,
      p_supplier_id:    payload.supplier_id,
      p_notes:          payload.notes,
      p_attributes:     payload.attributes,
      p_is_active:      payload.is_active,
    });

    btn.disabled = false;
    btn.textContent = editingId ? 'Update Product' : 'Save Product';

    if (error) {
      showToast('Save failed: ' + (error.message.includes('unique') ? 'SKU already exists.' : error.message));
      return;
    }

    showToast(editingId ? `${name} updated.` : `${name} added.`);
    closePanel();
    await loadProducts();
};

/* ── Toggle active/inactive ── */
window.toggleActive = function () {
    const p = allProducts.find(p => p.id === editingId);
    if (!p) return;
    const newState = !p.is_active;
    showConfirm(
      newState ? `Reactivate ${p.name}?` : `Deactivate ${p.name}?`,
      newState
        ? 'This product will reappear in active listings and the nightly totals form.'
        : 'This product will be hidden from employees. Historical records are preserved.',
      async () => {
        const { error } = await supabase.rpc('set_product_active', {
          p_id:        editingId,
          p_is_active: newState,
        });
        if (error) { showToast('Failed: ' + error.message); return; }
        showToast(newState ? `${p.name} reactivated.` : `${p.name} deactivated.`);
        closePanel();
        await loadProducts();
      }
    );
};

/* ── Quick toggle from table row (no panel needed) ── */
window.quickToggleActive = function (id, currentlyActive) {
    const p = allProducts.find(p => p.id === id);
    if (!p) return;
    const newState = !currentlyActive;
    showConfirm(
      newState ? `Reactivate ${p.name}?` : `Deactivate ${p.name}?`,
      newState
        ? 'This product will reappear in active listings and the nightly totals form.'
        : 'This product will be hidden from employees. Historical records are preserved.',
      async () => {
        const { error } = await supabase.rpc('set_product_active', {
          p_id:        id,
          p_is_active: newState,
        });
        if (error) { showToast('Failed: ' + error.message); return; }
        showToast(newState ? `${p.name} reactivated.` : `${p.name} deactivated.`);
        await loadProducts();
      }
    );
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

