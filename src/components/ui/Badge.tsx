const variantMap: Record<string, string> = {
  success: 'tag-active',
  warning: 'tag-new',
  danger:  'tag-inactive',
  neutral: '',
  info:    '',
};

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  text: string;
  className?: string;
}

export function Badge({ variant = 'neutral', text, className = '' }: BadgeProps) {
  const variantClass = variantMap[variant] ?? '';

  // Neutral and info get inline styles since they have no existing CSS class
  const inlineStyle: React.CSSProperties | undefined =
    variant === 'neutral' ? { background: 'var(--surface3)', color: 'var(--text-dim)' }
    : variant === 'info'  ? { background: 'var(--blue-dim)', color: 'var(--blue)' }
    : undefined;

  return (
    <span className={`tag ${variantClass} ${className}`.trim()} style={inlineStyle}>
      {text}
    </span>
  );
}
