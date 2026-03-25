import { useMemo } from 'react';

export interface ParsedRow {
  _rowNum: number;
  _sku: string;
  _valid: boolean;
  _errors: string[];
  _warnings: string[];
  category_number: string;
  product_number: string;
  name: string;
  brand?: string;
  retail_price?: string;
  cost_price?: string;
  supplier?: string;
  [key: string]: unknown;
}

interface Props {
  rows: ParsedRow[];
  maxRows?: number;
}

export function ImportPreviewTable({ rows, maxRows = 200 }: Props) {
  const shown = useMemo(() => rows.slice(0, maxRows), [rows, maxRows]);

  if (rows.length === 0) return null;

  return (
    <div className="preview-card card" style={{ display: 'block' }}>
      <div className="card-header">
        <div className="card-title">Preview</div>
        <div className="card-action">
          Showing {Math.min(rows.length, maxRows)} of {rows.length}
        </div>
      </div>
      <div className="preview-scroll">
        <table className="preview-table">
          <thead>
            <tr>
              <th>#</th>
              <th>SKU</th>
              <th>Name</th>
              <th>Brand</th>
              <th>Retail</th>
              <th>Cost</th>
              <th>Supplier</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const cls = row._errors.length
                ? 'row-error'
                : row._warnings.length
                  ? 'row-warn'
                  : '';

              return (
                <tr key={row._rowNum} className={cls}>
                  <td style={{ color: 'var(--text-muted)' }}>{row._rowNum}</td>
                  <td className="td-sku">{row._sku}</td>
                  <td>{row.name || '\u2014'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{row.brand || '\u2014'}</td>
                  <td>
                    {row.retail_price
                      ? '$' + parseFloat(row.retail_price).toFixed(2)
                      : '\u2014'}
                  </td>
                  <td>
                    {row.cost_price
                      ? '$' + parseFloat(row.cost_price).toFixed(2)
                      : '\u2014'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {row.supplier || '\u2014'}
                  </td>
                  <td>
                    {row._errors.length ? (
                      <span className="td-error">{'\u2715'} {row._errors[0]}</span>
                    ) : row._warnings.length ? (
                      <span style={{ color: 'var(--gold)', fontSize: '0.72rem' }}>
                        {'\u26A0'} {row._warnings[0]}
                      </span>
                    ) : (
                      <span className="td-ok">{'\u2713'} Valid</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
