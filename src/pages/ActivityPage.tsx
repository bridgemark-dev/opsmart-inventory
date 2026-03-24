import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  useActivityLogs,
  useActivityStats,
  useTopUsers,
  useFilterLocations,
  useFilterUsers,
} from '@/hooks/useActivity';
import type { LogEntry, LogCategory } from '@/services/activityService';

/* ── Helpers ── */

const ICON_MAP: Record<string, { icon: string; iconClass: string }> = {
  adjustment:           { icon: '⊿', iconClass: 'inventory' },
  initial:              { icon: '●', iconClass: 'inventory' },
  sale:                 { icon: '↑', iconClass: 'sale' },
  receive:              { icon: '↓', iconClass: 'receive' },
  transfer_in:          { icon: '→', iconClass: 'receive' },
  transfer_out:         { icon: '←', iconClass: 'danger' },
  submission_submitted: { icon: '📋', iconClass: 'submission' },
  submission_approved:  { icon: '✓', iconClass: 'receive' },
  submission_rejected:  { icon: '✕', iconClass: 'danger' },
  product_created:      { icon: '+', iconClass: 'product' },
  product_updated:      { icon: '✎', iconClass: 'product' },
  product_deleted:      { icon: '✕', iconClass: 'danger' },
  product_deactivated:  { icon: '○', iconClass: 'system' },
  product_reactivated:  { icon: '●', iconClass: 'product' },
  supplier_created:     { icon: '+', iconClass: 'product' },
  supplier_updated:     { icon: '✎', iconClass: 'product' },
  supplier_deleted:     { icon: '✕', iconClass: 'danger' },
};

const TAG_LABELS: Record<LogCategory, string> = {
  inventory: 'Inventory',
  sale: 'Sale',
  receive: 'Receiving',
  submission: 'Submission',
  product: 'Product',
};

function entryTitle(e: LogEntry): string {
  switch (e.type) {
    case 'adjustment':           return `Stock adjusted — ${e.product || '—'}`;
    case 'initial':              return `Opening stock set — ${e.product || '—'}`;
    case 'sale':                 return `Sale deducted — ${e.product || '—'}`;
    case 'receive':              return `Stock received — ${e.product || '—'}`;
    case 'transfer_in':          return `Transfer received — ${e.product || '—'}`;
    case 'transfer_out':         return `Transfer sent — ${e.product || '—'}`;
    case 'submission_submitted': return `Nightly totals submitted for ${e.date}`;
    case 'submission_approved':  return `Nightly totals approved for ${e.date}`;
    case 'submission_rejected':  return `Nightly totals returned for ${e.date}`;
    case 'product_created':      return `Product added — ${e.product}`;
    case 'product_updated':      return `Product updated — ${e.product}`;
    case 'product_deleted':      return `Product removed — ${e.product}`;
    case 'product_deactivated':  return `Product deactivated — ${e.product}`;
    case 'product_reactivated':  return `Product reactivated — ${e.product}`;
    case 'supplier_created':     return `Supplier added — ${e.product}`;
    case 'supplier_updated':     return `Supplier updated — ${e.product}`;
    case 'supplier_deleted':     return `Supplier removed — ${e.product}`;
    default:                     return e.type;
  }
}

function entryDetail(e: LogEntry): string {
  const parts: string[] = [];
  if (e.before !== null && e.after !== null) parts.push(`${e.before} → ${e.after} units`);
  if (e.notes) parts.push(e.notes);
  return parts.join(' · ');
}

const CATEGORIES = [
  { key: 'all', label: 'All Activity', pillClass: 'pill-all', dotColor: 'var(--text-muted)' },
  { key: 'inventory', label: 'Inventory', pillClass: 'pill-inventory', dotColor: 'var(--gold)' },
  { key: 'sale', label: 'Sales', pillClass: 'pill-sales', dotColor: 'var(--blue)' },
  { key: 'receive', label: 'Receiving', pillClass: 'pill-receiving', dotColor: 'var(--sage)' },
  { key: 'submission', label: 'Submissions', pillClass: 'pill-submissions', dotColor: 'var(--blue)' },
  { key: 'product', label: 'Products', pillClass: 'pill-products', dotColor: 'var(--gold)' },
] as const;

const PAGE_SIZE = 50;

function defaultDateFrom(): string {
  return new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
}
function defaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── Components ── */

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const { icon, iconClass } = ICON_MAP[entry.type] ?? { icon: '●', iconClass: 'system' };
  const detail = entryDetail(entry);
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="log-entry">
      <div className={`log-icon ${iconClass}`}>{icon}</div>
      <div className="log-body">
        <div className="log-title">{entryTitle(entry)}</div>
        {detail && <div className="log-detail">{detail}</div>}
        <div className="log-meta">
          <span className="log-time">{time} · {entry.location}</span>
          <span className={`log-tag ${entry.category}`}>{TAG_LABELS[entry.category] || entry.category}</span>
          {entry.user !== 'System' && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
              {entry.user}
            </span>
          )}
        </div>
      </div>
      {entry.delta !== null && (
        <span className={`log-delta ${entry.delta > 0 ? 'positive' : entry.delta < 0 ? 'negative' : 'neutral'}`}>
          {entry.delta > 0 ? '+' : ''}{entry.delta}
        </span>
      )}
    </div>
  );
}

