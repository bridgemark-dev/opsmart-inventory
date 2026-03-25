import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useReceiveItems } from '@/hooks/usePurchaseOrders';

interface LineItem {
  id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  products: { name: string; brand: string | null } | null;
}

interface ReceiveStockModalProps {
  open: boolean;
  onClose: () => void;
  poId: string;
  items: LineItem[];
}

export function ReceiveStockModal({ open, onClose, poId, items }: ReceiveStockModalProps) {
  const { show } = useToast();
  const receive = useReceiveItems();

  const pendingItems = items.filter((i) => (i.quantity_received || 0) < i.quantity_ordered);

  const [receipts, setReceipts] = useState<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    pendingItems.forEach((i) => { r[i.id] = i.quantity_ordered - (i.quantity_received || 0); });
    return r;
  });

  const setQty = (itemId: string, qty: number) => {
    setReceipts((prev) => ({ ...prev, [itemId]: qty }));
  };

  const handleReceive = async () => {
    const entries = pendingItems
      .filter((i) => (receipts[i.id] || 0) > 0)
      .map((i) => ({
        item_id: i.id,
        quantity_received: receipts[i.id] || 0,
      }));

    if (!entries.length) { show('Enter quantities to receive.'); return; }

    try {
      await receive.mutateAsync({ poId, receipts: entries });
      show('Stock received and inventory updated.');
      onClose();
    } catch (err: any) {
      show('Receive failed: ' + err.message);
    }
  };

  if (!pendingItems.length) return null;

  return (
    <Modal open={open} onClose={onClose} title="Receive Stock" size="lg">
      <div className="receive-section">
        {pendingItems.map((item) => {
          const remaining = item.quantity_ordered - (item.quantity_received || 0);
          return (
            <div className="receive-line" key={item.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="receive-line-header" style={{ marginBottom: 8 }}>
                <div className="receive-line-name" style={{ fontWeight: 500 }}>
                  {item.products?.name || '—'}
                </div>
                <div className="receive-line-ordered" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                  {remaining} remaining of {item.quantity_ordered} ordered
                </div>
              </div>
              <div className="receive-fields" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Qty Received
                  </label>
                  <input
                    className="form-control"
                    type="number"
                    min={0}
                    max={remaining}
                    value={receipts[item.id] || 0}
                    onChange={(e) => setQty(item.id, parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleReceive} disabled={receive.isPending}>
          {receive.isPending ? 'Receiving…' : 'Receive Items'}
        </button>
      </div>
    </Modal>
  );
}
