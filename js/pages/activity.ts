/* PAGE: activity */
import type { Database } from '../../src/types/supabase.ts';
import type { Profile as AppProfile } from '../../src/types/index.ts';
import { supabase } from '../supabase.js';

// ── Types ─────────────────────────────────────────────────────

type LogCategory = 'inventory' | 'sale' | 'receive' | 'submission' | 'product';

interface LogEntry {
  id: string;
  source: 'transaction' | 'submission' | 'audit';
  category: LogCategory;
  type: string;
  timestamp: string;
  product: string | null;
  location: string;
  user: string;
  delta: number | null;
  before: number | null;
  after: number | null;
  notes: string | null;
  refType?: string | null;
  date?: string;
  status?: string;
}

type TxRow = Database['public']['Tables']['inventory_transactions']['Row'];
type NsRow  = Database['public']['Tables']['nightly_submissions']['Row'];
type AuditRow = Database['public']['Tables']['audit_log']['Row'];

// ── Module state ──────────────────────────────────────────────

let _profile: AppProfile | null = null;

const _HTML = `<div class="page-header">
    <div>
      <div class="page-title">Activity Logs</div>
      <div class="page-subtitle">PANDORA'S BOX · ALL LOCATIONS</div>
    </div>
    <button class="btn btn-secondary" onclick="exportLogs()">Export CSV</button>
  </div>

  <div class="accent-line"></div>
  <div style="height:20px;"></div>

  <!-- Filter bar -->
  <div class="filter-bar" style="margin-bottom:16px;">
    <div class="page-search-wrap">
      <span class="page-search-icon">⌕</span>
      <input type="text" id="search-filter" placeholder="Search product, user, notes…" oninput="handleSearch(this.value)">
    </div>

    <select class="filter-select" id="location-filter" onchange="loadLogs(true)">
      <option value="">All Locations</option>
    </select>

    <select class="filter-select" id="user-filter" onchange="loadLogs(true)">
      <option value="">All Users</option>
    </select>

    <div class="date-range-wrap">
      <input type="date" class="date-input" id="date-from" onchange="loadLogs(true)">
      <span class="date-sep">→</span>
      <input type="date" class="date-input" id="date-to" onchange="loadLogs(true)">
    </div>

    <div class="filter-spacer"></div>
    <div class="filter-count" id="entry-count">— entries</div>
  </div>

  <!-- Category pills -->
  <div class="category-pills" id="category-pills">
    <div class="category-pill pill-all active" onclick="setCategory('all', this)">
      <span class="pill-dot" style="background:var(--text-muted);"></span>
      All Activity
      <span class="pill-count" id="count-all">0</span>
    </div>
    <div class="category-pill pill-inventory" onclick="setCategory('inventory', this)">
      <span class="pill-dot" style="background:var(--gold);"></span>
      Inventory
      <span class="pill-count" id="count-inventory">0</span>
    </div>
    <div class="category-pill pill-sales" onclick="setCategory('sale', this)">
      <span class="pill-dot" style="background:var(--blue);"></span>
      Sales
      <span class="pill-count" id="count-sale">0</span>
    </div>
    <div class="category-pill pill-receiving" onclick="setCategory('receive', this)">
      <span class="pill-dot" style="background:var(--sage);"></span>
      Receiving
      <span class="pill-count" id="count-receive">0</span>
    </div>
    <div class="category-pill pill-submissions" onclick="setCategory('submission', this)">
      <span class="pill-dot" style="background:var(--blue);"></span>
      Submissions
      <span class="pill-count" id="count-submission">0</span>
    </div>
    <div class="category-pill pill-products" onclick="setCategory('product', this)">
      <span class="pill-dot" style="background:var(--gold);"></span>
      Products
      <span class="pill-count" id="count-product">0</span>
    </div>
  </div>

  <!-- Main grid -->
  <div class="log-grid">

    <!-- Log feed -->
    <div>
      <div class="log-card" id="log-card">
        <div class="log-empty" id="log-loading">
          <div class="log-empty-icon">≡</div>
          <div class="log-empty-text">Loading activity…</div>
        </div>
        <div id="log-feed"></div>
      </div>

      <div class="load-more-wrap" id="load-more-wrap" style="display:none;">
        <button class="load-more-btn" id="load-more-btn" onclick="loadMore()">
          Load More
        </button>
      </div>
    </div>

    <!-- Right: stats panel -->
    <div>
      <div class="stats-card">
        <div class="card-header">
          <div class="card-title">Summary</div>
          <div class="card-action" id="stats-period">Last 30 days</div>
        </div>

        <div id="stats-rows">
          <div class="stats-row">
            <span class="stats-label">
              <span class="stats-dot" style="background:var(--gold);"></span>
              Adjustments
            </span>
            <span class="stats-value" id="stat-adjustments">—</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">
              <span class="stats-dot" style="background:var(--blue);"></span>
              Sales recorded
            </span>
            <span class="stats-value" id="stat-sales">—</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">
              <span class="stats-dot" style="background:var(--sage);"></span>
              Items received
            </span>
            <span class="stats-value" id="stat-received">—</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">
              <span class="stats-dot" style="background:var(--blue);"></span>
              Submissions approved
            </span>
            <span class="stats-value" id="stat-submissions">—</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">
              <span class="stats-dot" style="background:var(--crimson);"></span>
              Units removed
            </span>
            <span class="stats-value" id="stat-removed">—</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">
              <span class="stats-dot" style="background:var(--sage);"></span>
              Units added
            </span>
            <span class="stats-value" id="stat-added">—</span>
          </div>
        </div>

        <!-- Top users -->
        <div class="top-users">
          <div class="top-users-title">Most Active Users</div>
          <div id="top-users-list">
            <div style="color:var(--text-muted);font-size:0.75rem;font-family:'DM Mono',monospace;">Loading…</div>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /log-grid -->
<div class="notif-panel" id="notif-panel">
  <div class="notif-head">
    <span class="notif-head-title">Notifications</span>
    <span class="notif-head-clear" id="notif-clear-btn">Mark all read</span>
  </div>
  <div class="notif-list" id="notif-list">
    <div style="padding:16px;text-align:center;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;">Loading…</div>
  </div>
</div>`;

