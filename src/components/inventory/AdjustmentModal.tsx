import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAdjustStock } from '@/hooks/useInventory';

type AdjType = 'add' | 'remove' | 'set';

interface AdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  row: {
    product_id: string;
    location_id: string;
    product_name: string;
    sku: string;
    location_name: string;
    quantity_on_hand: number;
  } | null;
}

export function AdjustmentModal({ open, onClose, row }: AdjustmentModalProps) {
  const { show } = useToast();
  const adjust = useAdjustStock();

  const [adjType, setAdjType] = useState<AdjType>('add');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setAdjType('add');
      setQty('');
      setReason('');
    }
  }, [open]);

  if (!row) return null;

  const currentQty = row.quantity_on_hand ?? 0;
  const parsed = parseInt(qty, 10) || 0;

  let newQty: number;
  let delta: number;
  if (adjType === 'add') {
    newQty = currentQty + parsed;
    delta = parsed;
  } else if (adjType === 'remove') {
    newQty = Math.max(0, currentQty - parsed);
    delta = -(Math.min(parsed, currentQty));
  } else {
    newQty = Math.max(0, parsed);
    delta = newQty - currentQty;
  }

  async function handleSave() {
    if (delta === 0) { show('No change to save.'); return; }
    if (!reason.trim()) { show('Please enter a reason.'); return; }

    try {
      await adjust.mutateAsync({
        productId: row!.product_id,
        locationId: row!.location_id,
        delta,
        notes: reason.trim(),
      });
      show('Stock adjusted successfully.');
      onClose();
    } catch (err: any) {
      show('Failed: ' + err.message);
    }
  }

  const qtyLabel = adjType === 'add' ? 'Units to Add' : adjType === 'remove' ? 'Units to Remove' : 'Set Quantity To';

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Adjust Stock"
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={adjust.isPending}>
            {adjust.isPending ? 'Saving…' : 'Save Adjustment'}
          </button>
        </>
      }
    >
      {/* Product info */}
      <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.product_name}</div>
        <div style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: 'var(--text-muted)', marginTop: 2 }}>
          {row.sku} · {row.location_name}
        </div>
      </div>

      {/* Current stock */}
      <div className="form-group">
        <label className="modal-label">Current Stock</label>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.1rem', fontWeight: 600 }}>
          {currentQty}
        </div>
      </div>

      {/* Adjustment type */}
      <div className="form-group">
        <label className="modal-label">Adjustment Type</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['add', 'remove', 'set'] as AdjType[]).map(t => (
            <button
              key={t}
              className={`btn btn-sm ${adjType === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAdjType(t)}
              style={{ flex: 1, textTransform: 'capitalize' }}
            >
              {t === 'set' ? 'Set To' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity input */}
      <div className="form-group">
        <label className="modal-label">{qtyLabel}</label>
        <input
          type="number"
          className="form-control"
          min="0"
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder="0"
        />
      </div>

      {/* Preview */}
      {parsed > 0 && (
        <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: 12 }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
            New Quantity Will Be
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)', fontFamily: "'DM Mono', monospace" }}>
            {newQty}
          </div>
        </div>
      )}

      {/* Reason */}
      <div className="form-group">
        <label className="modal-label">Reason / Notes</label>
        <textarea
          className="form-control"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Physical count correction, damaged goods, vendor return…"
          style={{ minHeight: 70 }}
        />
      </div>
    </Modal>
  );
}
