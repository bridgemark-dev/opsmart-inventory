import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardService } from '@/services/dashboardService';
import { SalesTrendChart } from '@/components/dashboard/SalesTrendChart';

const COLORS = ['#c9a84c', '#4c8fc9', '#4cc97a', '#c94c7a', '#9b4cc9', '#c97a4c', '#4cc9c9'];

const TYPE_COLORS: Record<string, string> = {
  sale: 'var(--blue)',
  receive: 'var(--sage)',
  adjustment: 'var(--gold)',
  initial: 'var(--gold)',
  transfer_in: 'var(--sage)',
  transfer_out: 'var(--crimson)',
};

const TYPE_LABELS: Record<string, string> = {
  sale: 'Sale',
  receive: 'Stock received',
  adjustment: 'Stock adjusted',
  initial: 'Opening stock set',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' hr ago';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTopRole(locations: { role: string }[]): string {
  const roles = locations.map((l) => l.role);
  if (roles.includes('owner')) return 'owner';
  if (roles.includes('manager')) return 'manager';
  return 'employee';
}

/* ── Animated KPI value ── */

function AnimatedValue({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    function update(now: number) {
      const pct = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setDisplay(Math.round(value * ease));
      if (pct < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }, [value]);

  return <>{prefix}{display.toLocaleString()}</>;
}

/* ── Live Clock Subtitle ── */

function useLiveClock(locLabel: string) {
  const [text, setText] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setText(`${date} · ${time} · ${locLabel}`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [locLabel]);

  return text;
}

/* ── Main Dashboard ── */

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = useMemo(() => getTopRole(profile?.locations ?? []), [profile]);

  const locLabel = useMemo(() => {
    const locs = profile?.locations ?? [];
    return locs.length === 1 ? locs[0].location_name.toUpperCase() : 'ALL LOCATIONS';
  }, [profile]);

  const subtitle = useLiveClock(locLabel);

  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: dashboardService.getKpis,
    staleTime: 60_000,
  });

  const { data: topSellers } = useQuery({
    queryKey: ['dashboard-top-sellers'],
    queryFn: dashboardService.getTopSellers,
    staleTime: 120_000,
  });

  const { data: recentProducts } = useQuery({
    queryKey: ['dashboard-recent-products'],
    queryFn: dashboardService.getRecentProducts,
    staleTime: 120_000,
  });

  const { data: activityFeed } = useQuery({
    queryKey: ['dashboard-activity-feed'],
    queryFn: dashboardService.getActivityFeed,
    staleTime: 60_000,
  });

  const maxSellerQty = topSellers?.[0]?.qty || 1;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={subtitle}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {role !== 'employee' && (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/app/products')}>+ Add Product</button>
                <button className="btn btn-secondary" onClick={() => navigate('/app/inventory')}>⊿ Adjust Inventory</button>
              </>
            )}
            <button className="btn btn-secondary" onClick={() => navigate('/app/nightly')}>⊕ Nightly Totals</button>
            {role !== 'employee' && (
              <button className="btn btn-secondary" onClick={() => navigate('/app/purchase-orders')}>◳ Create PO</button>
            )}
          </div>
        }
      />

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-label">Inventory Value</div>
            <div className="kpi-icon">$</div>
          </div>
          <div className="kpi-value">
            {kpis ? <AnimatedValue value={kpis.inventoryValue} prefix="$" /> : '—'}
          </div>
          <div className="kpi-delta">at cost across all locations</div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-top">
            <div className="kpi-label">Units in Stock</div>
            <div className="kpi-icon">◫</div>
          </div>
          <div className="kpi-value">
            {kpis ? <AnimatedValue value={kpis.totalUnits} /> : '—'}
          </div>
          <div className="kpi-delta">
            {kpis ? `across ${kpis.locationCount} location${kpis.locationCount !== 1 ? 's' : ''}` : 'Loading…'}
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-top">
            <div className="kpi-label">Low Stock Items</div>
            <div className="kpi-icon">⚠</div>
          </div>
          <div className="kpi-value">
            {kpis ? <AnimatedValue value={kpis.lowStockCount} /> : '—'}
          </div>
          <div className={`kpi-delta${kpis && kpis.lowStockCount > 0 ? ' down' : ''}`}>
            {kpis
              ? kpis.lowStockCount > 0
                ? `${kpis.lowStockCount} item${kpis.lowStockCount !== 1 ? 's' : ''} need restocking`
                : 'All items well-stocked'
              : 'Loading…'}
          </div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-top">
            <div className="kpi-label">Weekly Sales</div>
            <div className="kpi-icon">↑</div>
          </div>
          <div className="kpi-value">
            {kpis ? <AnimatedValue value={kpis.weeklySales} prefix="$" /> : '—'}
          </div>
          <div className={`kpi-delta${kpis?.salesDeltaPct != null ? (kpis.salesDeltaPct > 0 ? ' up' : ' down') : ''}`}>
            {kpis?.salesDeltaPct != null
              ? `${kpis.salesDeltaPct > 0 ? '↑' : '↓'} ${Math.abs(kpis.salesDeltaPct).toFixed(1)}% vs last week`
              : 'No approved submissions this week'}
          </div>
        </div>
      </div>

      {/* Mid Grid: Sales Trend + Top Sellers */}
      <div className="mid-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Sales Trend</div>
          </div>
          <SalesTrendChart />
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Sellers</div>
            <div className="card-action" style={{ cursor: 'pointer' }} onClick={() => navigate('/app/reports')}>View all ↗</div>
          </div>
          <div className="product-list">
            {!topSellers?.length ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem', lineHeight: 1.6 }}>
                No sales data yet.<br />Approve nightly submissions to see top sellers.
              </div>
            ) : (
              topSellers.map((p, i) => {
                const pct = Math.round(p.qty / maxSellerQty * 100);
                return (
                  <div className="product-row" key={p.id}>
                    <div className="product-rank">#{i + 1}</div>
                    <div className="product-color" style={{ background: COLORS[i] }} />
                    <div className="product-info">
                      <div className="product-name">{p.name}</div>
                      <div className="product-cat">{p.category || '—'}{p.brand ? ` · ${p.brand}` : ''}</div>
                    </div>
                    <div className="product-sales">
                      <div className="product-units">{p.qty.toLocaleString()} sold</div>
                      <div className="product-bar-wrap">
                        <div className="product-bar" style={{ width: `${pct}%`, background: COLORS[i] }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Activity Feed + Recently Added */}
      <div className="bottom-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Activity Feed</div>
            <div className="card-action" style={{ cursor: 'pointer' }} onClick={() => navigate('/app/activity')}>View logs ↗</div>
          </div>
          <div className="activity-list">
            {!activityFeed?.length ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>
                No activity yet.
              </div>
            ) : (
              activityFeed.map((tx, i) => {
                const color = TYPE_COLORS[tx.type] || 'var(--text-muted)';
                const label = TYPE_LABELS[tx.type] || tx.type;
                const delta = tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : String(tx.quantityDelta);
                const isLast = i === activityFeed.length - 1;

                return (
                  <div className="activity-item" key={tx.id}>
                    <div className="activity-dot-wrap">
                      <div className="activity-dot" style={{ background: color }} />
                      {!isLast && <div className="activity-line" />}
                    </div>
                    <div className="activity-body">
                      <div className="activity-text">
                        <strong>{label}:</strong> {tx.productName}
                        <span style={{ color: 'var(--text-muted)' }}> ({delta} units) · {tx.locationName}</span>
                      </div>
                      <div className="activity-time">{timeAgo(tx.createdAt)} · {tx.userName}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recently Added</div>
            <div className="card-action" style={{ cursor: 'pointer' }} onClick={() => navigate('/app/products')}>See all ↗</div>
          </div>
          <div className="recent-grid">
            {!recentProducts?.length ? (
              <div style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>
                No products yet. Import your catalog to get started.
              </div>
            ) : (
              recentProducts.map((p) => (
                <div className="recent-item" key={p.id}>
                  <div className="recent-tag">{p.category || '—'}</div>
                  <div className="recent-name">{p.name}</div>
                  <div className="recent-meta">
                    {p.retailPrice != null ? `$${p.retailPrice.toFixed(2)}` : '—'} · {p.totalQty} units
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${p.isLow ? 'low' : 'ok'}`}>
                      {p.isLow ? '● Low' : '● In Stock'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