export async function init(profile: AppProfile): Promise<void> {
  _profile = profile;
  document.getElementById('outlet')!.innerHTML = _HTML;

  await _run(profile);
}

/* ── State ── */
let allEntries: LogEntry[]     = [];
let filtered: LogEntry[]       = [];
let activeCategory: string     = 'all';
let searchQuery: string        = '';
let offset: number             = 0;
const PAGE_SIZE                = 50;
let hasMore: boolean           = false;

/* ── Init ── */
async function _run(profile: AppProfile): Promise<void> {
    const _subEl = document.getElementById('page-subtitle');
    if (_subEl) _subEl.textContent = "PANDORA'S BOX · " + (profile.locations.length === 1 ? profile.locations[0].location_name.toUpperCase() : 'ALL LOCATIONS');

    // Set default date range: last 30 days
    const today    = new Date().toISOString().slice(0,10);
    const thirtyAgo = new Date(Date.now() - 30*864e5).toISOString().slice(0,10);
    (document.getElementById('date-from') as HTMLInputElement).value = thirtyAgo;
    (document.getElementById('date-to') as HTMLInputElement).value   = today;

    await Promise.all([populateDropdowns(), loadLogs(true), loadStats()]);
}

/* ── Populate filter dropdowns ── */
async function populateDropdowns(): Promise<void> {
    // Locations
    const { data: locs } = await supabase
      .from('locations').select('id,name').eq('is_active', true).order('name');
    const locSel = document.getElementById('location-filter') as HTMLSelectElement;
    (locs ?? []).forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id; opt.textContent = l.name;
      locSel.appendChild(opt);
    });

    // Users
    const { data: users } = await supabase
      .from('profiles').select('id,display_name,full_name').eq('is_active', true).order('full_name');
    const userSel = document.getElementById('user-filter') as HTMLSelectElement;
    (users ?? []).forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id; opt.textContent = u.display_name || u.full_name;
      userSel.appendChild(opt);
    });
}

