import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SalesSummaryTab } from '@/components/reports/SalesSummaryTab';
import { InventoryValuationTab } from '@/components/reports/InventoryValuationTab';
import { reportService, type POReportSummary } from '@/services/reportService';
import { useActivityLogs } from '@/hooks/useActivity';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';

const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString();

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type Tab = 'sales' | 'inventory' | 'po' | 'activity';

const TABS: { key: Tab; label: string }[] = [
  { key: 'sales', label: 'Sales Summary' },
  { key: 'inventory', label: 'Inventory Valuation' },
  { key: 'po', label: 'Purchase Orders' },
  { key: 'activity', label: 'Activity' },
];

/* ---------- PO Tab ---------- */
function POReportTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-po', from, to],
    queryFn: () => reportService.getPOReport(from, to),
    staleTime: 120_000,
  });

  function exportCsv(d: POReportSummary) {
    const headers = ['PO #', 'Supplier', 'Location', 'Ordered', 'Expected', 'Status', 'Items', 'Total Cost'];
    const rows = [headers.join(',')];
    d.rows.forEach(r => {
      rows.push([
        `"${r.po_number}"`, `"${r.supplier_name}"`, `"${r.location_name}"`,
        r.ordered_at ?? '', r.expected_at ?? '', r.status, r.item_count, r.total_cost.toFixed(2),
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pandoras-po-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading || !data) return <Spinner />;

  return (
    <div>
      <div className="inv-kpi-strip" style={{ marginBottom: 24 }}>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Open POs</div>
          <div className="inv-kpi-value">{data.openCount}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Incoming Value</div>
          <div className="inv-kpi-value">{fmt(data.incomingValue)}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Received</div>
          <div className="inv-kpi-value" style={{ color: 'var(--sage)' }}>{data.receivedCount}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Total Spent</div>
          <div className="inv-kpi-value">{fmt(data.totalSpent)}</div>
        </div>
      </div>

      <div className="report-card">
        <div className="report-card-header">
          <div className="report-card-title">Purchase Orders</div>
          <div className="card-action" onClick={() => exportCsv(data)} style={{ cursor: 'pointer' }}>Export CSV ↗</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Supplier</th>
                <th>Location</th>
                <th>Ordered</th>
                <th>Expected</th>
                <th>Status</th>
                <th className="td-right">Items</th>
                <th className="td-right">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr><td colSpan={8} className="report-empty">No purchase orders for this period.</td></tr>
              ) : (
                data.rows.map(r => (
                  <tr key={r.po_number}>
                    <td className="td-mono" style={{ color: 'var(--gold)', fontWeight: 600 }}>{r.po_number}</td>
                    <td style={{ fontWeight: 500 }}>{r.supplier_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.location_name}</td>
                    <td className="td-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(r.ordered_at)}</td>
                    <td className="td-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(r.expected_at)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="td-right td-mono">{r.item_count}</td>
                    <td className="td-right td-mono">{r.total_cost > 0 ? fmt(r.total_cost) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Activity Tab ---------- */
function ActivityReportTab({ from, to }: { from: string; to: string }) {
  const { data: logs = [], isLoading } = useActivityLogs({ dateFrom: from, dateTo: to, pageSize: 200 });

  function exportCsv() {
    const headers = ['Timestamp', 'Category', 'Type', 'Product', 'Location', 'User', 'Delta', 'Notes'];
    const rows = [headers.join(',')];
    logs.forEach((l: any) => {
      rows.push([
        `"${l.timestamp}"`, l.category, l.type, `"${l.product ?? ''}"`,
        `"${l.location}"`, `"${l.user}"`, l.delta ?? '', `"${(l.notes ?? '').replace(/"/g, '""')}"`,
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pandoras-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <Spinner />;

  const categories = [...new Set(logs.map((l: any) => l.category))];
  const countByCategory = categories.map(c => ({
    name: c,
    count: logs.filter((l: any) => l.category === c).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="inv-kpi-strip" style={{ marginBottom: 24 }}>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Total Events</div>
          <div className="inv-kpi-value">{fmtN(logs.length)}</div>
        </div>
        {countByCategory.slice(0, 3).map(c => (
          <div className="inv-kpi" key={c.name}>
            <div className="inv-kpi-label" style={{ textTransform: 'capitalize' }}>{c.name}</div>
            <div className="inv-kpi-value">{fmtN(c.count)}</div>
          </div>
        ))}
      </div>

      <div className="report-card">
        <div className="report-card-header">
          <div className="report-card-title">Activity Log</div>
          <div className="card-action" onClick={exportCsv} style={{ cursor: 'pointer' }}>Export CSV ↗</div>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Category</th>
                <th>Type</th>
                <th>Product</th>
                <th>Location</th>
                <th>User</th>
                <th className="td-right">Delta</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={8} className="report-empty">No activity for this period.</td></tr>
              ) : (
                logs.map((l: any) => (
                  <tr key={l.id}>
                    <td className="td-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(l.timestamp)}
                    </td>
                    <td><span className="tag" style={{ textTransform: 'capitalize' }}>{l.category}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{l.type}</td>
                    <td style={{ fontWeight: 500 }}>{l.product || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.location}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.user}</td>
                    <td className="td-right td-mono">
                      {l.delta != null ? (
                        <span style={{ color: l.delta > 0 ? 'var(--sage)' : l.delta < 0 ? 'var(--crimson)' : 'var(--text-muted)' }}>
                          {l.delta > 0 ? '+' : ''}{l.delta}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekAgo = useMemo(() => new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">PANDORA'S BOX · ANALYTICS</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="date"
            className="form-control"
            value={from}
            onChange={e => setFrom(e.target.value)}
            style={{ width: 150 }}
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            className="form-control"
            value={to}
            onChange={e => setTo(e.target.value)}
            style={{ width: 150 }}
          />
        </div>
      </div>

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      {/* Tabs */}
      <div className="report-tabs" style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {TABS.map(t => (
          <div
            key={t.key}
            className={`report-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
            style={{ cursor: 'pointer' }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'sales' && <SalesSummaryTab from={from} to={to} />}
      {tab === 'inventory' && <InventoryValuationTab />}
      {tab === 'po' && <POReportTab from={from} to={to} />}
      {tab === 'activity' && <ActivityReportTab from={from} to={to} />}
    </>
  );
}
