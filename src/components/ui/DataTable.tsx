import { useState } from 'react';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = 'No data found.',
  emptyIcon,
  onRowClick,
  rowKey,
  rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const aVal = (a as any)[sortKey];
        const bVal = (b as any)[sortKey];
        const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;

  if (loading) return <Spinner />;
  if (!data.length) return <EmptyState icon={emptyIcon} message={emptyMessage} />;

  return (
    <div className="data-table-card">
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={
                    sortKey === col.key
                      ? sortDir === 'asc' ? 'sort-asc' : 'sort-desc'
                      : ''
                  }
                  style={{ textAlign: col.align || 'left' }}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr
                key={rowKey(row)}
                className={rowClassName?.(row) || ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
