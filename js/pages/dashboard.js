/* PAGE: dashboard */
import { supabase, getTopRole, getLocationLabel } from '../supabase.js';

const COLORS = ['#c9a84c','#4c8fc9','#4cc97a','#c94c7a','#9b4cc9','#c97a4c','#4cc9c9'];

const _HTML = `  <div class="page-header">
    <div>
      <div class="page-title">Dashboard</div>
      <div class="page-subtitle" id="page-subtitle">Loading…</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <button class="btn btn-primary" id="qa-add-product" onclick="navigateTo('/products')">+ Add Product</button>
      <button class="btn btn-secondary" id="qa-adjust-inv" onclick="navigateTo('/inventory')">⊿ Adjust Inventory</button>
      <button class="btn btn-secondary" onclick="navigateTo('/nightly')">⊕ Nightly Totals</button>
      <button class="btn btn-secondary" id="qa-create-po" onclick="navigateTo('/purchase-orders')">◳ Create PO</button>
    </div>
  </div>
  <div class="accent-line"></div>
  <div style="height:20px;"></div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-top"><div class="kpi-label">Inventory Value</div><div class="kpi-icon">$</div></div><div class="kpi-value" id="kpi-value">—</div><div class="kpi-delta" id="kpi-value-delta">Loading…</div></div>
    <div class="kpi-card info"><div class="kpi-top"><div class="kpi-label">Units in Stock</div><div class="kpi-icon">◫</div></div><div class="kpi-value" id="kpi-units">—</div><div class="kpi-delta" id="kpi-units-delta">Loading…</div></div>
    <div class="kpi-card danger"><div class="kpi-top"><div class="kpi-label">Low Stock Items</div><div class="kpi-icon">⚠</div></div><div class="kpi-value" id="kpi-low">—</div><div class="kpi-delta" id="kpi-low-delta">Loading…</div></div>
    <div class="kpi-card success"><div class="kpi-top"><div class="kpi-label">Weekly Sales</div><div class="kpi-icon">↑</div></div><div class="kpi-value" id="kpi-sales">—</div><div class="kpi-delta" id="kpi-sales-delta">Loading…</div></div>
  </div>
  <div class="mid-grid">
    <div class="card">
      <div class="card-header"><div class="card-title">Sales Trend</div></div>
      <div style="padding:20px;"><svg id="trend-chart" viewBox="0 0 800 200" style="width:100%;min-height:160px;"><text x="400" y="100" fill="rgba(240,237,232,0.15)" text-anchor="middle" font-family="DM Mono" font-size="11">Sales trend available in Reports & Analytics</text></svg></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Top Sellers</div><div class="card-action" onclick="navigateTo('/reports')" style="cursor:pointer;">View all ↗</div></div>
      <div class="product-list" id="top-sellers-list"><div style="padding:20px;color:var(--text-muted);font-size:0.78rem;">Loading…</div></div>
    </div>
  </div>
  <div class="bottom-grid">
    <div class="card">
      <div class="card-header"><div class="card-title">Activity Feed</div><div class="card-action" onclick="navigateTo('/activity')" style="cursor:pointer;">View logs ↗</div></div>
      <div class="activity-list" id="activity-list"><div style="padding:20px;color:var(--text-muted);font-size:0.78rem;">Loading…</div></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Recently Added</div><div class="card-action" onclick="navigateTo('/products')" style="cursor:pointer;">See all ↗</div></div>
      <div class="recent-grid" id="recent-grid"><div style="padding:20px;color:var(--text-muted);font-size:0.78rem;">Loading…</div></div>
    </div>
  </div>`;

