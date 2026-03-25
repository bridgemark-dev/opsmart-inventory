import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { reportService, type SalesSummary } from '@/services/reportService';
import { Spinner } from '@/components/ui/Spinner';

const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString();

function exportCsv(data: SalesSummary) {
  const headers = ['Date', 'Revenue', 'Units'];
  const rows = [headers.join(',')];
  data.dailySales.forEach(d => {
    rows.push([d.date, d.revenue.toFixed(2), d.units].join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pandoras-sales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  from: string;
  to: string;
}

export function SalesSummaryTab({ from, to }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-sales', from, to],
    queryFn: () => reportService.getSalesSummary(from, to),
    staleTime: 120_000,
  });

  if (isLoading || !data) return <Spinner />;

  const chartData = data.dailySales.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: d.revenue,
  }));

  return (
    <div>
      {/* KPI strip */}
      <div className="inv-kpi-strip" style={{ marginBottom: 24 }}>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Total Revenue</div>
          <div className="inv-kpi-value">{fmt(data.totalRevenue)}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Units Sold</div>
          <div className="inv-kpi-value">{fmtN(data.totalUnits)}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Submissions</div>
          <div className="inv-kpi-value">{data.submissionCount}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Avg Daily Revenue</div>
          <div className="inv-kpi-value">{fmt(data.avgDailyRevenue)}</div>
        </div>
      </div>

      {/* Sales chart */}
      <div className="report-card" style={{ marginBottom: 24 }}>
        <div className="report-card-header">
          <div className="report-card-title">Sales by Day</div>
          <div className="card-action" onClick={() => exportCsv(data)} style={{ cursor: 'pointer' }}>Export CSV ↗</div>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fill: 'var(--text-muted)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.78rem',
                  fontFamily: "'DM Mono', monospace",
                }}
                formatter={(val: number) => [fmt(val), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="var(--gold)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 products */}
      <div className="report-card">
        <div className="report-card-header">
          <div className="report-card-title">Top 10 Products</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th className="td-right">Units</th>
                <th className="td-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.length === 0 ? (
                <tr><td colSpan={4} className="report-empty">No data for this period.</td></tr>
              ) : (
                data.topProducts.map((p, i) => (
                  <tr key={p.name}>
                    <td style={{ fontFamily: "'DM Mono', monospace", color: 'var(--gold)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="td-right" style={{ fontFamily: "'DM Mono', monospace" }}>{fmtN(p.units)}</td>
                    <td className="td-right" style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(p.revenue)}</td>
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
