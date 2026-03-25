interface SubmissionSummaryProps {
  items: any[];
  salesTotal: string;
  onSalesTotalChange: (val: string) => void;
  editable: boolean;
}

export function SubmissionSummary({ items, salesTotal, onSalesTotalChange, editable }: SubmissionSummaryProps) {
  const totalSkus = items.length;
  const totalUnits = items.reduce((s, i) => s + (i.quantity_sold || 0), 0);
  const retailValue = items.reduce((s, i) => s + ((i.quantity_sold || 0) * (parseFloat(i.retail_price) || 0)), 0);

  return (
    <div className="summary-card">
      <div className="card-header">
        <div className="card-title">Summary</div>
      </div>
      <div className="summary-body">
        <div className="summary-row">
          <span className="summary-label">Total SKUs</span>
          <span className="summary-value">{totalSkus}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Total Units Sold</span>
          <span className="summary-value">{totalUnits.toLocaleString()}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Retail Value (est.)</span>
          <span className="summary-value">${retailValue.toFixed(2)}</span>
        </div>
        <div className="summary-total-row">
          <span className="summary-total-label">Estimated Total Sales</span>
          <span className="summary-total-value">${retailValue.toFixed(2)}</span>
        </div>
      </div>
      <div className="sales-total-field">
        <div className="sales-total-label">Actual Sales Total (cash + card)</div>
        <div className="sales-total-wrap">
          <span className="currency-prefix">$</span>
          <input
            className="sales-total-input"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={salesTotal}
            onChange={(e) => onSalesTotalChange(e.target.value)}
            disabled={!editable}
          />
        </div>
      </div>
    </div>
  );
}