export async function init(profile) {
  document.getElementById('outlet').innerHTML = _HTML;

  const role = getTopRole(profile);
  // Freeze locLabel as a plain string so the clock closure never re-evaluates it
  const locs = Array.isArray(profile?.locations) ? profile.locations : [];
  const locLabel = String(locs.length === 1 ? locs[0].location_name.toUpperCase() : 'ALL LOCATIONS');

  // Live clock — locLabel is captured once above, never changes
  if (window._dashClock) clearInterval(window._dashClock);
  const _frozen = locLabel; // explicit closure capture
  function updateClock() {
    const now  = new Date();
    const date = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).toUpperCase();
    const time = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const el   = document.getElementById('page-subtitle');
    if (el) el.textContent = date + ' · ' + time + ' · ' + _frozen;
  }
  updateClock();
  window._dashClock = setInterval(updateClock, 1000);

  // Role-based quick actions
  if (role === 'employee') {
    ['qa-add-product','qa-adjust-inv','qa-create-po'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  await Promise.all([loadKpis(), loadTopSellers(), loadRecentProducts(), loadActivityFeed()]);
}



/* ── Init ────────────────────────────────────────────────── */


/* ── KPIs ────────────────────────────────────────────────── */
async function loadKpis() {
  const today       = new Date().toISOString().slice(0,10);
  const yesterday   = new Date(Date.now() - 864e5).toISOString().slice(0,10);
  const weekAgo     = new Date(Date.now() - 7*864e5).toISOString().slice(0,10);
  const twoWeeksAgo = new Date(Date.now() - 14*864e5).toISOString().slice(0,10);

  const [invRes, lowRes, salesRes, ystRes, valueRes] = await Promise.all([
    supabase.from('inventory_status').select('quantity_on_hand, location_name'),
    supabase.from('low_stock_alerts').select('product_id', { count:'exact', head:true }),
    // Weekly sales (last 7 days)
    supabase.from('nightly_submissions').select('sales_total')
      .eq('status','approved').gte('submission_date', weekAgo),
    // Previous 7 days for delta comparison
    supabase.from('nightly_submissions').select('sales_total')
      .eq('status','approved').gte('submission_date', twoWeeksAgo).lt('submission_date', weekAgo),
    supabase.from('inventory').select('quantity_on_hand, products(cost_price, retail_price)'),
  ]);

  const invRows    = invRes.data  ?? [];
  const totalUnits = invRows.reduce((s,r) => s + (r.quantity_on_hand || 0), 0);
  const locCount   = new Set(invRows.map(r => r.location_name)).size || 3;

  const totalValue = (valueRes.data ?? []).reduce((s,r) => {
    const price = r.products?.cost_price ?? r.products?.retail_price ?? 0;
    return s + ((r.quantity_on_hand || 0) * price);
  }, 0);

  const lowCount   = lowRes.count ?? 0;
  const todaySales = (salesRes.data ?? []).reduce((s,r) => s + (parseFloat(r.sales_total)||0), 0);
  const ystSales   = (ystRes.data   ?? []).reduce((s,r) => s + (parseFloat(r.sales_total)||0), 0);
  const salesDelta = ystSales > 0 ? ((todaySales - ystSales) / ystSales * 100).toFixed(1) : null;

  // Delta labels
  document.getElementById('kpi-value-delta').textContent = 'at cost across all locations';

  document.getElementById('kpi-units-delta').textContent =
    `across ${locCount} location${locCount !== 1 ? 's' : ''}`;

  const lowDeltaEl = document.getElementById('kpi-low-delta');
  lowDeltaEl.className = 'kpi-delta' + (lowCount > 0 ? ' down' : '');
  lowDeltaEl.textContent = lowCount > 0
    ? `${lowCount} item${lowCount !== 1 ? 's' : ''} need restocking`
    : 'All items well-stocked';

  const salesDeltaEl = document.getElementById('kpi-sales-delta');
  salesDeltaEl.className = 'kpi-delta' +
    (salesDelta > 0 ? ' up' : salesDelta < 0 ? ' down' : '');
  salesDeltaEl.textContent = salesDelta !== null
    ? `${salesDelta > 0 ? '↑' : '↓'} ${Math.abs(salesDelta)}% vs last week`
    : 'No approved submissions this week';

  // Animate numbers
  animateValue(document.getElementById('kpi-value'),  totalValue,  '$');
  animateValue(document.getElementById('kpi-units'),  totalUnits,  '');
  animateValue(document.getElementById('kpi-low'),    lowCount,    '');
  animateValue(document.getElementById('kpi-sales'),  todaySales,  '$');
}

function animateValue(el, end, prefix='', duration=900) {
  if (!el) return;
  const startTime = performance.now();
  function update(now) {
    const pct     = Math.min((now - startTime) / duration, 1);
    const ease    = 1 - Math.pow(1 - pct, 3);
    const current = Math.round(end * ease);
    el.textContent = prefix + current.toLocaleString();
    if (pct < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ── Top Sellers ─────────────────────────────────────────── */
async function loadTopSellers() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0,10);
  const el = document.getElementById('top-sellers-list');

  const { data } = await supabase
    .from('nightly_submission_items')
    .select(`
      quantity_sold,
      products ( id, name, brand, categories ( name ) ),
      nightly_submissions!inner ( submission_date, status )
    `)
    .eq('nightly_submissions.status', 'approved')
    .gte('nightly_submissions.submission_date', thirtyDaysAgo);

  if (!data?.length) {
    el.innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--text-muted);
                  font-family:'DM Mono',monospace;font-size:0.78rem;line-height:1.6;">
        No sales data yet.<br>Approve nightly submissions to see top sellers.
      </div>`;
    return;
  }

  // Aggregate by product
  const totals = {};
  data.forEach(row => {
    const id = row.products?.id;
    if (!id) return;
    if (!totals[id]) {
      totals[id] = {
        name:  row.products.name,
        brand: row.products.brand,
        cat:   row.products.categories?.name,
        qty:   0,
      };
    }
    totals[id].qty += row.quantity_sold;
  });

  const sorted = Object.values(totals).sort((a,b) => b.qty - a.qty).slice(0,5);
  const maxQty = sorted[0]?.qty || 1;

  el.innerHTML = sorted.map((p, i) => {
    const pct = Math.round(p.qty / maxQty * 100);
    return `
      <div class="product-row">
        <div class="product-rank">#${i+1}</div>
        <div class="product-color" style="background:${COLORS[i]};"></div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-cat">${p.cat || '—'}${p.brand ? ' · ' + p.brand : ''}</div>
        </div>
        <div class="product-sales">
          <div class="product-units">${p.qty.toLocaleString()} sold</div>
          <div class="product-bar-wrap">
            <div class="product-bar" style="width:${pct}%;background:${COLORS[i]};"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ── Recently Added ──────────────────────────────────────── */
async function loadRecentProducts() {
  const el = document.getElementById('recent-grid');

  const { data } = await supabase
    .from('products')
    .select(`
      id, name, brand, retail_price, created_at,
      categories ( name ),
      inventory ( quantity_on_hand, reorder_point )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6);

  if (!data?.length) {
    el.innerHTML = `
      <div style="grid-column:1/-1;padding:24px;text-align:center;
                  color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.78rem;">
        No products yet. Import your catalog to get started.
      </div>`;
    return;
  }

  el.innerHTML = data.map(p => {
    const totalQty = (p.inventory ?? []).reduce((s,i) => s + (i.quantity_on_hand||0), 0);
    const isLow    = (p.inventory ?? []).some(i => i.quantity_on_hand <= i.reorder_point);
    const badgeCls = isLow ? 'low' : 'ok';
    const badgeTxt = isLow ? '● Low' : '● In Stock';
    const price    = p.retail_price ? '$' + parseFloat(p.retail_price).toFixed(2) : '—';

    return `
      <div class="recent-item">
        <div class="recent-tag">${p.categories?.name || '—'}</div>
        <div class="recent-name">${p.name}</div>
        <div class="recent-meta">${price} · ${totalQty} units</div>
        <div style="margin-top:8px;">
          <span class="badge ${badgeCls}">${badgeTxt}</span>
        </div>
      </div>`;
  }).join('');
}

/* ── Activity Feed ───────────────────────────────────────── */
async function loadActivityFeed() {
  const el = document.getElementById('activity-list');

  const { data } = await supabase
    .from('inventory_transactions')
    .select(`
      id, type, quantity_delta, notes, created_at,
      products  ( name ),
      locations ( name ),
      profiles  ( display_name, full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(8);

  if (!data?.length) {
    el.innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--text-muted);
                  font-family:'DM Mono',monospace;font-size:0.78rem;">
        No activity yet.
      </div>`;
    return;
  }

  const typeColor = {
    sale:         'var(--blue)',
    receive:      'var(--sage)',
    adjustment:   'var(--gold)',
    initial:      'var(--gold)',
    transfer_in:  'var(--sage)',
    transfer_out: 'var(--crimson)',
  };

  const typeLabel = {
    sale:         'Sale',
    receive:      'Stock received',
    adjustment:   'Stock adjusted',
    initial:      'Opening stock set',
    transfer_in:  'Transfer in',
    transfer_out: 'Transfer out',
  };

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' hr ago';
    return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric' });
  }

  el.innerHTML = data.map((tx, i) => {
    const color    = typeColor[tx.type]  || 'var(--text-muted)';
    const label    = typeLabel[tx.type]  || tx.type;
    const who      = tx.profiles?.display_name || tx.profiles?.full_name || 'System';
    const product  = tx.products?.name   || '—';
    const location = tx.locations?.name  || '—';
    const delta    = tx.quantity_delta > 0 ? '+' + tx.quantity_delta : tx.quantity_delta;
    const isLast   = i === data.length - 1;

    return `
      <div class="activity-item">
        <div class="activity-dot-wrap">
          <div class="activity-dot" style="background:${color};"></div>
          ${isLast ? '' : '<div class="activity-line"></div>'}
        </div>
        <div class="activity-body">
          <div class="activity-text">
            <strong>${label}:</strong> ${product}
            <span style="color:var(--text-muted);"> (${delta} units) · ${location}</span>
          </div>
          <div class="activity-time">${timeAgo(tx.created_at)} · ${who}</div>
        </div>
      </div>`;
  }).join('');
}

