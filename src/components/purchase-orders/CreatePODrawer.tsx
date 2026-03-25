import { useState } from 'react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProductLocations } from '@/hooks/useProducts';
import { useCreatePO } from '@/hooks/usePurchaseOrders';
import { useToast } from '@/components/ui/Toast';
import { ProductSearch } from '@/components/ui/ProductSearch';
import type { POItemInput } from '@/services/purchaseOrderService';

interface LineItem {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  cost: number;
}

interface CreatePODrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePODrawer({ open, onClose }: CreatePODrawerProps) {
  const { show } = useToast();
  const { data: suppliers = [] } = useSuppliers();
  const { data: locations = [] } = useProductLocations();
  const createPO = useCreatePO();

  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);

  // Staging fields for adding a line
  const [pendingQty, setPendingQty] = useState('');
  const [pendingCost, setPendingCost] = useState('');
  const [pendingProduct, setPendingProduct] = useState<{ id: string; name: string; sku: string } | null>(null);

  if (!open) return null;

  const totalCost = lines.reduce((s, l) => s + l.qty * l.cost, 0);

  function handleProductSelect(product: any) {
    const sku = product.categories
      ? `${product.categories.category_number}/${product.product_number}`
      : String(product.product_number);
    setPendingProduct({ id: product.id, name: product.name, sku });
  }

  function addLine() {
    if (!pendingProduct) { show('Select a product first.'); return; }
    const qty = parseInt(pendingQty, 10);
    const cost = parseFloat(pendingCost);
    if (!qty || qty < 1) { show('Quantity must be at least 1.'); return; }
    if (isNaN(cost) || cost < 0) { show('Enter a valid cost.'); return; }

    if (lines.some(l => l.productId === pendingProduct.id)) {
      show('Product already added.');
      return;
    }

    setLines(prev => [...prev, {
      productId: pendingProduct.id,
      name: pendingProduct.name,
      sku: pendingProduct.sku,
      qty,
      cost,
    }]);
    setPendingProduct(null);
    setPendingQty('');
    setPendingCost('');
  }

  function removeLine(productId: string) {
    setLines(prev => prev.filter(l => l.productId !== productId));
  }

  async function handleCreate() {
    if (!supplierId) { show('Select a supplier.'); return; }
    if (!locationId) { show('Select a location.'); return; }
    if (lines.length === 0) { show('Add at least one item.'); return; }

    const items: POItemInput[] = lines.map(l => ({
      productId: l.productId,
      qty: l.qty,
      cost: l.cost,
    }));

    try {
      await createPO.mutateAsync({ supplierId, locationId, items });
      show('Purchase order created.');
      resetAndClose();
    } catch (err: any) {
      show('Failed: ' + err.message);
    }
  }

  function resetAndClose() {
    setSupplierId('');
    setLocationId('');
    setNotes('');
    setLines([]);
    setPendingProduct(null);
    setPendingQty('');
    setPendingCost('');
    onClose();
  }

  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) resetAndClose(); }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="modal-title">New Purchase Order</div>
          <div className="modal-close" onClick={resetAndClose}>×</div>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Supplier */}
          <div className="form-group">
            <label className="modal-label">
              Supplier <span style={{ color: 'var(--crimson)' }}>*</span>
            </label>
            <select className="form-control" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">Select supplier…</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.lead_days ? ` (${s.lead_days}d lead)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="modal-label">
              Receiving Location <span style={{ color: 'var(--crimson)' }}>*</span>
            </label>
            <select className="form-control" value={locationId} onChange={e => setLocationId(e.target.value)}>
              <option value="">Select location…</option>
              {locations.map((l: any) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <div className="form-hint">The primary location for this order.</div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="modal-label">Notes</label>
            <textarea
              className="form-control"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Order reference, special instructions…"
              style={{ minHeight: 60 }}
            />
          </div>

          {/* Add Products */}
          <div className="form-group">
            <label className="modal-label">Add Products</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                {pendingProduct ? (
                  <div style={{
                    padding: '6px 10px',
                    background: 'var(--surface2)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span>{pendingProduct.sku} — {pendingProduct.name}</span>
                    <span style={{ cursor: 'pointer', marginLeft: 8, color: 'var(--text-muted)' }} onClick={() => setPendingProduct(null)}>×</span>
                  </div>
                ) : (
                  <ProductSearch onSelect={handleProductSelect} placeholder="Search product…" />
                )}
              </div>
              <input
                type="number"
                className="form-control"
                placeholder="Qty"
                min="1"
                value={pendingQty}
                onChange={e => setPendingQty(e.target.value)}
                style={{ width: 70 }}
              />
              <input
                type="number"
                className="form-control"
                placeholder="Cost"
                min="0"
                step="0.01"
                value={pendingCost}
                onChange={e => setPendingCost(e.target.value)}
                style={{ width: 90 }}
              />
              <button className="btn btn-secondary btn-sm" onClick={addLine}>+ Add</button>
            </div>
          </div>

          {/* Line items list */}
          {lines.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
                Items ({lines.length})
              </div>
              {lines.map(l => (
                <div key={l.productId} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '0.82rem',
                }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{l.sku}</span> — {l.name}
                    <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem' }}>
                      ×{l.qty} @ ${l.cost.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>
                      ${(l.qty * l.cost).toFixed(2)}
                    </span>
                    <span style={{ cursor: 'pointer', color: 'var(--crimson)', fontSize: '0.75rem' }} onClick={() => removeLine(l.productId)}>
                      Remove
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 600, fontSize: '0.85rem' }}>
                <span>Estimated Total</span>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>${totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={resetAndClose}>Cancel</button>
          <button
            className="modal-submit-btn"
            onClick={handleCreate}
            disabled={createPO.isPending}
          >
            {createPO.isPending ? 'Creating…' : 'Create Draft PO'}
          </button>
        </div>
      </div>
    </div>
  );
}
