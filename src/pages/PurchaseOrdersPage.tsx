import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useProductLocations } from '@/hooks/useProducts';
import { PODetail } from '@/components/purchase-orders/PODetail';
import { CreatePODrawer } from '@/components/purchase-orders/CreatePODrawer';
import type { POStatus } from '@/services/purchaseOrderService';

interface PORow {
  id: string;
  po_number: string;
  supplier_name: string;
  location_name: string;
  location_id: string;
  status: POStatus;
  ordered_at: string | null;
  expected_at: string | null;
  item_count: number;
  total_cost: number;
  total_ordered: number;
  total_received: number;
  created_at: string;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partial' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PurchaseOrdersPage() {
  const { data: allPOs = [], isLoading } = usePurchaseOrders();
  const { data: locations = [] } = useProductLocations();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // KPI counts
  const kpis = useMemo(() => {
    const open = allPOs.filter((p: PORow) => p.status === 'draft').length;
    const sent = allPOs.filter((p: PORow) => p.status === 'sent').length;
    const partial = allPOs.filter((p: PORow) => p.status === 'partial').length;
    const received = allPOs.filter((p: PORow) => p.status === 'received').length;
    return { open, sent, partial, received };
  }, [allPOs]);

  // Filtered POs
  const filtered = useMemo(() => {
    let list = allPOs as PORow[];
    if (statusFilter) list = list.filter(p => p.status === statusFilter);
    if (locationFilter) list = list.filter(p => p.location_id === locationFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.po_number || '').toLowerCase().includes(q) ||
        (p.supplier_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPOs, statusFilter, locationFilter, search]);

  const columns: Column<PORow>[] = [
    {
      key: 'po_number',
      header: 'PO #',
      render: (po) => <span style={{ fontWeight: 500 }}>{po.po_number || '—'}</span>,
    },
    { key: 'supplier_name', header: 'Supplier' },
    { key: 'location_name', header: 'Location' },
    {
      key: 'ordered_at',
      header: 'Ordered',
      render: (po) => formatDate(po.ordered_at),
    },
    {
      key: 'expected_at',
      header: 'Expected',
      render: (po) => formatDate(po.expected_at),
    },
    {
      key: 'item_count',
      header: 'Items',
      headerStyle: { textAlign: 'center' },
      cellStyle: { textAlign: 'center' },
      render: (po) => po.item_count ?? 0,
    },
    {
      key: 'total_cost',
      header: 'Total Cost',
      headerStyle: { textAlign: 'right' },
      cellStyle: { textAlign: 'right', fontFamily: "'DM Mono', monospace" },
      render: (po) => po.total_cost ? `$${Number(po.total_cost).toFixed(2)}` : '—',
    },
    {
      key: 'progress',
      header: 'Progress',
      headerStyle: { textAlign: 'center' },
      cellStyle: { textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' },
      render: (po) => {
        const ordered = po.total_ordered || 0;
        const received = po.total_received || 0;
        if (ordered === 0) return '—';
        const pct = Math.round((received / ordered) * 100);
        return `${received}/${ordered} (${pct}%)`;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => <StatusBadge status={po.status} />,
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Purchase Orders</div>
          <div className="page-subtitle">PANDORA'S BOX · ALL LOCATIONS</div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          New PO
        </button>
      </div>

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      {/* KPI strip */}
      <div className="inv-kpi-strip" style={{ marginBottom: 20 }}>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Open Orders</div>
          <div className="inv-kpi-value">{kpis.open}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Awaiting Delivery</div>
          <div className="inv-kpi-value">{kpis.sent}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Partial Received</div>
          <div className="inv-kpi-value" style={{ color: 'var(--gold)' }}>{kpis.partial}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Received (30 days)</div>
          <div className="inv-kpi-value" style={{ color: 'var(--sage)' }}>{kpis.received}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="page-search-wrap">
          <span className="page-search-icon">⌕</span>
          <input
            type="text"
            placeholder="Search PO number, supplier…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select className="filter-select" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
          <option value="">All Locations</option>
          {locations.map((l: any) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <div className="filter-spacer" />
        <div className="filter-count">{filtered.length} orders</div>
      </div>

      {/* Main layout */}
      <div className="page-grid" style={{ gridTemplateColumns: selectedPoId ? '1fr 400px' : '1fr' }}>
        <DataTable<PORow>
          columns={columns}
          data={filtered}
          loading={isLoading}
          emptyMessage="No purchase orders found."
          rowKey={(po) => po.id}
          onRowClick={(po) => setSelectedPoId(po.id)}
          rowClassName={(po) => po.id === selectedPoId ? 'selected' : ''}
        />

        {selectedPoId && (
          <PODetail poId={selectedPoId} onClose={() => setSelectedPoId(null)} />
        )}
      </div>

      <CreatePODrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
