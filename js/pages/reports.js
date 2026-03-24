/* PAGE: reports */
import { supabase, getTopRole, getLocationLabel } from '../supabase.js';

let activeSection = 'sales';

const _HTML = `<div class="page-header">
    <div>
      <div class="page-title">Reports & Analytics</div>
      <div class="page-subtitle" id="page-subtitle">PANDORA'S BOX · REPORTS & ANALYTICS</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <!-- Date range -->
      <input type="date" class="filter-select" id="report-from" onchange="refreshAll()"
             style="-webkit-appearance:none;appearance:none;background-image:none;padding:0 10px;width:140px;">
      <span style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;flex-shrink:0;">→</span>
      <input type="date" class="filter-select" id="report-to" onchange="refreshAll()"
             style="-webkit-appearance:none;appearance:none;background-image:none;padding:0 10px;width:140px;">
      <button class="btn btn-secondary" onclick="exportCurrentReport()">Export</button>
    </div>
  </div>

  <div class="accent-line"></div>
  <div style="height:20px;"></div>

  <!-- Report tabs -->
  <div class="report-tabs" id="report-tabs">
    <div class="report-tab active"  onclick="switchReport('sales',       this)">Sales</div>
    <div class="report-tab"         onclick="switchReport('products',    this)">Products</div>
    <div class="report-tab"         onclick="switchReport('margin',      this)">Margin</div>
    <div class="report-tab"         onclick="switchReport('inventory',   this)">Inventory Value</div>
    <div class="report-tab"         onclick="switchReport('turnover',    this)">Turnover</div>
    <div class="report-tab"         onclick="switchReport('reorder',     this)">Reorder</div>
    <div class="report-tab"         onclick="switchReport('outofstock',  this)">Out of Stock</div>
    <div class="report-tab"         onclick="switchReport('trends',      this)">Trends</div>
    <div class="report-tab"         onclick="switchReport('po',          this)">Purchase Orders</div>
    <div class="report-tab"         onclick="switchReport('supplier',    this)">Suppliers</div>
    <div class="report-tab"         onclick="switchReport('shrinkage',   this)">Shrinkage</div>
    <div class="report-tab"         onclick="switchReport('daily',       this)">Daily Summary</div>
  </div>


  <!-- ═══════════════════════════════════════════════
       1. SALES PERFORMANCE
  ════════════════════════════════════════════════ -->
  <div class="report-section active" id="section-sales">

    <!-- KPI strip -->
    <div class="report-card">
      <div class="metric-strip" id="sales-metrics">
        <div class="metric-cell">
          <div class="metric-label">Total Revenue</div>
          <div class="metric-value" id="s-revenue">—</div>
          <div class="metric-delta" id="s-revenue-d">Loading…</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Units Sold</div>
          <div class="metric-value" id="s-units">—</div>
          <div class="metric-delta" id="s-units-d"></div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Submissions</div>
          <div class="metric-value" id="s-subs">—</div>
          <div class="metric-delta" id="s-subs-d">approved</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Avg Daily Revenue</div>
          <div class="metric-value" id="s-avg">—</div>
          <div class="metric-delta" id="s-avg-d">per day with sales</div>
        </div>
      </div>
    </div>

    <div class="report-grid-2">
      <!-- Revenue by location -->
      <div class="report-card">
        <div class="report-card-header">
          <div>
            <div class="report-card-title">Revenue by Location</div>
            <div class="report-card-sub">Which store is winning</div>
          </div>
        </div>
        <div class="hbar-list" id="sales-by-location">
          <div class="report-empty">Loading…</div>
        </div>
      </div>

      <!-- Units sold by location -->
      <div class="report-card">
        <div class="report-card-header">
          <div>
            <div class="report-card-title">Units Sold by Location</div>
            <div class="report-card-sub">Volume comparison</div>
          </div>
        </div>
        <div class="hbar-list" id="units-by-location">
          <div class="report-empty">Loading…</div>
        </div>
      </div>
    </div>

    <!-- Sales table -->
    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Daily Sales Breakdown</div>
        <div class="card-action" onclick="exportTable('sales-table')">Export ↗</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="sales-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th class="td-right">Sales Total</th>
              <th class="td-right">Units Sold</th>
              <th>Submitted By</th>
            </tr>
          </thead>
          <tbody id="sales-table-body">
            <tr><td colspan="5" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       2. PRODUCT PERFORMANCE
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-products">
    <div class="report-grid-2">

      <!-- Top sellers -->
      <div class="report-card">
        <div class="report-card-header">
          <div>
            <div class="report-card-title">Top Sellers</div>
            <div class="report-card-sub">By units sold</div>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="report-table" id="top-products-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Category</th>
                <th class="td-right">Units</th>
                <th class="td-right">Revenue</th>
              </tr>
            </thead>
            <tbody id="top-products-body">
              <tr><td colspan="5" class="report-empty">Loading…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bottom performers -->
      <div class="report-card">
        <div class="report-card-header">
          <div>
            <div class="report-card-title">Slow Movers</div>
            <div class="report-card-sub">Low sales — consider reducing or removing</div>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="report-table" id="slow-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th class="td-right">Units</th>
                <th class="td-right">Stock</th>
              </tr>
            </thead>
            <tbody id="slow-products-body">
              <tr><td colspan="4" class="report-empty">Loading…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Category breakdown -->
    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Sales by Category</div>
      </div>
      <div class="hbar-list" id="sales-by-category">
        <div class="report-empty">Loading…</div>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       3. MARGIN ANALYSIS
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-margin">
    <div class="report-card">
      <div class="report-card-header">
        <div>
          <div class="report-card-title">Profit Margin by Product</div>
          <div class="report-card-sub">Requires cost price to be set on products</div>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="margin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Category</th>
              <th class="td-right">Retail</th>
              <th class="td-right">Cost</th>
              <th class="td-right">Margin $</th>
              <th class="td-right">Margin %</th>
              <th class="td-right">Units Sold</th>
              <th class="td-right">Total Profit</th>
            </tr>
          </thead>
          <tbody id="margin-body">
            <tr><td colspan="9" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="report-grid-2">
      <div class="report-card">
        <div class="report-card-header">
          <div class="report-card-title">Margin by Category</div>
        </div>
        <div class="hbar-list" id="margin-by-category">
          <div class="report-empty">Loading…</div>
        </div>
      </div>
      <div class="report-card">
        <div class="report-card-header">
          <div class="report-card-title">Margin by Location</div>
        </div>
        <div class="hbar-list" id="margin-by-location">
          <div class="report-empty">Loading…</div>
        </div>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       4. INVENTORY VALUATION
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-inventory">
    <div class="report-card">
      <div class="metric-strip">
        <div class="metric-cell">
          <div class="metric-label">Total Value (Cost)</div>
          <div class="metric-value" id="inv-cost">—</div>
          <div class="metric-delta">cash tied up in stock</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Total Value (Retail)</div>
          <div class="metric-value" id="inv-retail">—</div>
          <div class="metric-delta">if everything sold at retail</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Potential Gross Profit</div>
          <div class="metric-value" id="inv-profit">—</div>
          <div class="metric-delta">retail minus cost</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Total SKUs</div>
          <div class="metric-value" id="inv-skus">—</div>
          <div class="metric-delta">unique products in stock</div>
        </div>
      </div>
    </div>

    <div class="report-grid-2">
      <div class="report-card">
        <div class="report-card-header">
          <div class="report-card-title">Value by Location</div>
        </div>
        <div class="hbar-list" id="inv-by-location">
          <div class="report-empty">Loading…</div>
        </div>
      </div>
      <div class="report-card">
        <div class="report-card-header">
          <div class="report-card-title">Value by Category</div>
        </div>
        <div class="hbar-list" id="inv-by-category">
          <div class="report-empty">Loading…</div>
        </div>
      </div>
    </div>

    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Full Inventory Valuation</div>
        <div class="card-action" onclick="exportTable('inv-val-table')">Export ↗</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="inv-val-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Location</th>
              <th class="td-right">Units</th>
              <th class="td-right">Cost/ea</th>
              <th class="td-right">Retail/ea</th>
              <th class="td-right">Cost Value</th>
              <th class="td-right">Retail Value</th>
            </tr>
          </thead>
          <tbody id="inv-val-body">
            <tr><td colspan="8" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       5. TURNOVER
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-turnover">
    <div class="report-card">
      <div class="report-card-header">
        <div>
          <div class="report-card-title">Inventory Turnover Rate</div>
          <div class="report-card-sub">Higher turnover = faster moving product = less cash trapped</div>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="turnover-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th class="td-right">On Hand</th>
              <th class="td-right">Sold (period)</th>
              <th class="td-right">Turnover Rate</th>
              <th class="td-right">Days to Sell</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="turnover-body">
            <tr><td colspan="8" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       6. REORDER ALERTS
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-reorder">
    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Low Stock & Reorder Recommendations</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="reorder-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Location</th>
              <th class="td-right">On Hand</th>
              <th class="td-right">Reorder At</th>
              <th class="td-right">Reorder Qty</th>
              <th>Supplier</th>
              <th class="td-right">Lead Days</th>
              <th>Urgency</th>
            </tr>
          </thead>
          <tbody id="reorder-body">
            <tr><td colspan="9" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       7. OUT OF STOCK IMPACT
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-outofstock">
    <div class="report-card">
      <div class="report-card-header">
        <div>
          <div class="report-card-title">Out of Stock Items</div>
          <div class="report-card-sub">Products currently at zero — potential lost revenue</div>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="oos-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Location</th>
              <th class="td-right">Sold (period)</th>
              <th class="td-right">Est. Lost Revenue</th>
              <th>Last Received</th>
              <th>Supplier</th>
            </tr>
          </thead>
          <tbody id="oos-body">
            <tr><td colspan="7" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       8. SALES TRENDS
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-trends">
    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Sales Trend Over Time</div>
      </div>
      <div class="bar-chart-wrap">
        <svg class="bar-chart" id="trend-chart" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet">
          <text x="400" y="100" fill="rgba(240,237,232,0.3)" text-anchor="middle"
                font-family="DM Mono" font-size="12">Loading trend data…</text>
        </svg>
      </div>
    </div>

    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Revenue by Day</div>
        <div class="card-action" onclick="exportTable('trends-table')">Export ↗</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="trends-table">
          <thead>
            <tr>
              <th>Date</th>
              <th class="td-right">Revenue</th>
              <th class="td-right">Units Sold</th>
              <th class="td-right">Submissions</th>
            </tr>
          </thead>
          <tbody id="trends-body">
            <tr><td colspan="4" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       9. PURCHASE ORDERS
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-po">
    <div class="report-card">
      <div class="metric-strip">
        <div class="metric-cell">
          <div class="metric-label">Open POs</div>
          <div class="metric-value" id="po-open">—</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Incoming Value</div>
          <div class="metric-value" id="po-value">—</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Received (period)</div>
          <div class="metric-value" id="po-received">—</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Total Spent</div>
          <div class="metric-value" id="po-spent">—</div>
        </div>
      </div>
    </div>

    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Purchase Order Summary</div>
        <div class="card-action" onclick="exportTable('po-table')">Export ↗</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="po-table">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Supplier</th>
              <th>Location</th>
              <th>Ordered</th>
              <th>Expected</th>
              <th>Status</th>
              <th class="td-right">Items</th>
              <th class="td-right">Total Cost</th>
            </tr>
          </thead>
          <tbody id="po-body">
            <tr><td colspan="8" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       10. SUPPLIER PERFORMANCE
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-supplier">
    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Supplier Performance</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="supplier-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th class="td-right">POs Placed</th>
              <th class="td-right">POs Received</th>
              <th class="td-right">Total Spent</th>
              <th class="td-right">Avg Lead Days</th>
              <th class="td-right">Quoted Lead</th>
              <th>Reliability</th>
            </tr>
          </thead>
          <tbody id="supplier-body">
            <tr><td colspan="7" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       11. SHRINKAGE / LOSS
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-shrinkage">
    <div class="report-card">
      <div class="metric-strip">
        <div class="metric-cell">
          <div class="metric-label">Total Adjustments</div>
          <div class="metric-value" id="sh-count">—</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Units Removed</div>
          <div class="metric-value" id="sh-units" style="color:var(--crimson);">—</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Est. Cost Loss</div>
          <div class="metric-value" id="sh-cost" style="color:var(--crimson);">—</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Units Added</div>
          <div class="metric-value" id="sh-added" style="color:var(--sage);">—</div>
        </div>
      </div>
    </div>

    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Adjustment Log</div>
        <div class="card-action" onclick="exportTable('shrinkage-table')">Export ↗</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="shrinkage-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Location</th>
              <th class="td-right">Delta</th>
              <th class="td-right">Before</th>
              <th class="td-right">After</th>
              <th>Reason</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody id="shrinkage-body">
            <tr><td colspan="8" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>


  <!-- ═══════════════════════════════════════════════
       12. DAILY SUMMARY
  ════════════════════════════════════════════════ -->
  <div class="report-section" id="section-daily">
    <div class="report-card">
      <div class="metric-strip">
        <div class="metric-cell">
          <div class="metric-label">Today's Revenue</div>
          <div class="metric-value" id="daily-rev">—</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Units Sold Today</div>
          <div class="metric-value" id="daily-units">—</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Submissions Today</div>
          <div class="metric-value" id="daily-subs">—</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Avg per Submission</div>
          <div class="metric-value" id="daily-avg">—</div>
        </div>
      </div>
    </div>

    <div class="report-card">
      <div class="report-card-header">
        <div class="report-card-title">Today's Nightly Submissions</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="report-table" id="daily-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Status</th>
              <th class="td-right">Sales Total</th>
              <th>Submitted By</th>
              <th>Submitted At</th>
              <th>Approved By</th>
            </tr>
          </thead>
          <tbody id="daily-body">
            <tr><td colspan="6" class="report-empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>`;

