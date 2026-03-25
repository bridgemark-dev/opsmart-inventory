import { useRef, useState, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useUpdateReorderPoint } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/Toast';

export interface InvRow {
  product_id: string;
  location_id: string;
  product_name: string;
  brand: string | null;
  sku: string;
  category_name: string;
  location_name: string;
  quantity_on_hand: number;
  reorder_point: number | null;
  reorder_quantity: number | null;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  cost_price: number | null;
  retail_price: number | null;
}

interface InventoryTableProps {
  rows: InvRow[];
  onRowClick: (row: InvRow) => void;
}

type SortKey = 'sku' | 'product_name' | 'category_name' | 'location_name' | 'quantity_on_hand' | 'reorder_point';

export function InventoryTable({ rows, onRowClick }: InventoryTableProps) {
  const { show } = useToast();
  const updateReorder = useUpdateReorderPoint();
  const parentRef = useRef<HTMLDivElement>(null);

  const [sortCol, setSortCol] = useState<SortKey>('product_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = (a as any)[sortCol];
      const bVal = (b as any)[sortCol];
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir]);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 15,
  });

  function handleSort(key: SortKey) {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  }

  const handleReorderBlur = useCallback(
    async (row: InvRow, field: 'point' | 'qty', value: string) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 0) return;
      const point = field === 'point' ? num : (row.reorder_point ?? 0);
      const qty = field === 'qty' ? num : (row.reorder_quantity ?? 0);
      try {
        await updateReorder.mutateAsync({
          productId: row.product_id,
          locationId: row.location_id,
          point,
          qty,
        });
      } catch (err: any) {
        show('Reorder update failed: ' + err.message);
      }
    },
    [updateReorder, show],
  );

  function thClass(key: SortKey) {
    return sortCol === key ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : '';
  }

  const stockPill = (row: InvRow) => {
    if (row.is_out_of_stock) return <span className="stock-pill out">● Out of Stock</span>;
    if (row.is_low_stock) return <span className="stock-pill low">⚠ Low</span>;
    return <span className="stock-pill ok">● OK</span>;
  };

  const qtyClass = (row: InvRow) =>
    row.is_out_of_stock ? 'out' : row.is_low_stock ? 'low' : 'ok';

  const rowClass = (row: InvRow) =>
    row.is_out_of_stock ? 'out-of-stock' : row.is_low_stock ? 'low-stock' : '';

  return (
    <div className="data-table-card">
      <div
        ref={parentRef}
        className="data-table-scroll"
        style={{ maxHeight: 'calc(100vh - 320px)', overflow: 'auto' }}
      >
        <table className="data-table" style={{ minWidth: 900 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              <th className={thClass('sku')} onClick={() => handleSort('sku')}>SKU</th>
              <th className={thClass('product_name')} onClick={() => handleSort('product_name')}>Product</th>
              <th className={thClass('category_name')} onClick={() => handleSort('category_name')}>Category</th>
              <th className={thClass('location_name')} onClick={() => handleSort('location_name')}>Location</th>
              <th className={thClass('quantity_on_hand')} onClick={() => handleSort('quantity_on_hand')} style={{ textAlign: 'center' }}>Qty</th>
              <th className={thClass('reorder_point')} onClick={() => handleSort('reorder_point')} style={{ textAlign: 'center' }}>Reorder At</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="state-loading" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No inventory rows match your filters.
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer for virtual offset */}
                {virtualizer.getVirtualItems().length > 0 && (
                  <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}>
                    <td colSpan={8} style={{ padding: 0, border: 'none' }} />
                  </tr>
                )}
                {virtualizer.getVirtualItems().map(vItem => {
                  const row = sorted[vItem.index];
                  return (
                    <tr
                      key={`${row.product_id}-${row.location_id}`}
                      className={rowClass(row)}
                      data-index={vItem.index}
                      style={{ height: vItem.size }}
                    >
                      <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>{row.sku}</td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{row.product_name}</div>
                        {row.brand && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                            {row.brand}
                          </div>
                        )}
                      </td>
                      <td>{row.category_name}</td>
                      <td>{row.location_name}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`td-qty ${qtyClass(row)}`} style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                          {row.quantity_on_hand}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className="form-control"
                          defaultValue={row.reorder_point ?? ''}
                          onBlur={e => handleReorderBlur(row, 'point', e.target.value)}
                          style={{
                            width: 60,
                            textAlign: 'center',
                            padding: '2px 4px',
                            fontSize: '0.78rem',
                            fontFamily: "'DM Mono', monospace",
                            display: 'inline-block',
                          }}
                          min="0"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>{stockPill(row)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => { e.stopPropagation(); onRowClick(row); }}
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* Bottom spacer */}
                {virtualizer.getVirtualItems().length > 0 && (
                  <tr style={{
                    height: virtualizer.getTotalSize() -
                      (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                  }}>
                    <td colSpan={8} style={{ padding: 0, border: 'none' }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