function StatsPanel() {
  const { data: stats, isLoading: statsLoading } = useActivityStats();
  const { data: topUsers, isLoading: usersLoading } = useTopUsers();

  const statRows = [
    { label: 'Adjustments', dotColor: 'var(--gold)', value: stats?.adjustments },
    { label: 'Sales recorded', dotColor: 'var(--blue)', value: stats?.sales },
    { label: 'Items received', dotColor: 'var(--sage)', value: stats?.received },
    { label: 'Submissions approved', dotColor: 'var(--blue)', value: stats?.submissions },
    { label: 'Units removed', dotColor: 'var(--crimson)', value: stats?.unitsRemoved },
    { label: 'Units added', dotColor: 'var(--sage)', value: stats?.unitsAdded },
  ];

  return (
    <div className="stats-card">
      <div className="card-header">
        <div className="card-title">Summary</div>
        <div className="card-action">Last 30 days</div>
      </div>

      <div>
        {statRows.map((row) => (
          <div className="stats-row" key={row.label}>
            <span className="stats-label">
              <span className="stats-dot" style={{ background: row.dotColor }} />
              {row.label}
            </span>
            <span className="stats-value">
              {statsLoading ? '—' : (row.value ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="top-users">
        <div className="top-users-title">Most Active Users</div>
        <div>
          {usersLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: "'DM Mono', monospace" }}>
              Loading…
            </div>
          ) : !topUsers?.length ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: "'DM Mono', monospace" }}>
              No activity yet.
            </div>
          ) : (
            topUsers.map((u) => (
              <div className="top-user-row" key={u.name}>
                <div className="top-user-avatar">
                  {u.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="top-user-name">{u.name}</div>
                <div className="top-user-count">{u.count} actions</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function ActivityPage() {
  const { profile } = useAuth();
  const { show } = useToast();

  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [locationId, setLocationId] = useState('');
  const [userId, setUserId] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const { data: locations } = useFilterLocations();
  const { data: users } = useFilterUsers();

  const filters = useMemo(() => ({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    locationId: locationId || undefined,
    userId: userId || undefined,
    pageSize,
  }), [dateFrom, dateTo, locationId, userId, pageSize]);

  const { data: logs, isLoading } = useActivityLogs(filters);

  // Client-side category + search filtering
  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((e) => {
      if (activeCategory !== 'all' && e.category !== activeCategory) return false;
      if (searchQuery) {
        const hay = `${e.product || ''} ${e.user} ${e.notes || ''} ${e.location} ${e.type}`.toLowerCase();
        if (!hay.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, activeCategory, searchQuery]);

  // Category counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, inventory: 0, sale: 0, receive: 0, submission: 0, product: 0 };
    (logs ?? []).forEach((e) => {
      c['all']++;
      c[e.category] = (c[e.category] || 0) + 1;
    });
    return c;
  }, [logs]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {};
    filtered.forEach((e) => {
      const date = new Date(e.timestamp).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(e);
    });
    return groups;
  }, [filtered]);

  const handleLoadMore = useCallback(() => {
    setPageSize((prev) => prev + PAGE_SIZE);
  }, []);

  const handleExport = useCallback(() => {
    if (!filtered.length) { show('No entries to export.'); return; }

    const headers = ['Timestamp', 'Category', 'Type', 'Product', 'Location', 'User', 'Delta', 'Before', 'After', 'Notes'];
    const rows = filtered.map((e) => [
      new Date(e.timestamp).toISOString(),
      e.category, e.type,
      e.product || '',
      e.location, e.user,
      e.delta ?? '',
      e.before ?? '', e.after ?? '',
      e.notes || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pandoras-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    show(`Exported ${filtered.length} entries.`);
  }, [filtered, show]);

  const subtitle = profile?.locations.length === 1
    ? `PANDORA'S BOX · ${profile.locations[0].location_name.toUpperCase()}`
    : "PANDORA'S BOX · ALL LOCATIONS";

  return (
    <>
      <PageHeader
        title="Activity Logs"
        subtitle={subtitle}
        actions={
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
        }
      />

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="page-search-wrap">
          <span className="page-search-icon">⌕</span>
          <input
            type="text"
            placeholder="Search product, user, notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">All Locations</option>
          {(locations ?? []).map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">All Users</option>
          {(users ?? []).map((u) => (
            <option key={u.id} value={u.id}>{u.display_name || u.full_name}</option>
          ))}
        </select>

        <div className="date-range-wrap">
          <input
            type="date"
            className="date-input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="date-sep">→</span>
          <input
            type="date"
            className="date-input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="filter-spacer" />
        <div className="filter-count">
          {filtered.length.toLocaleString()} {filtered.length !== 1 ? 'entries' : 'entry'}
        </div>
      </div>

      {/* Category pills */}
      <div className="category-pills">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className={`category-pill ${cat.pillClass}${activeCategory === cat.key ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            <span className="pill-dot" style={{ background: cat.dotColor }} />
            {cat.label}
            <span className="pill-count">{counts[cat.key] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="log-grid">
        {/* Log feed */}
        <div>
          <div className="log-card">
            {isLoading ? (
              <div className="log-empty">
                <Spinner />
              </div>
            ) : !filtered.length ? (
              <EmptyState message="No activity matches your current filters." />
            ) : (
              Object.entries(grouped).map(([date, entries]) => (
                <div key={date}>
                  <div className="log-date-header">
                    {date}
                    <div className="log-date-line" />
                    <span>{entries.length}</span>
                  </div>
                  {entries.map((entry) => (
                    <LogEntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              ))
            )}
          </div>

          {!isLoading && filtered.length > 0 && (logs?.length ?? 0) >= pageSize && (
            <div className="load-more-wrap">
              <button className="load-more-btn" onClick={handleLoadMore}>
                Load More
              </button>
            </div>
          )}
        </div>

        {/* Stats panel */}
        <div>
          <StatsPanel />
        </div>
      </div>
    </>
  );
}