export async function init(profile) {
  profile = p;
  document.getElementById('outlet').innerHTML = _HTML;
  await _run();
}

/* ── State ── */

/* ── Helpers ── */
const fmt  = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtN = n => (n || 0).toLocaleString();
const pct  = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '—';
const dateStr = d => new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

function getDateRange() {
return {
    from: document.getElementById('report-from').value,
    to:   document.getElementById('report-to').value,
};
}

function hbar(items, valueKey, labelKey, colorKey, formatFn=fmtN) {
if (!items.length) return '<div class="report-empty">No data for this period.</div>';
const max = Math.max(...items.map(i => i[valueKey] || 0));
const COLORS = ['#c9a84c','#4c8fc9','#4cc97a','#c94c7a','#9b4cc9'];
return items.map((item, i) => `
    <div class="hbar-item">
      <div class="hbar-label">${item[labelKey]}</div>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${max > 0 ? Math.round((item[valueKey]||0)/max*100) : 0}%;
             background:${colorKey ? item[colorKey] : COLORS[i % COLORS.length]};"></div>
      </div>
      <div class="hbar-value">${formatFn(item[valueKey] || 0)}</div>
    </div>`).join('');
}

function emptyRow(cols, msg='No data for this period.') {
return `<tr><td colspan="${cols}" class="report-empty">${msg}</td></tr>`;
}

