import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';
import { useProducts, useProductCategories } from '@/hooks/useProducts';
import { ProductForm } from '@/components/products/ProductForm';
import type { ProductRow } from '@/services/productsService';

export default function ProductsPage() {
  const { show } = useToast();
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useProductCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (!showInactive && !p.is_active) return false;
      if (categoryFilter && p.categories?.id !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const sku = `${p.categories?.category_number || ''}/${p.product_number}`;
        const hay = `${p.name} ${p.brand || ''} ${sku} ${p.notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, searchQuery, categoryFilter, showInactive]);

  const openAdd = () => {
    setSelectedProduct(null);
    setPanelOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setSelectedProduct(p);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedProduct(null);
  };

  const columns: Column<ProductRow>[] = [
    {
      key: 'sku', header: 'SKU', sortable: true,
      render: (p) => (
        <span className="product-sku" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--gold)' }}>
          {p.categories?.category_number}/{p.product_number}
        </span>
      ),
    },
    { key: 'name', header: 'Name', sortable: true, render: (p) => <strong>{p.name}</strong> },
    { key: 'brand', header: 'Brand', sortable: true, render: (p) => p.brand || '—' },
    {
      key: 'retail_price', header: 'Retail', sortable: true, align: 'right',
      render: (p) => p.retail_price != null ? `$${parseFloat(String(p.retail_price)).toFixed(2)}` : '—',
    },
    {
      key: 'cost_price', header: 'Cost', sortable: true, align: 'right',
      render: (p) => p.cost_price != null ? `$${parseFloat(String(p.cost_price)).toFixed(2)}` : '—',
    },
    {
      key: 'stock', header: 'Stock', sortable: false,
      render: (p) => {
        const inv = p.inventory ?? [];
        if (!inv.length) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        return (
          <div className="stock-mini">
            {inv.map((i) => {
              const qty = i.quantity_on_hand ?? 0;
              const cls = qty <= 0 ? 'out' : qty <= (i.reorder_point ?? 0) ? 'low' : 'ok';
              return (
                <div className="stock-loc" key={i.location_id}>
                  <span className="stock-loc-name">{i.locations?.name}</span>
                  <span className={`stock-loc-qty ${cls}`}>{qty}</span>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'is_active', header: 'Status', sortable: true,
      render: (p) => p.is_active
        ? <span className="tag">Active</span>
        : <span className="tag tag-inactive">Inactive</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="PANDORA'S BOX · PRODUCT CATALOG"
        actions={<button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>}
      />

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="page-search-wrap">
          <span className="page-search-icon">⌕</span>
          <input type="text" placeholder="Search name, SKU, brand…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.category_number} — {c.name}</option>
          ))}
        </select>

        <button
          className={`filter-btn${showInactive ? ' active' : ''}`}
          onClick={() => setShowInactive(!showInactive)}
          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
        >
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
        </button>

        <div className="filter-spacer" />
        <div className="filter-count">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        emptyMessage="No products found."
        rowKey={(p) => p.id}
        onRowClick={openEdit}
        rowClassName={(p) => p.is_active ? '' : 'inactive'}
      />

      {panelOpen && (
        <ProductForm product={selectedProduct} onClose={closePanel} />
      )}
    </>
  );
}
