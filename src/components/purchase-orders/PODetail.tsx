import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { usePurchaseOrder, useUpdatePOStatus } from '@/hooks/usePurchaseOrders';
import { ReceiveStockModal } from './ReceiveStockModal';
import type { POStatus } from '@/services/purchaseOrderService';

interface PODetailProps {
  poId: string;
  onClose: () => void;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PODetail({ poId, onClose }: PODetailProps) {
  const { show } = useToast();
  const { data: po, isLoading } = usePurchaseOrder(poId);
  const updateStatus = useUpdatePOStatus();

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading || !po) {
    return (
      <div className="po-panel open">
        <div className="po-panel-header">
          <div className="po-panel-title">Loading…</div>
          <div className="side-panel-close" onClick={onClose}>×</div>
        </div>
      </div>
    );
  }

  const items = po.purchase_order_items ?? [];
  const status = po.status as POStatus;
  const totalCost = items.reduce((s: number, i: any) => s + (i.quantity_ordered * (i.unit_cost || 0)), 0);
  const totalOrdered = items.reduce((s: number, i: any) => s + i.quantity_ordered, 0);
  const totalReceived = items.reduce((s: number, i: any) => s + (i.quantity_received || 0), 0);
  const canReceive = status === 'sent' || status === 'partial';
  const hasPending = items.some((i: any) => (i.quantity_received || 0) < i.quantity_ordered);

  const handleMarkSent = async () => {
    try {
      await updateStatus.mutateAsync({ poId, status: 'sent' });
      show('PO marked as sent.');
    } catch (err: any) { show('Failed: ' + err.message); }
  };

  const handleCancel = async () => {
    try {
      await updateStatus.mutateAsync({ poId, status: 'cancelled' });
      show('Order cancelled.');
    } catch (err: any) { show('Failed: ' + err.message); }
    setConfirmOpen(false);
  };

  return (
    <div className="po-panel open">
      <div className="po-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="po-panel-title">{po.po_number || 'Draft PO'}</div>
          <StatusBadge status={status} />
        </div>
        <div className="side-panel-close" onClick={onClose}>×</div>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
        {/* Metadata */}
        <div className="po-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 20 }}>
          <div className="po-meta-item">
            <div className="po-meta-label">Supplier</div>
            <div className="po-meta-value">{po.suppliers?.name || '—'}</div>
          </div>
          <div className="po-meta-item">
            <div className="po-meta-label">Location</div>
            <div className="po-meta-value">{po.locations?.name || '—'}</div>
          </div>
          <div className="po-meta-item">
            <div className="po-meta-label">Ordered</div>
            <div className="po-meta-value">{formatDate(po.ordered_at)}</div>
          </div>
          <div className="po-meta-item">
            <div className="po-meta-label">Expected</div>
            <div className="po-meta-value">{formatDate(po.expected_at)}</div>
          </div>
          {po.notes && (
            <div className="po-meta-item" style={{ gridColumn: '1 / -1' }}>
              <div className="po-meta-label">Notes</div>
              <div className="po-meta-value">{po.notes}</div>
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="po-items-section">
          <div className="po-items-title" style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
            Line Items ({items.length})
          </div>

          {items.map((item: any) => {
            const received = item.quantity_received || 0;
            const ordered = item.quantity_ordered;
            const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
            const rcvClass = pct >= 100 ? 'full' : pct > 0 ? 'partial' : 'none';

            return (
              <div className="po-line-item" key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <div className="po-line-name" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                      {item.products?.name || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>
                    <span className="po-line-qty">{received}/{ordered}</span>
                    {item.unit_cost > 0 && (
                      <span className="po-line-cost" style={{ marginLeft: 10, color: 'var(--text-muted)' }}>
                        ${parseFloat(item.unit_cost).toFixed(2)}/ea
                      </span>
                    )}
                  </div>
                </div>
                <div className={`po-line-received ${rcvClass}`} style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                  {pct >= 100 ? '✓ Fully received' : pct > 0 ? `${pct}% received` : 'Pending'}
                </div>
              </div>
            );
          })}

          {totalCost > 0 && (
            <div className="po-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 600 }}>
              <span className="po-total-label">Total Cost</span>
              <span className="po-total-value" style={{ fontFamily: "'DM Mono', monospace" }}>
                ${totalCost.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Fully received message */}
        {status === 'received' && (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--sage)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>
            ✓ Fully received — inventory updated.
          </div>
        )}

        {status === 'cancelled' && (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--crimson)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>
            This order has been cancelled.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="po-panel-actions" style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        {status === 'draft' && (
          <>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleMarkSent} disabled={updateStatus.isPending}>
              Mark as Sent
            </button>
            <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>Cancel Order</button>
          </>
        )}
        {canReceive && hasPending && (
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setReceiveOpen(true)}>
            Receive Stock
          </button>
        )}
        {status === 'sent' && (
          <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>Cancel Order</button>
        )}
      </div>

      {canReceive && (
        <ReceiveStockModal
          open={receiveOpen}
          onClose={() => setReceiveOpen(false)}
          poId={poId}
          items={items}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this order?"
        message="This order will be marked cancelled. No inventory changes will be made."
        confirmLabel="Cancel Order"
        danger
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