/* ── Load logs ── */
window.loadLogs = async function(reset = false): Promise<void> {
    if (reset) { offset = 0; allEntries = []; }

    (document.getElementById('log-loading') as HTMLElement).style.display = reset ? '' : 'none';
    if (reset) (document.getElementById('log-feed') as HTMLElement).innerHTML = '';

    const dateFrom = (document.getElementById('date-from') as HTMLInputElement).value;
    const dateTo   = (document.getElementById('date-to') as HTMLInputElement).value;
    const locId    = (document.getElementById('location-filter') as HTMLSelectElement).value;
    const userId   = (document.getElementById('user-filter') as HTMLSelectElement).value;

    // ── Fetch inventory transactions ──────────────────────────
    let txQuery = supabase
      .from('inventory_transactions')
      .select(`
        id, type, quantity_delta, quantity_before, quantity_after,
        notes, created_at, reference_type,
        products  ( name, product_number, categories(category_number) ),
        locations ( id, name ),
        profiles  ( id, display_name, full_name )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (dateFrom) txQuery = txQuery.gte('created_at', dateFrom + 'T00:00:00');
    if (dateTo)   txQuery = txQuery.lte('created_at', dateTo   + 'T23:59:59');
    if (locId)    txQuery = txQuery.eq('location_id', locId);
    if (userId)   txQuery = txQuery.eq('performed_by', userId);

    // ── Fetch nightly submission events ──────────────────────
    let nsQuery = supabase
      .from('nightly_submissions')
      .select(`
        id, status, submission_date, sales_total, submitted_at, approved_at,
        locations ( id, name ),
        submitted_by:profiles!nightly_submissions_submitted_by_fkey ( id, display_name, full_name ),
        approved_by:profiles!nightly_submissions_approved_by_fkey  ( id, display_name, full_name )
      `)
      .in('status', ['submitted','approved','rejected'])
      .order('approved_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (dateFrom) nsQuery = nsQuery.gte('submission_date', dateFrom);
    if (dateTo)   nsQuery = nsQuery.lte('submission_date', dateTo);
    if (locId)    nsQuery = nsQuery.eq('location_id', locId);

    // ── Fetch audit log (products/suppliers) ────────────────
    let auditQuery = supabase
      .from('audit_log')
      .select('id, event_type, entity_type, entity_name, entity_id, details, created_at, changed_by')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (dateFrom) auditQuery = auditQuery.gte('created_at', dateFrom + 'T00:00:00');
    if (dateTo)   auditQuery = auditQuery.lte('created_at', dateTo   + 'T23:59:59');

    const [txRes, nsRes, auditRes] = await Promise.all([txQuery, nsQuery, auditQuery]);

    // Normalize inventory transactions
    const txEntries: LogEntry[] = (txRes.data ?? []).map((tx: any) => ({
      id:        tx.id,
      source:    'transaction' as const,
      category:  txCategory(tx.type),
      type:      tx.type,
      timestamp: tx.created_at,
      product:   tx.products ? `${tx.products.categories?.category_number}/${tx.products.product_number} — ${tx.products.name}` : null,
      location:  tx.locations?.name ?? '—',
      user:      tx.profiles?.display_name || tx.profiles?.full_name || 'System',
      delta:     tx.quantity_delta,
      before:    tx.quantity_before,
      after:     tx.quantity_after,
      notes:     tx.notes,
      refType:   tx.reference_type,
    }));

    // Normalize nightly submissions
    const nsEntries: LogEntry[] = (nsRes.data ?? []).map((ns: any) => ({
      id:        ns.id,
      source:    'submission' as const,
      category:  'submission' as const,
      type:      'submission_' + ns.status,
      timestamp: ns.approved_at || ns.submitted_at || ns.submission_date,
      product:   null,
      location:  ns.locations?.name ?? '—',
      user:      ns.status === 'approved'
                   ? (ns.approved_by?.display_name || ns.approved_by?.full_name || '—')
                   : (ns.submitted_by?.display_name || ns.submitted_by?.full_name || '—'),
      delta:     null,
      before:    null,
      after:     null,
      notes:     ns.sales_total ? `$${parseFloat(ns.sales_total).toFixed(2)} sales total` : null,
      date:      ns.submission_date,
      status:    ns.status,
    }));

    // Normalize audit log entries
    const auditEntries: LogEntry[] = (auditRes.data ?? []).map((a: any) => ({
      id:        a.id,
      source:    'audit' as const,
      category:  'product' as const,
      type:      a.event_type,
      timestamp: a.created_at,
      product:   a.entity_name ?? '—',
      location:  '—',
      user:      'System',
      delta:     null,
      before:    null,
      after:     null,
      notes:     null,
    }));

    // Merge and sort by timestamp
    const newEntries = [...txEntries, ...nsEntries, ...auditEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, PAGE_SIZE);

    allEntries = reset ? newEntries : [...allEntries, ...newEntries];
    hasMore = newEntries.length === PAGE_SIZE;

    (document.getElementById('log-loading') as HTMLElement).style.display = 'none';
    (document.getElementById('load-more-wrap') as HTMLElement).style.display = hasMore ? '' : 'none';

    updateCounts();
    applyFilter();
};

function txCategory(type: string): LogCategory {
    if (['adjustment','initial'].includes(type))               return 'inventory';
    if (type === 'sale')                                       return 'sale';
    if (['receive','transfer_in','transfer_out'].includes(type)) return 'receive';
    return 'inventory';
}

/* ── Category filter ── */
window.setCategory = function(cat: string, el: HTMLElement): void {
    activeCategory = cat;
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    applyFilter();
};

window.handleSearch = function(val: string): void {
    searchQuery = val.toLowerCase().trim();
    (document.getElementById('search-filter') as HTMLInputElement).value = val;
    (document.getElementById('global-search') as HTMLInputElement).value = val;
    applyFilter();
};

function applyFilter(): void {
    filtered = allEntries.filter(e => {
      if (activeCategory !== 'all' && e.category !== activeCategory) return false;
      if (searchQuery) {
        const hay = `${e.product || ''} ${e.user} ${e.notes || ''} ${e.location} ${e.type}`.toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });

    const el = document.getElementById('entry-count') as HTMLElement;
    el.textContent = `${filtered.length.toLocaleString()} entr${filtered.length !== 1 ? 'ies' : 'y'}`;

    renderFeed();
}

/* ── Update pill counts ── */
function updateCounts(): void {
    const counts: Record<string, number> = { all:0, inventory:0, sale:0, receive:0, submission:0, product:0 };
    allEntries.forEach(e => {
      counts['all']++;
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    Object.entries(counts).forEach(([cat, n]) => {
      const el = document.getElementById('count-' + cat);
      if (el) el.textContent = String(n);
    });
}

/* ── Render feed ── */
function renderFeed(): void {
    const feed = document.getElementById('log-feed') as HTMLElement;

    if (!filtered.length) {
      feed.innerHTML = `
        <div class="log-empty">
          <div class="log-empty-icon">≡</div>
          <div class="log-empty-text">No activity matches your current filters.</div>
        </div>`;
      return;
    }

    // Group by date
    const groups: Record<string, LogEntry[]> = {};
    filtered.forEach(e => {
      const date = new Date(e.timestamp).toLocaleDateString('en-US', {
        weekday:'long', year:'numeric', month:'long', day:'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(e);
    });

    feed.innerHTML = Object.entries(groups).map(([date, entries]) => `
      <div class="log-date-group">
        <div class="log-date-header">
          ${date}
          <div class="log-date-line"></div>
          <span>${entries.length}</span>
        </div>
        ${entries.map(e => renderEntry(e)).join('')}
      </div>`).join('');
}

function renderEntry(e: LogEntry): string {
    const { icon, iconClass } = entryIcon(e);
    const delta = e.delta !== null
      ? `<span class="log-delta ${e.delta > 0 ? 'positive' : e.delta < 0 ? 'negative' : 'neutral'}">
           ${e.delta > 0 ? '+' : ''}${e.delta}
         </span>`
      : '';

    const title = entryTitle(e);
    const detail = entryDetail(e);
    const tagClass = e.category;
    const tagLabel = entryTagLabel(e);
    const time = new Date(e.timestamp).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });

    return `
      <div class="log-entry">
        <div class="log-icon ${iconClass}">${icon}</div>
        <div class="log-body">
          <div class="log-title">${title}</div>
          ${detail ? `<div class="log-detail">${detail}</div>` : ''}
          <div class="log-meta">
            <span class="log-time">${time} · ${e.location}</span>
            <span class="log-tag ${tagClass}">${tagLabel}</span>
            ${e.user !== 'System' ? `<span style="font-size:0.65rem;color:var(--text-muted);font-family:'DM Mono',monospace;">${e.user}</span>` : ''}
          </div>
        </div>
        ${delta}
      </div>`;
}

function entryIcon(e: LogEntry): { icon: string; iconClass: string } {
    const map: Record<string, { icon: string; iconClass: string }> = {
      adjustment:           { icon: '⊿', iconClass: 'inventory' },
      initial:              { icon: '●', iconClass: 'inventory' },
      sale:                 { icon: '↑', iconClass: 'sale'      },
      receive:              { icon: '↓', iconClass: 'receive'   },
      transfer_in:          { icon: '→', iconClass: 'receive'   },
      transfer_out:         { icon: '←', iconClass: 'danger'    },
      submission_submitted: { icon: '📋', iconClass: 'submission'},
      submission_approved:  { icon: '✓',  iconClass: 'receive'  },
      submission_rejected:  { icon: '✕',  iconClass: 'danger'   },
      product_created:      { icon: '+',  iconClass: 'product'  },
      product_updated:      { icon: '✎',  iconClass: 'product'  },
      product_deleted:      { icon: '✕',  iconClass: 'danger'   },
      product_deactivated:  { icon: '○',  iconClass: 'system'   },
      product_reactivated:  { icon: '●',  iconClass: 'product'  },
      supplier_created:     { icon: '+',  iconClass: 'product'  },
      supplier_updated:     { icon: '✎',  iconClass: 'product'  },
      supplier_deleted:     { icon: '✕',  iconClass: 'danger'   },
    };
    return map[e.type] ?? { icon: '●', iconClass: 'system' };
}

function entryTitle(e: LogEntry): string {
    switch(e.type) {
      case 'adjustment':          return `Stock adjusted — <strong>${e.product || '—'}</strong>`;
      case 'initial':             return `Opening stock set — <strong>${e.product || '—'}</strong>`;
      case 'sale':                return `Sale deducted — <strong>${e.product || '—'}</strong>`;
      case 'receive':             return `Stock received — <strong>${e.product || '—'}</strong>`;
      case 'transfer_in':         return `Transfer received — <strong>${e.product || '—'}</strong>`;
      case 'transfer_out':        return `Transfer sent — <strong>${e.product || '—'}</strong>`;
      case 'submission_submitted': return `Nightly totals submitted for <strong>${e.date}</strong>`;
      case 'submission_approved':  return `Nightly totals approved for <strong>${e.date}</strong>`;
      case 'submission_rejected':  return `Nightly totals returned for <strong>${e.date}</strong>`;
      case 'product_created':      return `Product added — <strong>${e.product}</strong>`;
      case 'product_updated':      return `Product updated — <strong>${e.product}</strong>`;
      case 'product_deleted':      return `Product removed — <strong>${e.product}</strong>`;
      case 'product_deactivated':  return `Product deactivated — <strong>${e.product}</strong>`;
      case 'product_reactivated':  return `Product reactivated — <strong>${e.product}</strong>`;
      case 'supplier_created':     return `Supplier added — <strong>${e.product}</strong>`;
      case 'supplier_updated':     return `Supplier updated — <strong>${e.product}</strong>`;
      case 'supplier_deleted':     return `Supplier removed — <strong>${e.product}</strong>`;
      default:                     return e.type;
    }
}

function entryDetail(e: LogEntry): string {
    const parts: string[] = [];
    if (e.before !== null && e.after !== null) {
      parts.push(`${e.before} → ${e.after} units`);
    }
    if (e.notes) parts.push(e.notes);
    return parts.join(' · ');
}

function entryTagLabel(e: LogEntry): string {
    const map: Record<LogCategory, string> = {
      inventory:  'Inventory',
      sale:       'Sale',
      receive:    'Receiving',
      submission: 'Submission',
      product:    'Product',
    };
    return map[e.category] || e.category;
}

/* ── Load more ── */
window.loadMore = async function(): Promise<void> {
    offset += PAGE_SIZE;
    const btn = document.getElementById('load-more-btn') as HTMLButtonElement;
    btn.disabled = true; btn.textContent = 'Loading…';
    await (window.loadLogs as (reset: boolean) => Promise<void>)(false);
    btn.disabled = false; btn.textContent = 'Load More';
};

/* ── Stats panel ── */
async function loadStats(): Promise<void> {
    const thirtyAgo = new Date(Date.now() - 30*864e5).toISOString();

    const [adjRes, saleRes, recRes, subRes] = await Promise.all([
      supabase.from('inventory_transactions').select('quantity_delta')
        .eq('type','adjustment').gte('created_at', thirtyAgo),
      supabase.from('inventory_transactions').select('quantity_delta', { count:'exact', head:true })
        .eq('type','sale').gte('created_at', thirtyAgo),
      supabase.from('inventory_transactions').select('quantity_delta')
        .eq('type','receive').gte('created_at', thirtyAgo),
      supabase.from('nightly_submissions').select('id', { count:'exact', head:true })
        .eq('status','approved').gte('submission_date', thirtyAgo.slice(0,10)),
    ]);

    const adjRows = adjRes.data  ?? [];
    const recRows = recRes.data  ?? [];

    const unitsAdded   = recRows.reduce((s, r) => s + Math.max(0, r.quantity_delta ?? 0), 0)
                       + adjRows.filter(r => (r.quantity_delta ?? 0) > 0).reduce((s, r) => s + (r.quantity_delta ?? 0), 0);
    const unitsRemoved = Math.abs(adjRows.filter(r => (r.quantity_delta ?? 0) < 0).reduce((s, r) => s + (r.quantity_delta ?? 0), 0));

    (document.getElementById('stat-adjustments') as HTMLElement).textContent = String(adjRows.length);
    (document.getElementById('stat-sales') as HTMLElement).textContent       = String(saleRes.count ?? 0);
    (document.getElementById('stat-received') as HTMLElement).textContent    = String(recRows.reduce((s, r) => s + (r.quantity_delta ?? 0), 0));
    (document.getElementById('stat-submissions') as HTMLElement).textContent = String(subRes.count ?? 0);
    (document.getElementById('stat-removed') as HTMLElement).textContent     = unitsRemoved.toLocaleString();
    (document.getElementById('stat-added') as HTMLElement).textContent       = unitsAdded.toLocaleString();

    // Top users
    const { data: txUsers } = await supabase
      .from('inventory_transactions')
      .select('performed_by, profiles(display_name, full_name)')
      .gte('created_at', thirtyAgo)
      .not('performed_by', 'is', null);

    const userCounts: Record<string, { name: string; count: number }> = {};
    (txUsers ?? []).forEach((tx: any) => {
      const id   = tx.performed_by as string;
      const name = tx.profiles?.display_name || tx.profiles?.full_name || 'Unknown';
      userCounts[id] = userCounts[id] || { name, count: 0 };
      userCounts[id].count++;
    });

    const topUsers = Object.values(userCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    (document.getElementById('top-users-list') as HTMLElement).innerHTML = topUsers.length
      ? topUsers.map(u => `
          <div class="top-user-row">
            <div class="top-user-avatar">${u.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0,2)}</div>
            <div class="top-user-name">${u.name}</div>
            <div class="top-user-count">${u.count} actions</div>
          </div>`)
        .join('')
      : '<div style="color:var(--text-muted);font-size:0.75rem;font-family:\'DM Mono\',monospace;">No activity yet.</div>';
}

/* ── Export CSV ── */
window.exportLogs = function(): void {
    if (!filtered.length) { (window as any).showToast('No entries to export.'); return; }

    const headers = ['Timestamp','Category','Type','Product','Location','User','Delta','Before','After','Notes'];
    const rows = filtered.map(e => [
      new Date(e.timestamp).toISOString(),
      e.category, e.type,
      e.product || '',
      e.location, e.user,
      e.delta ?? '',
      e.before ?? '', e.after ?? '',
      e.notes || '',
    ]);

    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `pandoras-activity-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    (window as any).showToast(`Exported ${filtered.length} entries.`);
};
