/* PAGE: nightly */
import {
    requireAuth,
    getCurrentProfile,
    signOut,
    lookupSku,
    getOrCreateTodaySubmission,
    getSubmissionItems,
    upsertSubmissionItem,
    updateSalesTotal,
    submitNightly,
    approveNightly,
    rejectNightly, applySidebarRole } from '../supabase.js';


const _HTML = `<!-- Page Header -->
  <div class="page-header">
    <div>
      <div class="page-title">Nightly Totals</div>
      <div class="page-subtitle" id="page-subtitle">Loading…</div>
    </div>

    <!-- Location selector (owners/managers with multiple locations) -->
    <div id="location-row" style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:0.72rem;color:var(--text-muted);font-family:'DM Mono',monospace;letter-spacing:0.08em;">LOCATION</span>
      <select class="location-select" id="location-select" onchange="handleLocationChange(this.value)">
        <option value="">Loading…</option>
      </select>
    </div>
  </div>

  <div class="accent-line"></div>
  <div style="height:20px;"></div>

  <!-- Submission Status Banner -->
  <div style="margin-bottom:8px;font-size:0.7rem;color:var(--text-muted);font-family:'DM Mono',monospace;">
    STATUS GUIDE: <span style="color:var(--gold);">Open</span> = being entered &nbsp;·&nbsp;
    <span style="color:var(--blue);">Submitted</span> = awaiting manager approval &nbsp;·&nbsp;
    <span style="color:var(--sage);">Approved</span> = inventory updated &nbsp;·&nbsp;
    <span style="color:var(--crimson);">Returned</span> = needs correction
  </div>
  <div class="submission-status-bar open" id="status-bar">
    <div class="status-badge-label">
      <div class="status-dot open" id="status-dot"></div>
      <span id="status-text">Open — in progress</span>
    </div>
    <span style="font-size:0.75rem;color:var(--text-muted);" id="status-meta"></span>
  </div>

  <!-- Main Grid -->
  <div class="nightly-grid">

    <!-- Left: Entry + Table -->
    <div>

      <!-- SKU Entry Form -->
      <div class="sku-entry-card" id="entry-form-card">
        <div class="card-header">
          <div class="card-title">Add Item</div>
          <div style="font-size:0.75rem;color:var(--text-muted);font-family:'DM Mono',monospace;">
            Enter SKU as <span style="color:var(--gold);">category/product</span> — e.g. 10/172
          </div>
        </div>
        <div class="sku-entry-form">

          <!-- SKU Input -->
          <div class="form-field">
            <label class="form-label">SKU</label>
            <input
              class="form-input"
              type="text"
              id="sku-input"
              placeholder="10/172"
              maxlength="10"
              autocomplete="off"
              oninput="handleSkuInput(this.value)"
              onkeydown="handleSkuKeydown(event)"
            >
          </div>

          <!-- Quantity Input -->
          <div class="form-field">
            <label class="form-label">Qty Sold</label>
            <input
              class="form-input"
              type="number"
              id="qty-input"
              placeholder="0"
              min="1"
              max="9999"
              onkeydown="handleQtyKeydown(event)"
            >
          </div>

          <!-- Resolved Product Preview -->
          <div class="form-field">
            <label class="form-label">Product</label>
            <div class="sku-preview" id="sku-preview">
              <span style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;">Type a SKU to look up</span>
            </div>
          </div>

          <!-- Add Button -->
          <div class="form-field" style="justify-content:flex-end;">
            <button class="add-btn" id="add-btn" onclick="handleAddItem()" disabled>
              + Add
            </button>
          </div>

        </div>
      </div>

      <!-- Line Items Table -->
      <div class="items-table-card">
        <div class="card-header">
          <div class="card-title">Items Sold Today</div>
          <div style="font-size:0.75rem;color:var(--text-muted);font-family:'DM Mono',monospace;" id="item-count">0 items</div>
        </div>

        <div id="items-container">
          <!-- Populated by JS -->
          <div class="empty-state" id="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-text">No items added yet.<br>Enter a SKU above to get started.</div>
          </div>

          <table class="items-table" id="items-table" style="display:none;">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th style="text-align:center;">Qty</th>
                <th>Unit Price</th>
                <th style="text-align:right;">Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="items-tbody"></tbody>
          </table>
        </div>
      </div>

    </div><!-- /left column -->

    <!-- Right: Summary + Submit -->
    <div>
      <div class="summary-card">
        <div class="card-header">
          <div class="card-title">Summary</div>
        </div>
        <div class="summary-body">

          <div class="summary-row">
            <span class="summary-label">Total SKUs</span>
            <span class="summary-value" id="sum-skus">0</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Units Sold</span>
            <span class="summary-value" id="sum-units">0</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Retail Value (est.)</span>
            <span class="summary-value" id="sum-retail">$0.00</span>
          </div>

          <div class="summary-total-row">
            <span class="summary-total-label">Estimated Total Sales</span>
            <span class="summary-total-value" id="sum-total-display">$0.00</span>
          </div>

          <!-- Employee enters actual cash+card total -->
          <div class="sales-total-field">
            <label class="sales-total-label">Actual Sales Total (cash + card)</label>
            <div class="sales-total-wrap">
              <span class="currency-prefix">$</span>
              <input
                class="sales-total-input"
                type="number"
                id="sales-total-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                oninput="updateTotalDisplay(this.value)"
              >
            </div>
          </div>

          <!-- Submit button (employees) -->
          <button class="submit-btn" id="submit-btn" onclick="handleSubmit()" disabled>
            Submit for Review
          </button>

          <!-- Approve / Reject (managers only, shown when status = submitted) -->
          <div class="approval-actions" id="approval-actions" style="display:none;">
            <button class="approve-btn" onclick="handleApprove()">✓ Approve</button>
            <button class="reject-btn" onclick="handleReject()">✕ Return</button>
          </div>

          <div style="margin-top:12px;font-size:0.7rem;color:var(--text-muted);font-family:'DM Mono',monospace;line-height:1.6;" id="submit-note">
            Submitting will lock this entry and send it to a manager for approval before inventory is updated.
          </div>

        </div>
      </div>
    </div><!-- /right column -->

  </div><!-- /nightly-grid -->
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

/* ── State ─────────────────────────────────────────────── */
let currentLocation = null;   // { location_id, location_name, role }
let submission     = null;    // current nightly_submissions row
let items          = [];      // [{ product, quantity_sold, retail_price }]
let resolvedProduct = null;   // product returned from SKU lookup
let skuLookupTimer = null;

/* ── Init ──────────────────────────────────────────────── */
async function _run(profile) {

    // Populate header

    // Populate location selector - employees only see their assigned locations
    const select = document.getElementById('location-select');
    select.innerHTML = '';
    _profile.locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.location_id;
      opt.textContent = loc.location_name;
      select.appendChild(opt);
    });

    // Hide location selector for employees with only one location
    if (_profile.locations.length <= 1) {
      const locRow = document.getElementById('location-row');
      if (locRow) locRow.style.display = 'none';
    }

    // Default to first location
    currentLocation = _profile.locations[0];
    const _rArr = _profile.locations.map(l => l.role);
    const role = _rArr.includes('owner') ? 'owner' : _rArr.includes('manager') ? 'manager' : 'employee';
    const roleEl = document.getElementById('user-role');
    roleEl.textContent = role;
    roleEl.className = 'urole role-' + role;

    await loadSubmission();
}

/* ── Load / reload submission for selected location ─────── */
async function loadSubmission() {
    if (!currentLocation) return;

    // Start live clock in subtitle
    function updateNightlyClock() {
      const now  = new Date();
      const date = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).toUpperCase();
      const time = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
      const loc  = currentLocation?.location_name?.toUpperCase() ?? 'ALL LOCATIONS';
      document.getElementById('page-subtitle').textContent = `${date} · ${time} · ${loc}`;
    }
    updateNightlyClock();
    if (!window._nightlyClockInterval) {
      window._nightlyClockInterval = setInterval(updateNightlyClock, 1000);
    }

    submission = await getOrCreateTodaySubmission(currentLocation.location_id);
    if (!submission) { showToast('Failed to load submission. Check connection.'); return; }

    const rawItems = await getSubmissionItems(submission.id);

    // Map to our local shape
    items = rawItems.map(row => ({
      submissionItemId: row.id,
      productId:   row.products.id,
      sku:         row.products.categories.category_number + '/' + row.products.product_number,
      name:        row.products.name,
      brand:       row.products.brand,
      qty:         row.quantity_sold,
      retailPrice: row.retail_price ?? 0,
    }));

    // Restore sales total
    if (submission.sales_total) {
      document.getElementById('sales-total-input').value = submission.sales_total;
      updateTotalDisplay(submission.sales_total);
    }

    renderStatus(submission.status, submission);
    renderItems();
}

/* ── Location change ───────────────────────────────────── */
window.handleLocationChange = async function(locationId) {
    currentLocation = _profile.locations.find(l => l.location_id === locationId);
    document.getElementById('user-role').textContent = currentLocation?.role ?? '—';
    items = [];
    submission = null;
    resolvedProduct = null;
    clearSkuEntry();
    await loadSubmission();
};

/* ── SKU Lookup ────────────────────────────────────────── */
window.handleSkuInput = function(val) {
    resolvedProduct = null;
    document.getElementById('add-btn').disabled = true;

    const preview = document.getElementById('sku-preview');
    preview.className = 'sku-preview';
    preview.innerHTML = '<span style="color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">Type a SKU to look up</span>';

    clearTimeout(skuLookupTimer);

    // Only look up once format matches  ##/###
    if (!/^\d+\/\d+$/.test(val.trim())) return;

    skuLookupTimer = setTimeout(() => doSkuLookup(val.trim()), 300);
};

async function doSkuLookup(sku) {
    const preview = document.getElementById('sku-preview');
    preview.innerHTML = '<span style="color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">Looking up…</span>';

    const product = await lookupSku(sku);

    if (!product) {
      preview.className = 'sku-preview not-found';
      preview.innerHTML = `<span style="color:var(--crimson);font-family:'DM Mono',monospace;font-size:0.78rem;">SKU not found — ${sku}</span>`;
      resolvedProduct = null;
      document.getElementById('add-btn').disabled = true;
      return;
    }

    resolvedProduct = product;
    preview.className = 'sku-preview resolved';
    preview.innerHTML = `
      <div style="flex:1;">
        <div class="sku-preview-name">${product.name}</div>
        <div class="sku-preview-cat">${product.category_name}${product.brand ? ' · ' + product.brand : ''} · $${parseFloat(product.retail_price || 0).toFixed(2)}</div>
      </div>
    `;

    document.getElementById('add-btn').disabled = false;
    document.getElementById('qty-input').focus();
}

window.handleSkuKeydown = function(e) {
    if (e.key === 'Enter') document.getElementById('qty-input').focus();
};

window.handleQtyKeydown = function(e) {
    if (e.key === 'Enter') handleAddItem();
};

/* ── Add Item ──────────────────────────────────────────── */
window.handleAddItem = async function() {
    if (!resolvedProduct || !submission) return;
    if (submission.status !== 'open') { showToast('This submission is locked.'); return; }

    const qtyInput = document.getElementById('qty-input');
    const qty = parseInt(qtyInput.value, 10);
    if (!qty || qty < 1) { showToast('Enter a quantity greater than 0.'); qtyInput.focus(); return; }

    const existingIdx = items.findIndex(i => i.productId === resolvedProduct.id);

    if (existingIdx >= 0) {
      // Update existing
      items[existingIdx].qty += qty;
      await upsertSubmissionItem(submission.id, resolvedProduct.id, items[existingIdx].qty, resolvedProduct.retail_price);
    } else {
      // Add new
      const newItem = {
        productId:   resolvedProduct.id,
        sku:         resolvedProduct.sku,
        name:        resolvedProduct.name,
        brand:       resolvedProduct.brand,
        qty,
        retailPrice: resolvedProduct.retail_price ?? 0,
      };
      items.push(newItem);
      await upsertSubmissionItem(submission.id, resolvedProduct.id, qty, resolvedProduct.retail_price);
    }

    showToast(`Added ${qty}× ${resolvedProduct.name}`);
    clearSkuEntry();
    renderItems();
    updateSummary();
    document.getElementById('sku-input').focus();
};

/* ── Remove Item ───────────────────────────────────────── */
window.removeItem = async function(productId) {
    if (submission.status !== 'open') return;
    items = items.filter(i => i.productId !== productId);
    await upsertSubmissionItem(submission.id, productId, 0, 0);
    renderItems();
    updateSummary();
};

/* ── Update qty inline ─────────────────────────────────── */
window.updateItemQty = async function(productId, newQty) {
    const idx = items.findIndex(i => i.productId === productId);
    if (idx < 0) return;

    const qty = parseInt(newQty, 10);
    if (!qty || qty < 1) return;

    items[idx].qty = qty;
    await upsertSubmissionItem(submission.id, productId, qty, items[idx].retailPrice);
    updateSummary();
};

/* ── Submit ────────────────────────────────────────────── */
window.handleSubmit = async function() {
    if (!submission || items.length === 0) {
      showToast('Add at least one item before submitting.');
      return;
    }

    const salesTotal = parseFloat(document.getElementById('sales-total-input').value) || 0;
    if (salesTotal <= 0) {
      showToast('Enter the actual sales total before submitting.');
      document.getElementById('sales-total-input').focus();
      return;
    }

    document.getElementById('submit-btn').disabled = true;
    document.getElementById('submit-btn').textContent = 'Submitting…';

    const ok = await submitNightly(submission.id, salesTotal);

    if (ok) {
      submission.status = 'submitted';
      submission.sales_total = salesTotal;
      renderStatus('submitted', submission);
      showToast('Submitted! Awaiting manager approval.', 3500);
    } else {
      showToast('Submission failed. Please try again.');
      document.getElementById('submit-btn').disabled = false;
      document.getElementById('submit-btn').textContent = 'Submit for Review';
    }
};

/* ── Approve (managers) ────────────────────────────────── */
window.handleApprove = async function() {
    const ok = await approveNightly(submission.id);
    if (ok) {
      submission.status = 'approved';
      renderStatus('approved', submission);
      showToast('Approved — inventory updated.', 3500);
    } else {
      showToast('Approval failed. Please try again.');
    }
};

/* ── Reject (managers) ─────────────────────────────────── */
window.handleReject = async function() {
    const reason = prompt('Optional: enter a reason for returning this submission.');
    const ok = await rejectNightly(submission.id, reason || '');
    if (ok) {
      submission.status = 'open';
      renderStatus('open', submission);
      showToast('Returned to employee for correction.');
    }
};

/* ── Render: Status Bar ────────────────────────────────── */
function renderStatus(status, sub) {
    const bar      = document.getElementById('status-bar');
    const dot      = document.getElementById('status-dot');
    const text     = document.getElementById('status-text');
    const meta     = document.getElementById('status-meta');
    const submitBtn = document.getElementById('submit-btn');
    const approvalActions = document.getElementById('approval-actions');
    const submitNote = document.getElementById('submit-note');
    const entryCard = document.getElementById('entry-form-card');
    const isManagerOrOwner = ['manager','owner'].includes(currentLocation?.role);

    bar.className = `submission-status-bar ${status}`;
    dot.className = `status-dot ${status}`;

    const statusLabels = {
      open:      'Open — in progress',
      submitted: 'Submitted — awaiting approval',
      approved:  'Approved — inventory updated',
      rejected:  'Returned — needs correction',
    };
    text.textContent = statusLabels[status] ?? status;

    if (sub.submitted_at) {
      meta.textContent = 'Submitted ' + new Date(sub.submitted_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
    }
    if (sub.approved_at) {
      meta.textContent = 'Approved ' + new Date(sub.approved_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
    }

    // Control form visibility
    const isEditable = status === 'open';
    entryCard.style.display   = isEditable ? '' : 'none';
    submitBtn.style.display   = isEditable ? '' : 'none';
    submitBtn.disabled        = items.length === 0;

    // Inline qty editing
    document.querySelectorAll('.qty-input').forEach(el => {
      el.disabled = !isEditable;
    });

    // Approval buttons — only show to managers when status is 'submitted'
    approvalActions.style.display = (status === 'submitted' && isManagerOrOwner) ? 'flex' : 'none';

    // Submit note
    if (status === 'approved') {
      submitNote.textContent = 'This submission has been approved and inventory has been updated.';
    } else if (status === 'submitted') {
      submitNote.textContent = isManagerOrOwner
        ? 'Review the items below, then approve or return for correction.'
        : 'Waiting for a manager to approve. Inventory will update upon approval.';
    } else {
      submitNote.textContent = 'Submitting will lock this entry and send it to a manager for approval before inventory is updated.';
    }
}

/* ── Render: Items Table ───────────────────────────────── */
function renderItems() {
    const tbody     = document.getElementById('items-tbody');
    const table     = document.getElementById('items-table');
    const emptyState = document.getElementById('empty-state');
    const countEl   = document.getElementById('item-count');
    const isEditable = submission?.status === 'open';

    countEl.textContent = items.length === 1 ? '1 item' : `${items.length} items`;

    if (items.length === 0) {
      table.style.display      = 'none';
      emptyState.style.display = '';
      updateSummary();
      return;
    }

    table.style.display      = '';
    emptyState.style.display = 'none';

    tbody.innerHTML = items.map(item => {
      const subtotal = (item.qty * item.retailPrice).toFixed(2);
      return `
        <tr>
          <td class="td-sku">${item.sku}</td>
          <td>
            <div class="td-name">${item.name}</div>
            ${item.brand ? `<div class="td-brand">${item.brand}</div>` : ''}
          </td>
          <td class="td-qty">
            <input
              class="qty-input"
              type="number"
              value="${item.qty}"
              min="1"
              ${!isEditable ? 'disabled' : ''}
              onchange="updateItemQty('${item.productId}', this.value)"
            >
          </td>
          <td class="td-price">$${parseFloat(item.retailPrice).toFixed(2)}</td>
          <td class="td-subtotal">$${subtotal}</td>
          <td>
            ${isEditable ? `<button class="remove-btn" onclick="removeItem('${item.productId}')" title="Remove">×</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    updateSummary();
    if (submission) renderStatus(submission.status, submission);
}

/* ── Update Summary Panel ──────────────────────────────── */
function updateSummary() {
    const totalUnits  = items.reduce((sum, i) => sum + i.qty, 0);
    const retailValue = items.reduce((sum, i) => sum + (i.qty * i.retailPrice), 0);

    document.getElementById('sum-skus').textContent  = items.length;
    document.getElementById('sum-units').textContent = totalUnits;
    document.getElementById('sum-retail').textContent = '$' + retailValue.toFixed(2);

    const submitBtn = document.getElementById('submit-btn');
    if (submission?.status === 'open') {
      submitBtn.disabled = items.length === 0;
    }
}

window.updateTotalDisplay = function(val) {
    const num = parseFloat(val) || 0;
    document.getElementById('sum-total-display').textContent = '$' + num.toFixed(2);
    if (submission?.id) updateSalesTotal(submission.id, num);
};

/* ── Helpers ───────────────────────────────────────────── */
function clearSkuEntry() {
    document.getElementById('sku-input').value  = '';
    document.getElementById('qty-input').value  = '';
    resolvedProduct = null;
    const preview = document.getElementById('sku-preview');
    preview.className = 'sku-preview';
    preview.innerHTML = '<span style="color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">Type a SKU to look up</span>';
    document.getElementById('add-btn').disabled = true;
}

/* ── Boot ──────────────────────────────────────────────── */

