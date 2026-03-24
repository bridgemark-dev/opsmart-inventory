interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: string;
}

export function StatCard({ label, value, delta, deltaLabel, icon }: StatCardProps) {
  const deltaClass = delta != null
    ? delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'
    : '';

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <span style={{
          fontSize: '0.65rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          fontFamily: "'DM Mono', monospace",
        }}>
          {label}
        </span>
        {icon && <span style={{ fontSize: '16px', opacity: 0.5 }}>{icon}</span>}
      </div>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '1.8rem',
        fontWeight: 500,
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      {delta != null && (
        <div style={{
          fontSize: '0.72rem',
          fontFamily: "'DM Mono', monospace",
          marginTop: '6px',
          color: deltaClass === 'positive' ? 'var(--sage)'
               : deltaClass === 'negative' ? 'var(--crimson)'
               : 'var(--text-muted)',
        }}>
          {delta > 0 ? '+' : ''}{delta} {deltaLabel || ''}
        </div>
      )}
    </div>
  );
}
