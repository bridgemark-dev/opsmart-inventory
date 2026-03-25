import { useState, useMemo } from 'react';
import { useInventoryStatus } from '@/hooks/useInventory';
import { useProductCategories } from '@/hooks/useProducts';
import { InventoryTable, type InvRow } from '@/components/inventory/InventoryTable';
import { AdjustmentModal } from '@/components/inventory/AdjustmentModal';
import { Spinner } from '@/components/ui/Spinner';

function exportCsv(rows: InvRow[]) {
  const headers = ['SKU', 'Product', 'Brand', 'Category', 'Location', 'Qty', 'Reorder At', 'Status'];
  const csvRows = [headers.join(',')];
  rows.forEach(r => {
    const status = r.is_out_of_stock ? 'Out of Stock' : r.is_low_stock ? 'Low' : 'OK';
    csvRows.push([
      `"${r.sku}"`, `"${r.product_name}"`, `"${r.brand ?? ''}"`,
      `"${r.category_name}"`, `"${r.location_name}"`, r.quantity_on_hand,
      r.reorder_point ?? '', `"${status}"`,
    ].join(','));
  });
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pandoras-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InventoryPage() {
  const { data: allRows = [], isLoading } = useInventoryStatus();
  const { data: categories = [] } = useProductCategories();

  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustRow, setAdjustRow] = useState<InvRow | null>(null);

  // Derive unique locations from data
  const locations = useMemo(() => {
    const set = new Map<string, string>();
    allRows.forEach((r: any) => { if (r.location_id && r.location_name) set.set(r.location_id, r.location_name); });
    return Array.from(set, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allRows]);

  // KPIs
  const kpis = useMemo(() => {
    const totalSkus = new Set(allRows.map((r: any) => r.product_id)).size;
    const totalUnits = allRows.reduce((s: number, r: any) => s + (r.quantity_on_hand || 0), 0);
    const lowStock = allRows.filter((r: any) => r.is_low_stock && !r.is_out_of_stock).length;
    const outOfStock = allRows.filter((r: any) => r.is_out_of_stock).length;
    return { totalSkus, totalUnits, lowStock, outOfStock };
  }, [allRows]);

  // Filtered rows
  const filtered = useMemo(() => {
    let list = allRows as InvRow[];
    if (locationFilter) list = list.filter(r => r.location_id === locationFilter);
    if (categoryFilter) list = list.filter(r => r.category_name === categoryFilter);
    if (lowStockOnly) list = list.filter(r => r.is_low_stock);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        `${r.sku} ${r.product_name} ${r.brand ?? ''} ${r.category_name}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allRows, locationFilter, categoryFilter, lowStockOnly, search]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Inventory</div>
          <div className="page-subtitle">PANDORA'S BOX · ALL LOCATIONS</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportCsv(filtered)}>
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setAdjustRow({} as any)}>
            Adjust Stock
          </button>
        </div>
      </div>

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      {/* KPI strip */}
      <div className="inv-kpi-strip" style={{ marginBottom: 20 }}>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Total SKUs</div>
          <div className="inv-kpi-value">{kpis.totalSkus}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Total Units</div>
          <div className="inv-kpi-value">{kpis.totalUnits}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Low Stock</div>
          <div className="inv-kpi-value" style={{ color: 'var(--crimson)' }}>{kpis.lowStock}</div>
        </div>
        <div className="inv-kpi">
          <div className="inv-kpi-label">Out of Stock</div>
          <div className="inv-kpi-value" style={{ color: 'var(--crimson)' }}>{kpis.outOfStock}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="page-search-wrap">
          <span className="page-search-icon">⌕</span>
          <input
            type="text"
            placeholder="Search name, SKU, brand…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="filter-select" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
          <option value="">All Locations</option>
          {locations.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <select className="filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <button
          className={`btn btn-sm ${lowStockOnly ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setLowStockOnly(v => !v)}
        >
          Low Stock Only
        </button>

        <div className="filter-spacer" />
        <div className="filter-count">{filtered.length} items</div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner />
      ) : (
        <InventoryTable rows={filtered} onRowClick={setAdjustRow} />
      )}

      <AdjustmentModal
        open={!!adjustRow && !!adjustRow.product_id}
        onClose={() => setAdjustRow(null)}
        row={adjustRow}
      />
    </>
  );
}
