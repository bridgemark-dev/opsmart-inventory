import { useQuery } from '@tanstack/react-query';
import { reportService, type InvValSummary } from '@/services/reportService';
import { Spinner } from '@/components/ui/Spinner';

const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString();

const COLORS = ['#c9a84c', '#4c8fc9', '#4cc97a', '#c94c7a', '#9b4cc9'];

function exportCsv(data: InvValSummary) {
  const headers = ['SKU', 'Product', 'Category', 'Location', 'Units', 'Cost/ea', 'Retail/ea', 'Cost Value', 'Retail Value'];
  const rows = [headers.join(',')];
  data.rows.forEach(r => {
    rows.push([
      `"${r.sku}"`, `"${r.name}"`, `"${r.category}"`, `"${r.location}"`,
      r.qty, r.costEa.toFixed(2), r.retailEa.toFixed(2),
      r.costValue.toFixed(2), r.retailValue.toFixed(2),
    ].join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pandoras-inventory-valuation-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function HBar({ items, max }: { items: { name: string; cost: number }[]; max: number }) {
  return (
    <div>
      {items.map((item, i) => (
        <div className="hbar-item" key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div className="hbar-label" style={{ width: 120, fontSize: '0.78rem', flexShrink: 0 }}>{item.name}</div>
          <div className="hbar-track" style={{ flex: 1, height: 14, background: 'var(--surface2)', borderRadius: 7, overflow: 'hidden' }}>
            <div
              className="hbar-fill"
              style={{
                width: max > 0 ? `${Math.round((item.cost / max) * 100)}%` : '0%',
                height: '100%',
                background: COLORS[i % COLORS.length],
                borderRadius: 7,
              }}
            />
          </div>
          <div className="hbar-value" style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.75rem', width: 90, textAlign: 'right' }}>
            {fmt(item.cost)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InventoryValuationTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-inventory-valuation'],
    queryFn: reportService.getInventoryValuation,
    staleTime: 120_000,
  });

  if (isLoading || !data) return <Spinner />;

  const maxCat = Math.max(...data.byCategory.map(c => c.cost), 0);
  const maxLoc = Math.max(...data.byLocation.map(l => l.cost), 0);

  return (
    <div>
      {/* KPI strip */}
      <div className="inv-kpi-strip" style={{ marginBottom: 24 }}>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Total Value (Cost)</div>
          <div className="inv-kpi-value">{fmt(data.totalCost)}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Total Value (Retail)</div>
          <div className="inv-kpi-value">{fmt(data.totalRetail)}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Potential Gross Profit</div>
          <div className="inv-kpi-value" style={{ color: 'var(--sage)' }}>{fmt(data.potentialProfit)}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Total SKUs</div>
          <div className="inv-kpi-value">{fmtN(data.totalSkus)}</div>
        </div>
      </div>

      {/* Breakdown charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="report-card" style={{ padding: 16 }}>
          <div className="report-card-title" style={{ marginBottom: 12 }}>By Location</div>
          <HBar items={data.byLocation} max={maxLoc} />
        </div>
        <div className="report-card" style={{ padding: 16 }}>
          <div className="report-card-title" style={{ marginBottom: 12 }}>By Category</div>
          <HBar items={data.byCategory} max={maxCat} />
        </div>
      </div>

      {/* Full table */}
      <div className="report-card">
        <div className="report-card-header">
          <div className="report-card-title">Full Inventory Valuation</div>
          <div className="card-action" onClick={() => exportCsv(data)} style={{ cursor: 'pointer' }}>Export CSV ↗</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>Location</th>
                <th className="td-right">Units</th>
                <th className="td-right">Cost/ea</th>
                <th className="td-right">Retail/ea</th>
                <th className="td-right">Cost Value</th>
                <th className="td-right">Retail Value</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr><td colSpan={9} className="report-empty">No inventory data.</td></tr>
              ) : (
                data.rows.map((r, i) => (
                  <tr key={`${r.sku}-${r.location}-${i}`}>
                    <td className="td-mono" style={{ color: 'var(--gold)' }}>{r.sku}</td>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.category}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.location}</td>
                    <td className="td-right td-mono">{fmtN(r.qty)}</td>
                    <td className="td-right td-mono" style={{ color: 'var(--text-muted)' }}>
                      {r.costEa > 0 ? fmt(r.costEa) : '—'}
                    </td>
                    <td className="td-right td-mono" style={{ color: 'var(--text-muted)' }}>
                      {r.retailEa > 0 ? fmt(r.retailEa) : '—'}
                    </td>
                    <td className="td-right td-mono">{r.costValue > 0 ? fmt(r.costValue) : '—'}</td>
                    <td className="td-right td-mono">{r.retailValue > 0 ? fmt(r.retailValue) : '—'}</td>
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