/* ── Init ── */
async function _run(profile) {
if (roleEl) { roleEl.textContent = role; roleEl.className = 'urole role-' + role; }

// Default date range: last 7 days
const today   = new Date().toISOString().slice(0,10);
const weekAgo = new Date(Date.now() - 7*864e5).toISOString().slice(0,10);
document.getElementById('report-from').value = weekAgo;
document.getElementById('report-to').value   = today;

document.getElementById('page-subtitle').textContent =
    "PANDORA'S BOX · WEEKLY · " +
    new Date().toLocaleDateString('en-US', { month:'long', year:'numeric' }).toUpperCase() +
    ' · ' +

await loadSection('sales');
}

/* ── Tab switching ── */
window.switchReport = async function(section, el) {
activeSection = section;
document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
document.querySelectorAll('.report-section').forEach(s => s.classList.remove('active'));
el.classList.add('active');
document.getElementById('section-' + section).classList.add('active');
await loadSection(section);
};

window.refreshAll = async function() {
await loadSection(activeSection);
};

async function loadSection(section) {
const loaders = {
    sales:      loadSales,
    products:   loadProducts,
    margin:     loadMargin,
    inventory:  loadInventoryVal,
    turnover:   loadTurnover,
    reorder:    loadReorder,
    outofstock: loadOutOfStock,
    trends:     loadTrends,
    po:         loadPO,
    supplier:   loadSupplier,
    shrinkage:  loadShrinkage,
    daily:      loadDaily,
};
if (loaders[section]) await loaders[section]();
}

