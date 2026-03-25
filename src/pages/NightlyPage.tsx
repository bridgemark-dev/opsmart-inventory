import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductSearch } from '@/components/ui/ProductSearch';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTodaySubmission,
  useSubmissionItems,
  useUpsertItem,
  useRemoveItem,
  useSubmitNightly,
  useApproveNightly,
  useRejectNightly,
} from '@/hooks/useSales';
import { NightlyItemRow } from '@/components/nightly/NightlyItemRow';
import { SubmissionSummary } from '@/components/nightly/SubmissionSummary';

function getTopRole(locations: { role: string }[]): string {
  const roles = locations.map((l) => l.role);
  if (roles.includes('owner')) return 'owner';
  if (roles.includes('manager')) return 'manager';
  return 'employee';
}

export default function NightlyPage() {
  const { profile } = useAuth();
  const { show } = useToast();
  const role = useMemo(() => getTopRole(profile?.locations ?? []), [profile]);

  const locations = profile?.locations ?? [];
  const [locationId, setLocationId] = useState(locations[0]?.location_id || '');
  const [salesTotal, setSalesTotal] = useState('');

  const { data: submission, isLoading: subLoading } = useTodaySubmission(locationId);
  const { data: items, isLoading: itemsLoading } = useSubmissionItems(submission?.id);
  const upsertItem = useUpsertItem();
  const removeItem = useRemoveItem();
  const submitNightly = useSubmitNightly();
  const approveNightly = useApproveNightly();
  const rejectNightly = useRejectNightly();

  const status = submission?.status || 'open';
  const isEditable = status === 'open';
  const canApprove = role === 'owner' || role === 'manager';

  const handleLocationChange = (locId: string) => {
    setLocationId(locId);
    setSalesTotal('');
  };

  const handleProductSelect = useCallback(async (product: any) => {
    if (!submission?.id) return;
    const price = product.retail_price ? parseFloat(product.retail_price) : 0;
    try {
      await upsertItem.mutateAsync({
        submissionId: submission.id,
        productId: product.id,
        qty: 1,
        price,
      });
    } catch (err: any) {
      show('Failed to add item: ' + err.message);
    }
  }, [submission?.id, upsertItem, show]);

  const handleQuantityChange = useCallback(async (productId: string, qty: number, price: number) => {
    if (!submission?.id) return;
    try {
      await upsertItem.mutateAsync({
        submissionId: submission.id,
        productId,
        qty,
        price,
      });
    } catch (err: any) {
      show('Failed to update: ' + err.message);
    }
  }, [submission?.id, upsertItem, show]);

  const handleRemove = useCallback(async (productId: string) => {
    if (!submission?.id) return;
    try {
      await removeItem.mutateAsync({
        submissionId: submission.id,
        productId,
      });
    } catch (err: any) {
      show('Failed to remove: ' + err.message);
    }
  }, [submission?.id, removeItem, show]);

  const handleSubmit = async () => {
    if (!submission?.id) return;
    if (!(items ?? []).length) { show('Add at least one item before submitting.'); return; }
    const total = parseFloat(salesTotal);
    if (!total || total <= 0) { show('Enter the actual sales total.'); return; }
    try {
      await submitNightly.mutateAsync({ submissionId: submission.id, salesTotal: total });
      show('Nightly totals submitted for approval.');
    } catch (err: any) {
      show('Submit failed: ' + err.message);
    }
  };

  const handleApprove = async () => {
    if (!submission?.id) return;
    try {
      await approveNightly.mutateAsync(submission.id);
      show('Approved — inventory updated.');
    } catch (err: any) {
      show('Approve failed: ' + err.message);
    }
  };

  const handleReject = async () => {
    if (!submission?.id) return;
    const reason = prompt('Reason for returning (optional):') ?? '';
    try {
      await rejectNightly.mutateAsync({ submissionId: submission.id, reason });
      show('Returned to employee for correction.');
    } catch (err: any) {
      show('Reject failed: ' + err.message);
    }
  };

  const locLabel = locations.length === 1
    ? locations[0].location_name.toUpperCase()
    : 'ALL LOCATIONS';

  if (subLoading) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Nightly Totals"
        subtitle={`PANDORA'S BOX · ${locLabel}`}
      />

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      {/* Location selector */}
      {locations.length > 1 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>LOCATION:</span>
          <select className="location-select" value={locationId} onChange={(e) => handleLocationChange(e.target.value)}>
            {locations.map((l) => (
              <option key={l.location_id} value={l.location_id}>{l.location_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Status bar */}
      {submission && (
        <div className={`submission-status-bar ${status}`} style={{ marginBottom: 16 }}>
          <span className={`status-dot ${status}`} />
          <StatusBadge status={status} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginLeft: 8 }}>
            {status === 'open' && 'In progress — add items and submit when ready'}
            {status === 'submitted' && (submission.submitted_at
              ? `Submitted ${new Date(submission.submitted_at).toLocaleString()}`
              : 'Awaiting approval')}
            {status === 'approved' && (submission.approved_at
              ? `Approved ${new Date(submission.approved_at).toLocaleString()}`
              : 'Inventory updated')}
            {status === 'rejected' && 'Returned for correction — edit and resubmit'}
          </span>
        </div>
      )}

      <div className="nightly-grid">
        {/* Left: Product entry + items table */}
        <div>
          {/* Product search card */}
          {isEditable && (
            <div className="sku-entry-card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">Add Product</div>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <ProductSearch
                  onSelect={handleProductSelect}
                  placeholder="Search by name, brand, or SKU…"
                />
              </div>
            </div>
          )}

          {/* Items table */}
          <div className="items-table-card">
            <div className="card-header">
              <div className="card-title">Line Items</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                {(items ?? []).length} item{(items ?? []).length !== 1 ? 's' : ''}
              </div>
            </div>

            {itemsLoading ? (
              <div style={{ padding: 24 }}><Spinner /></div>
            ) : !(items ?? []).length ? (
              <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div className="empty-icon">⊕</div>
                <div className="empty-text">No items yet. Search for a product above to get started.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Subtotal</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(items ?? []).map((item: any) => (
                      <NightlyItemRow
                        key={item.id}
                        item={item}
                        editable={isEditable}
                        onQuantityChange={handleQuantityChange}
                        onRemove={handleRemove}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary + actions */}
        <div>
          <SubmissionSummary
            items={items ?? []}
            salesTotal={salesTotal}
            onSalesTotalChange={setSalesTotal}
            editable={isEditable}
          />

          {/* Action buttons */}
          <div style={{ marginTop: 16 }}>
            {status === 'open' && (
              <>
                <button
                  className="submit-btn btn btn-primary btn-full"
                  onClick={handleSubmit}
                  disabled={submitNightly.isPending}
                >
                  {submitNightly.isPending ? 'Submitting…' : 'Submit for Approval'}
                </button>
                <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", textAlign: 'center' }}>
                  Submitting will lock this entry for manager review.
                </div>
              </>
            )}

            {status === 'submitted' && canApprove && (
              <div className="approval-actions" style={{ display: 'flex', gap: 8 }}>
                <button
                  className="approve-btn btn btn-primary"
                  onClick={handleApprove}
                  disabled={approveNightly.isPending}
                  style={{ flex: 1 }}
                >
                  {approveNightly.isPending ? 'Approving…' : 'Approve'}
                </button>
                <button
                  className="reject-btn btn btn-danger"
                  onClick={handleReject}
                  disabled={rejectNightly.isPending}
                  style={{ flex: 1 }}
                >
                  Reject
                </button>
              </div>
            )}

            {status === 'submitted' && !canApprove && (
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", padding: 16 }}>
                Waiting for manager approval…
              </div>
            )}

            {status === 'approved' && (
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--sage)', fontFamily: "'DM Mono', monospace", padding: 16 }}>
                This submission has been approved and inventory has been updated.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