/* ═══════════════════════════════════════════════
   1. SALES
═══════════════════════════════════════════════ */
async function loadSales() {
const { from, to } = getDateRange();

const { data: subs } = await supabase
    .from('nightly_submissions')
    .select(`
      id, submission_date, sales_total, status,
      locations ( name ),
      submitted_by:profiles!nightly_submissions_submitted_by_fkey ( display_name, full_name )
    `)
    .eq('status','approved')
    .gte('submission_date', from)
    .lte('submission_date', to)
    .order('submission_date', { ascending: false });

const { data: items } = await supabase
    .from('nightly_submission_items')
    .select(`
      quantity_sold,
      nightly_submissions!inner ( submission_date, status, location_id,
        locations ( name ) )
    `)
    .eq('nightly_submissions.status','approved')
    .gte('nightly_submissions.submission_date', from)
    .lte('nightly_submissions.submission_date', to);

const rows   = subs  ?? [];
const iRows  = items ?? [];

const totalRev   = rows.reduce((s,r) => s + (parseFloat(r.sales_total)||0), 0);
const totalUnits = iRows.reduce((s,r) => s + (r.quantity_sold||0), 0);
const days = rows.reduce((s,r) => { s.add(r.submission_date); return s; }, new Set()).size;

document.getElementById('s-revenue').textContent = fmt(totalRev);
document.getElementById('s-units').textContent   = fmtN(totalUnits);
document.getElementById('s-subs').textContent    = rows.length;
document.getElementById('s-avg').textContent     = fmt(days > 0 ? totalRev / days : 0);
document.getElementById('s-revenue-d').textContent = `across ${days} day${days!==1?'s':''}`;

// By location (revenue)
const byLoc = {};
rows.forEach(r => {
    const loc = r.locations?.name || 'Unknown';
    byLoc[loc] = (byLoc[loc] || 0) + (parseFloat(r.sales_total)||0);
});
const locRevItems = Object.entries(byLoc).map(([name,rev]) => ({ name, rev })).sort((a,b) => b.rev-a.rev);
document.getElementById('sales-by-location').innerHTML = hbar(locRevItems,'rev','name',null,fmt);

// By location (units)
const byLocU = {};
iRows.forEach(r => {
    const loc = r.nightly_submissions?.locations?.name || 'Unknown';
    byLocU[loc] = (byLocU[loc] || 0) + (r.quantity_sold||0);
});
const locUnitItems = Object.entries(byLocU).map(([name,units]) => ({ name, units })).sort((a,b) => b.units-a.units);
document.getElementById('units-by-location').innerHTML = hbar(locUnitItems,'units','name',null,fmtN);

// Table
const tbody = document.getElementById('sales-table-body');
tbody.innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td class="td-mono">${dateStr(r.submission_date)}</td>
      <td>${r.locations?.name || '—'}</td>
      <td class="td-right td-mono">${fmt(parseFloat(r.sales_total)||0)}</td>
      <td class="td-right td-mono">—</td>
      <td style="color:var(--text-muted);">${r.submitted_by?.display_name || r.submitted_by?.full_name || '—'}</td>
    </tr>`).join('') : emptyRow(5);
}

/* ═══════════════════════════════════════════════
   2. PRODUCTS
═══════════════════════════════════════════════ */
async function loadProducts() {
const { from, to } = getDateRange();

const { data: items } = await supabase
    .from('nightly_submission_items')
    .select(`
      quantity_sold, retail_price,
      products ( id, name, product_number,
        categories ( name, category_number ) ),
      nightly_submissions!inner ( submission_date, status )
    `)
    .eq('nightly_submissions.status','approved')
    .gte('nightly_submissions.submission_date', from)
    .lte('nightly_submissions.submission_date', to);

const totals = {};
(items ?? []).forEach(row => {
    const id = row.products?.id;
    if (!id) return;
    if (!totals[id]) totals[id] = {
      name:  row.products.name,
      sku:   `${row.products.categories?.category_number}/${row.products.product_number}`,
      cat:   row.products.categories?.name || '—',
      units: 0, revenue: 0,
    };
    totals[id].units   += row.quantity_sold;
    totals[id].revenue += (row.quantity_sold * (parseFloat(row.retail_price)||0));
});

const sorted = Object.values(totals).sort((a,b) => b.units - a.units);

// Top sellers
document.getElementById('top-products-body').innerHTML = sorted.slice(0,15).length
    ? sorted.slice(0,15).map((p,i) => `
        <tr>
          <td><span class="rank-badge ${i<3?'top':'}'}">#${i+1}</span></td>
          <td><div style="font-weight:500;">${p.name}</div><div style="font-size:0.7rem;color:var(--text-muted);font-family:'DM Mono',monospace;">${p.sku}</div></td>
          <td style="color:var(--text-muted);font-size:0.78rem;">${p.cat}</td>
          <td class="td-right td-mono">${fmtN(p.units)}</td>
          <td class="td-right td-mono">${fmt(p.revenue)}</td>
        </tr>`).join('')
    : emptyRow(5);

// Slow movers — get inventory for comparison
const { data: inv } = await supabase.from('inventory_status').select('product_id,quantity_on_hand,product_name,category_name,sku');
const soldSet = new Set(Object.keys(totals));
const slow = (inv ?? []).filter(i => !soldSet.has(i.product_id) && i.quantity_on_hand > 0);

document.getElementById('slow-products-body').innerHTML = slow.slice(0,15).length
    ? slow.slice(0,15).map(p => `
        <tr>
          <td><div style="font-weight:500;">${p.product_name}</div><div style="font-size:0.7rem;color:var(--text-muted);font-family:'DM Mono',monospace;">${p.sku}</div></td>
          <td style="color:var(--text-muted);font-size:0.78rem;">${p.category_name}</td>
          <td class="td-right td-mono" style="color:var(--text-muted);">0</td>
          <td class="td-right td-mono">${p.quantity_on_hand}</td>
        </tr>`).join('')
    : emptyRow(4, 'All products sold at least once this period — great!');

// By category
const byCat = {};
sorted.forEach(p => {
    byCat[p.cat] = (byCat[p.cat] || 0) + p.units;
});
const catItems = Object.entries(byCat).map(([name,units]) => ({ name, units })).sort((a,b) => b.units-a.units);
document.getElementById('sales-by-category').innerHTML = hbar(catItems,'units','name',null,fmtN);
}

/* ═══════════════════════════════════════════════
   3. MARGIN
═══════════════════════════════════════════════ */
async function loadMargin() {
const { from, to } = getDateRange();

const { data: items } = await supabase
    .from('nightly_submission_items')
    .select(`
      quantity_sold, retail_price,
      products ( id, name, product_number, cost_price, retail_price,
        categories ( name, category_number ) ),
      nightly_submissions!inner ( submission_date, status, location_id,
        locations ( name ) )
    `)
    .eq('nightly_submissions.status','approved')
    .gte('nightly_submissions.submission_date', from)
    .lte('nightly_submissions.submission_date', to);

const totals = {};
const byCat  = {};
const byLoc  = {};

(items ?? []).forEach(row => {
    const id       = row.products?.id;
    const retail   = parseFloat(row.retail_price || row.products?.retail_price || 0);
    const cost     = parseFloat(row.products?.cost_price || 0);
    const margin   = retail - cost;
    const qty      = row.quantity_sold || 0;
    const cat      = row.products?.categories?.name || 'Unknown';
    const loc      = row.nightly_submissions?.locations?.name || 'Unknown';

    if (id) {
      if (!totals[id]) totals[id] = {
        name: row.products.name,
        sku:  `${row.products.categories?.category_number}/${row.products.product_number}`,
        cat,  retail, cost, units: 0, totalRevenue: 0, totalCost: 0,
      };
      totals[id].units        += qty;
      totals[id].totalRevenue += qty * retail;
      totals[id].totalCost    += qty * cost;
    }

    byCat[cat] = byCat[cat] || { name:cat, revenue:0, cost:0 };
    byCat[cat].revenue += qty * retail;
    byCat[cat].cost    += qty * cost;

    byLoc[loc] = byLoc[loc] || { name:loc, revenue:0, cost:0 };
    byLoc[loc].revenue += qty * retail;
    byLoc[loc].cost    += qty * cost;
});

const rows = Object.values(totals).sort((a,b) =>
    (b.totalRevenue - b.totalCost) - (a.totalRevenue - a.totalCost));

document.getElementById('margin-body').innerHTML = rows.length
    ? rows.map((p,i) => {
        const marginDollar = p.totalRevenue - p.totalCost;
        const marginPct    = p.totalRevenue > 0 ? (marginDollar / p.totalRevenue * 100) : 0;
        const pillCls      = marginPct >= 40 ? 'high' : marginPct >= 20 ? 'mid' : 'low';
        return `
          <tr>
            <td><span class="rank-badge ${i<3?'top':'}'}">#${i+1}</span></td>
            <td><div style="font-weight:500;">${p.name}</div><div style="font-size:0.7rem;color:var(--text-muted);font-family:'DM Mono',monospace;">${p.sku}</div></td>
            <td style="color:var(--text-muted);font-size:0.78rem;">${p.cat}</td>
            <td class="td-right td-mono">${fmt(p.retail)}</td>
            <td class="td-right td-mono" style="color:var(--text-muted);">${p.cost > 0 ? fmt(p.cost) : '—'}</td>
            <td class="td-right td-mono">${p.cost > 0 ? fmt(p.retail - p.cost) : '—'}</td>
            <td class="td-right"><span class="margin-pill ${pillCls}">${marginPct.toFixed(1)}%</span></td>
            <td class="td-right td-mono">${fmtN(p.units)}</td>
            <td class="td-right td-mono">${p.cost > 0 ? fmt(marginDollar) : '—'}</td>
          </tr>`;
      }).join('')
    : emptyRow(9);

const catItems = Object.values(byCat).map(c => ({
    name: c.name, margin: c.cost > 0 ? ((c.revenue-c.cost)/c.revenue*100) : 0
})).sort((a,b) => b.margin-a.margin);
document.getElementById('margin-by-category').innerHTML =
    hbar(catItems,'margin','name',null, v => v.toFixed(1)+'%');

const locItems = Object.values(byLoc).map(l => ({
    name: l.name, margin: l.cost > 0 ? ((l.revenue-l.cost)/l.revenue*100) : 0
})).sort((a,b) => b.margin-a.margin);
document.getElementById('margin-by-location').innerHTML =
    hbar(locItems,'margin','name',null, v => v.toFixed(1)+'%');
}

/* ═══════════════════════════════════════════════
   4. INVENTORY VALUATION
═══════════════════════════════════════════════ */
async function loadInventoryVal() {
const { data: inv } = await supabase
    .from('inventory')
    .select(`
      quantity_on_hand,
      products ( name, product_number, retail_price, cost_price,
        categories ( name, category_number ) ),
      locations ( name )
    `)
    .gt('quantity_on_hand', 0);

const rows      = inv ?? [];
let totalCost   = 0, totalRetail = 0;
const byLoc     = {}, byCat = {};
const tableRows = [];

rows.forEach(r => {
    const qty    = r.quantity_on_hand || 0;
    const cost   = parseFloat(r.products?.cost_price   || 0);
    const retail = parseFloat(r.products?.retail_price || 0);
    const loc    = r.locations?.name  || 'Unknown';
    const cat    = r.products?.categories?.name || 'Unknown';
    const sku    = `${r.products?.categories?.category_number}/${r.products?.product_number}`;

    totalCost   += qty * cost;
    totalRetail += qty * retail;

    byLoc[loc] = byLoc[loc] || { name:loc, cost:0, retail:0 };
    byLoc[loc].cost   += qty * cost;
    byLoc[loc].retail += qty * retail;

    byCat[cat] = byCat[cat] || { name:cat, cost:0, retail:0 };
    byCat[cat].cost   += qty * cost;
    byCat[cat].retail += qty * retail;

    tableRows.push({ sku, name: r.products?.name || '—', loc, qty, cost, retail });
});

document.getElementById('inv-cost').textContent   = fmt(totalCost);
document.getElementById('inv-retail').textContent = fmt(totalRetail);
document.getElementById('inv-profit').textContent = fmt(totalRetail - totalCost);
document.getElementById('inv-skus').textContent   = fmtN(new Set(rows.map(r => r.products?.name)).size);

const locItems = Object.values(byLoc).sort((a,b) => b.cost-a.cost);
document.getElementById('inv-by-location').innerHTML = hbar(locItems,'cost','name',null,fmt);

const catItems = Object.values(byCat).sort((a,b) => b.cost-a.cost);
document.getElementById('inv-by-category').innerHTML = hbar(catItems,'cost','name',null,fmt);

tableRows.sort((a,b) => (b.qty*b.cost) - (a.qty*a.cost));
document.getElementById('inv-val-body').innerHTML = tableRows.length
    ? tableRows.map(r => `
        <tr>
          <td class="td-mono" style="color:var(--gold);">${r.sku}</td>
          <td style="font-weight:500;">${r.name}</td>
          <td style="color:var(--text-muted);">${r.loc}</td>
          <td class="td-right td-mono">${fmtN(r.qty)}</td>
          <td class="td-right td-mono" style="color:var(--text-muted);">${r.cost > 0 ? fmt(r.cost) : '—'}</td>
          <td class="td-right td-mono" style="color:var(--text-muted);">${r.retail > 0 ? fmt(r.retail) : '—'}</td>
          <td class="td-right td-mono">${r.cost > 0 ? fmt(r.qty * r.cost) : '—'}</td>
          <td class="td-right td-mono">${r.retail > 0 ? fmt(r.qty * r.retail) : '—'}</td>
        </tr>`).join('')
    : emptyRow(8);
}

/* ═══════════════════════════════════════════════
   5. TURNOVER
═══════════════════════════════════════════════ */
async function loadTurnover() {
const { from, to } = getDateRange();
const days = Math.max(1, Math.ceil((new Date(to)-new Date(from)) / 864e5));

const [invRes, salesRes] = await Promise.all([
    supabase.from('inventory_status').select('*'),
    supabase.from('nightly_submission_items').select(`
      quantity_sold,
      products ( id ),
      nightly_submissions!inner ( submission_date, status )
    `)
    .eq('nightly_submissions.status','approved')
    .gte('nightly_submissions.submission_date', from)
    .lte('nightly_submissions.submission_date', to),
]);

const soldByProduct = {};
(salesRes.data ?? []).forEach(r => {
    const id = r.products?.id;
    if (id) soldByProduct[id] = (soldByProduct[id] || 0) + r.quantity_sold;
});

const rows = (invRes.data ?? []).map(inv => {
    const sold     = soldByProduct[inv.product_id] || 0;
    const onHand   = inv.quantity_on_hand || 0;
    const avgStock = onHand + sold / 2;
    const turnover = avgStock > 0 ? (sold / avgStock) : 0;
    const dsi      = sold > 0 ? Math.round(onHand / (sold / days)) : null;
    return { ...inv, sold, turnover, dsi };
}).sort((a,b) => b.turnover - a.turnover);

document.getElementById('turnover-body').innerHTML = rows.length
    ? rows.map(r => {
        const status = r.dsi === null ? 'No sales'
          : r.dsi <= 7  ? '<span class="margin-pill high">Fast</span>'
          : r.dsi <= 30 ? '<span class="margin-pill mid">Normal</span>'
          : '<span class="margin-pill low">Slow</span>';
        return `
          <tr>
            <td class="td-mono" style="color:var(--gold);">${r.sku}</td>
            <td style="font-weight:500;">${r.product_name}</td>
            <td style="color:var(--text-muted);font-size:0.78rem;">${r.category_name}</td>
            <td class="td-right td-mono">${fmtN(r.quantity_on_hand)}</td>
            <td class="td-right td-mono">${fmtN(r.sold)}</td>
            <td class="td-right td-mono">${r.turnover.toFixed(2)}x</td>
            <td class="td-right td-mono">${r.dsi !== null ? r.dsi + 'd' : '—'}</td>
            <td>${status}</td>
          </tr>`;
      }).join('')
    : emptyRow(8);
}

/* ═══════════════════════════════════════════════
   6. REORDER
═══════════════════════════════════════════════ */
async function loadReorder() {
const { data } = await supabase
    .from('low_stock_alerts')
    .select(`
      sku, product_name, location_name, quantity_on_hand,
      reorder_point, reorder_quantity, product_id
    `);

const { data: prods } = await supabase
    .from('products')
    .select('id, suppliers(name, lead_days)');

const supMap = {};
(prods ?? []).forEach(p => { supMap[p.id] = p.suppliers; });

const rows = data ?? [];

document.getElementById('reorder-body').innerHTML = rows.length
    ? rows.map(r => {
        const sup      = supMap[r.product_id];
        const urgency  = r.quantity_on_hand === 0
          ? '<span class="margin-pill low">CRITICAL</span>'
          : r.quantity_on_hand <= r.reorder_point / 2
            ? '<span class="margin-pill low">Urgent</span>'
            : '<span class="margin-pill mid">Low</span>';
        return `
          <tr>
            <td class="td-mono" style="color:var(--gold);">${r.sku}</td>
            <td style="font-weight:500;">${r.product_name}</td>
            <td style="color:var(--text-muted);">${r.location_name}</td>
            <td class="td-right td-mono" style="color:var(--crimson);font-weight:600;">${r.quantity_on_hand}</td>
            <td class="td-right td-mono">${r.reorder_point}</td>
            <td class="td-right td-mono" style="color:var(--gold);">${r.reorder_quantity}</td>
            <td style="color:var(--text-muted);font-size:0.78rem;">${sup?.name || '—'}</td>
            <td class="td-right td-mono">${sup?.lead_days != null ? sup.lead_days + 'd' : '—'}</td>
            <td>${urgency}</td>
          </tr>`;
      }).join('')
    : emptyRow(9, 'No items below reorder threshold. Stock levels are healthy.');
}

/* ═══════════════════════════════════════════════
   7. OUT OF STOCK
═══════════════════════════════════════════════ */
async function loadOutOfStock() {
const { from, to } = getDateRange();

const { data: oos } = await supabase
    .from('inventory_status')
    .select('*')
    .eq('is_out_of_stock', true);

const { data: soldData } = await supabase
    .from('nightly_submission_items')
    .select(`quantity_sold, retail_price, products(id),
      nightly_submissions!inner(submission_date, status)`)
    .eq('nightly_submissions.status','approved')
    .gte('nightly_submissions.submission_date', from)
    .lte('nightly_submissions.submission_date', to);

const soldMap = {};
(soldData ?? []).forEach(r => {
    const id = r.products?.id;
    if (id) {
      soldMap[id] = soldMap[id] || { units:0, revenue:0 };
      soldMap[id].units   += r.quantity_sold;
      soldMap[id].revenue += r.quantity_sold * (parseFloat(r.retail_price)||0);
    }
});

// Last received date per product+location
const { data: lastRec } = await supabase
    .from('inventory_transactions')
    .select('product_id, location_id, created_at')
    .eq('type','receive')
    .order('created_at', { ascending: false });

const lastRecMap = {};
(lastRec ?? []).forEach(r => {
    const key = r.product_id + '_' + r.location_id;
    if (!lastRecMap[key]) lastRecMap[key] = r.created_at;
});

const { data: prods } = await supabase.from('products').select('id,suppliers(name)');
const supMap = {};
(prods ?? []).forEach(p => { supMap[p.id] = p.suppliers?.name; });

document.getElementById('oos-body').innerHTML = (oos ?? []).length
    ? (oos ?? []).map(r => {
        const s    = soldMap[r.product_id];
        const lrKey = r.product_id + '_' + (r.location_name || '');
        return `
          <tr>
            <td class="td-mono" style="color:var(--gold);">${r.sku}</td>
            <td style="font-weight:500;">${r.product_name}</td>
            <td style="color:var(--text-muted);">${r.location_name}</td>
            <td class="td-right td-mono">${s ? fmtN(s.units) : '—'}</td>
            <td class="td-right td-mono" style="color:var(--crimson);">${s ? fmt(s.revenue) : '—'}</td>
            <td class="td-mono" style="color:var(--text-muted);font-size:0.75rem;">—</td>
            <td style="color:var(--text-muted);font-size:0.78rem;">${supMap[r.product_id] || '—'}</td>
          </tr>`;
      }).join('')
    : emptyRow(7, 'No out-of-stock items. Well stocked!');
}

/* ═══════════════════════════════════════════════
   8. TRENDS
═══════════════════════════════════════════════ */
async function loadTrends() {
const { from, to } = getDateRange();

const { data: subs } = await supabase
    .from('nightly_submissions')
    .select(`id, submission_date, sales_total`)
    .eq('status','approved')
    .gte('submission_date', from)
    .lte('submission_date', to)
    .order('submission_date');

const { data: items } = await supabase
    .from('nightly_submission_items')
    .select(`quantity_sold, nightly_submissions!inner(submission_date, status)`)
    .eq('nightly_submissions.status','approved')
    .gte('nightly_submissions.submission_date', from)
    .lte('nightly_submissions.submission_date', to);

// Group by date
const byDate = {};
(subs ?? []).forEach(r => {
    byDate[r.submission_date] = byDate[r.submission_date] || { rev:0, units:0, subs:0 };
    byDate[r.submission_date].rev  += parseFloat(r.sales_total)||0;
    byDate[r.submission_date].subs += 1;
});
(items ?? []).forEach(r => {
    const d = r.nightly_submissions?.submission_date;
    if (d) {
      byDate[d] = byDate[d] || { rev:0, units:0, subs:0 };
      byDate[d].units += r.quantity_sold;
    }
});

const dates = Object.keys(byDate).sort();
const values = dates.map(d => byDate[d].rev);
const maxV   = Math.max(...values, 1);
const W = 800, H = 180, PAD = 40;
const xStep = dates.length > 1 ? (W - PAD*2) / (dates.length - 1) : W - PAD*2;

const points = dates.map((d, i) => {
    const x = PAD + i * xStep;
    const y = H - PAD - ((byDate[d].rev / maxV) * (H - PAD*2));
    return `${x},${y}`;
});

const areaPoints = points.length
    ? `M${points[0]} L${points.join(' L')} L${PAD + (dates.length-1)*xStep},${H-PAD} L${PAD},${H-PAD} Z`
    : '';
const linePoints = points.length ? `M${points.join(' L')}` : '';

const xLabels = dates.filter((_,i) => i % Math.ceil(dates.length/6) === 0 || i === dates.length-1)
    .map(d => {
      const i = dates.indexOf(d);
      const x = PAD + i * xStep;
      const label = new Date(d + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
      return `<text x="${x}" y="${H-5}" fill="rgba(240,237,232,0.35)" font-size="9" font-family="DM Mono" text-anchor="middle">${label}</text>`;
    }).join('');

const svg = document.getElementById('trend-chart');
svg.innerHTML = `
    <defs>
      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c9a84c" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#c9a84c" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${H-PAD}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    <line x1="${PAD}" y1="${H-PAD}" x2="${W-PAD}" y2="${H-PAD}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    <line x1="${PAD}" y1="${PAD+(H-PAD*2)/2}" x2="${W-PAD}" y2="${PAD+(H-PAD*2)/2}" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="4,4"/>
    ${areaPoints ? `<path d="${areaPoints}" fill="url(#trendGrad)"/>` : ''}
    ${linePoints ? `<path d="${linePoints}" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${points.map((p,i) => i === points.length-1 ? `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="4" fill="#c9a84c"/>` : '').join('')}
    ${xLabels}
    <text x="${PAD-4}" y="${PAD+4}" fill="rgba(240,237,232,0.35)" font-size="9" font-family="DM Mono" text-anchor="end">${fmt(maxV)}</text>
    <text x="${PAD-4}" y="${PAD+(H-PAD*2)/2+4}" fill="rgba(240,237,232,0.35)" font-size="9" font-family="DM Mono" text-anchor="end">${fmt(maxV/2)}</text>
    <text x="${PAD-4}" y="${H-PAD}" fill="rgba(240,237,232,0.35)" font-size="9" font-family="DM Mono" text-anchor="end">$0</text>
    ${dates.length === 0 ? '<text x="400" y="100" fill="rgba(240,237,232,0.3)" text-anchor="middle" font-family="DM Mono" font-size="12">No sales data for this period</text>' : ''}
`;

document.getElementById('trends-body').innerHTML = dates.length
    ? [...dates].reverse().map(d => `
        <tr>
          <td class="td-mono">${dateStr(d)}</td>
          <td class="td-right td-mono">${fmt(byDate[d].rev)}</td>
          <td class="td-right td-mono">${fmtN(byDate[d].units)}</td>
          <td class="td-right td-mono">${byDate[d].subs}</td>
        </tr>`).join('')
    : emptyRow(4);
}

/* ═══════════════════════════════════════════════
   9. PURCHASE ORDERS
═══════════════════════════════════════════════ */
async function loadPO() {
const { from, to } = getDateRange();

const { data: pos } = await supabase
    .from('po_summary')
    .select('*')
    .gte('created_at', from + 'T00:00:00')
    .lte('created_at', to   + 'T23:59:59')
    .order('created_at', { ascending: false });

const rows = pos ?? [];
const open     = rows.filter(r => ['draft','sent','partial'].includes(r.status));
const received = rows.filter(r => r.status === 'received');

document.getElementById('po-open').textContent     = open.length;
document.getElementById('po-value').textContent    = fmt(open.reduce((s,r) => s + (r.total_cost||0), 0));
document.getElementById('po-received').textContent = received.length;
document.getElementById('po-spent').textContent    = fmt(received.reduce((s,r) => s + (r.total_cost||0), 0));

document.getElementById('po-body').innerHTML = rows.length
    ? rows.map(r => `
        <tr>
          <td class="td-mono" style="color:var(--gold);font-weight:600;">${r.po_number}</td>
          <td style="font-weight:500;">${r.supplier_name}</td>
          <td style="color:var(--text-muted);">${r.location_name}</td>
          <td class="td-mono" style="color:var(--text-muted);font-size:0.75rem;">${r.ordered_at ? dateStr(r.ordered_at) : '—'}</td>
          <td class="td-mono" style="color:var(--text-muted);font-size:0.75rem;">${r.expected_at ? dateStr(r.expected_at) : '—'}</td>
          <td><span class="po-status ${r.status}" style="font-size:0.62rem;padding:2px 8px;border-radius:20px;font-family:'DM Mono',monospace;font-weight:600;background:var(--surface3);color:var(--text-muted);">${r.status}</span></td>
          <td class="td-right td-mono">${r.line_item_count || 0}</td>
          <td class="td-right td-mono">${r.total_cost > 0 ? fmt(r.total_cost) : '—'}</td>
        </tr>`).join('')
    : emptyRow(8);
}

/* ═══════════════════════════════════════════════
   10. SUPPLIER PERFORMANCE
═══════════════════════════════════════════════ */
async function loadSupplier() {
const { data: pos } = await supabase
    .from('purchase_orders')
    .select(`
      id, status, ordered_at, received_at,
      suppliers ( id, name, lead_days ),
      purchase_order_items ( quantity_ordered, quantity_received, unit_cost )
    `)
    .not('supplier_id', 'is', null);

const bySupplier = {};
(pos ?? []).forEach(po => {
    const sid  = po.suppliers?.id;
    if (!sid) return;
    if (!bySupplier[sid]) bySupplier[sid] = {
      name:       po.suppliers.name,
      quotedLead: po.suppliers.lead_days,
      placed:     0, received:  0,
      totalSpent: 0, leadDays:  [],
    };
    bySupplier[sid].placed++;
    if (po.status === 'received') {
      bySupplier[sid].received++;
      if (po.ordered_at && po.received_at) {
        const days = Math.round((new Date(po.received_at)-new Date(po.ordered_at)) / 864e5);
        bySupplier[sid].leadDays.push(days);
      }
    }
    const cost = (po.purchase_order_items ?? []).reduce((s,i) => s + ((i.quantity_received||0)*(i.unit_cost||0)), 0);
    bySupplier[sid].totalSpent += cost;
});

const rows = Object.values(bySupplier).sort((a,b) => b.totalSpent-a.totalSpent);

document.getElementById('supplier-body').innerHTML = rows.length
    ? rows.map(s => {
        const avgLead = s.leadDays.length ? Math.round(s.leadDays.reduce((a,b)=>a+b,0)/s.leadDays.length) : null;
        const reliability = s.placed > 0 ? Math.round(s.received/s.placed*100) : 0;
        const reliabilityPill = reliability >= 90 ? '<span class="margin-pill high">Reliable</span>'
          : reliability >= 70 ? '<span class="margin-pill mid">Moderate</span>'
          : '<span class="margin-pill low">Unreliable</span>';
        return `
          <tr>
            <td style="font-weight:500;">${s.name}</td>
            <td class="td-right td-mono">${s.placed}</td>
            <td class="td-right td-mono">${s.received}</td>
            <td class="td-right td-mono">${fmt(s.totalSpent)}</td>
            <td class="td-right td-mono">${avgLead !== null ? avgLead+'d' : '—'}</td>
            <td class="td-right td-mono" style="color:var(--text-muted);">${s.quotedLead != null ? s.quotedLead+'d' : '—'}</td>
            <td>${s.placed > 0 ? reliabilityPill : '—'}</td>
          </tr>`;
      }).join('')
    : emptyRow(7);
}

/* ═══════════════════════════════════════════════
   11. SHRINKAGE
═══════════════════════════════════════════════ */
async function loadShrinkage() {
const { from, to } = getDateRange();

const { data } = await supabase
    .from('inventory_transactions')
    .select(`
      quantity_delta, quantity_before, quantity_after, notes, created_at,
      products ( name, product_number, cost_price, categories(category_number) ),
      locations ( name ),
      profiles  ( display_name, full_name )
    `)
    .eq('type','adjustment')
    .gte('created_at', from + 'T00:00:00')
    .lte('created_at', to   + 'T23:59:59')
    .order('created_at', { ascending: false });

const rows = data ?? [];
const removed   = rows.filter(r => r.quantity_delta < 0);
const added     = rows.filter(r => r.quantity_delta > 0);
const unitsRem  = removed.reduce((s,r) => s + Math.abs(r.quantity_delta), 0);
const unitsAdd  = added.reduce((s,r)   => s + r.quantity_delta, 0);
const costLoss  = removed.reduce((s,r) => s + (Math.abs(r.quantity_delta) * (parseFloat(r.products?.cost_price)||0)), 0);

document.getElementById('sh-count').textContent = rows.length;
document.getElementById('sh-units').textContent = fmtN(unitsRem);
document.getElementById('sh-cost').textContent  = fmt(costLoss);
document.getElementById('sh-added').textContent = fmtN(unitsAdd);

document.getElementById('shrinkage-body').innerHTML = rows.length
    ? rows.map(r => {
        const name = r.products?.name || '—';
        const sku  = `${r.products?.categories?.category_number}/${r.products?.product_number}`;
        const who  = r.profiles?.display_name || r.profiles?.full_name || 'System';
        const delta = r.quantity_delta > 0 ? `<span style="color:var(--sage);">+${r.quantity_delta}</span>` : `<span style="color:var(--crimson);">${r.quantity_delta}</span>`;
        return `
          <tr>
            <td class="td-mono" style="font-size:0.75rem;color:var(--text-muted);">${new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</td>
            <td><div style="font-weight:500;">${name}</div><div style="font-size:0.68rem;color:var(--text-muted);font-family:'DM Mono',monospace;">${sku}</div></td>
            <td style="color:var(--text-muted);">${r.locations?.name || '—'}</td>
            <td class="td-right td-mono">${delta}</td>
            <td class="td-right td-mono" style="color:var(--text-muted);">${r.quantity_before}</td>
            <td class="td-right td-mono" style="color:var(--text-muted);">${r.quantity_after}</td>
            <td style="color:var(--text-muted);font-size:0.75rem;">${r.notes || '—'}</td>
            <td style="color:var(--text-muted);font-size:0.75rem;">${who}</td>
          </tr>`;
      }).join('')
    : emptyRow(8, 'No adjustments in this period.');
}

/* ═══════════════════════════════════════════════
   12. DAILY SUMMARY
═══════════════════════════════════════════════ */
async function loadDaily() {
const today = new Date().toISOString().slice(0,10);

const [subsRes, itemsRes] = await Promise.all([
    supabase.from('nightly_submissions').select(`
      id, status, sales_total, submission_date, submitted_at, approved_at,
      locations ( name ),
      submitted_by:profiles!nightly_submissions_submitted_by_fkey ( display_name, full_name ),
      approved_by:profiles!nightly_submissions_approved_by_fkey  ( display_name, full_name )
    `).eq('submission_date', today),
    supabase.from('nightly_submission_items').select(`
      quantity_sold,
      nightly_submissions!inner ( submission_date, status )
    `).eq('nightly_submissions.submission_date', today),
]);

const subs   = subsRes.data  ?? [];
const items  = itemsRes.data ?? [];
const approved = subs.filter(s => s.status === 'approved');
const totalRev   = approved.reduce((s,r) => s + (parseFloat(r.sales_total)||0), 0);
const totalUnits = items.reduce((s,r) => s + (r.quantity_sold||0), 0);
const avgPerSub  = approved.length > 0 ? totalRev / approved.length : 0;

document.getElementById('daily-rev').textContent   = fmt(totalRev);
document.getElementById('daily-units').textContent = fmtN(totalUnits);
document.getElementById('daily-subs').textContent  = `${approved.length}/${subs.length}`;
document.getElementById('daily-avg').textContent   = fmt(avgPerSub);

document.getElementById('daily-body').innerHTML = subs.length
    ? subs.map(s => {
        const statusColor = s.status === 'approved' ? 'var(--sage)' : s.status === 'submitted' ? 'var(--gold)' : 'var(--text-muted)';
        const time = t => t ? new Date(t).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : '—';
        return `
          <tr>
            <td style="font-weight:500;">${s.locations?.name || '—'}</td>
            <td><span style="color:${statusColor};font-family:'DM Mono',monospace;font-size:0.75rem;">${s.status}</span></td>
            <td class="td-right td-mono">${s.sales_total ? fmt(parseFloat(s.sales_total)) : '—'}</td>
            <td style="color:var(--text-muted);">${s.submitted_by?.display_name || s.submitted_by?.full_name || '—'}</td>
            <td class="td-mono" style="color:var(--text-muted);font-size:0.75rem;">${time(s.submitted_at)}</td>
            <td style="color:var(--text-muted);">${s.approved_by?.display_name || s.approved_by?.full_name || '—'}</td>
          </tr>`;
      }).join('')
    : emptyRow(6, 'No submissions today yet.');
}

/* ── Export current report table ── */
window.exportCurrentReport = function() {
const tableMap = {
    sales: 'sales-table', products: 'top-products-table',
    margin: 'margin-table', inventory: 'inv-val-table',
    turnover: 'turnover-table', reorder: 'reorder-table',
    outofstock: 'oos-table', trends: 'trends-table',
    po: 'po-table', supplier: 'supplier-table',
    shrinkage: 'shrinkage-table', daily: 'daily-table',
};
exportTable(tableMap[activeSection]);
};

window.exportTable = function(tableId) {
const table = document.getElementById(tableId);
if (!table) { showToast('No table to export.'); return; }
const rows = Array.from(table.querySelectorAll('tr'));
const csv  = rows.map(r =>
    Array.from(r.querySelectorAll('th,td'))
      .map(c => `"${c.innerText.replace(/"/g,'""').replace(/\n/g,' ')}"`)
      .join(',')
).join('\n');
const blob = new Blob([csv], { type: 'text/csv' });
const a    = document.createElement('a');
a.href     = URL.createObjectURL(blob);
a.download = `pandoras-${activeSection}-${new Date().toISOString().slice(0,10)}.csv`;
a.click();
showToast('Report exported.');
};

