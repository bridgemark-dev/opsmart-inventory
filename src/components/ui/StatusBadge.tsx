import { Badge } from './Badge';

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
  // PO statuses
  draft:      { variant: 'neutral', label: 'Draft' },
  sent:       { variant: 'info',    label: 'Sent' },
  partial:    { variant: 'warning', label: 'Partial' },
  received:   { variant: 'success', label: 'Received' },
  cancelled:  { variant: 'danger',  label: 'Cancelled' },
  // Nightly submission statuses
  open:       { variant: 'neutral', label: 'Open' },
  submitted:  { variant: 'info',    label: 'Submitted' },
  approved:   { variant: 'success', label: 'Approved' },
  rejected:   { variant: 'danger',  label: 'Rejected' },
  // Generic
  active:     { variant: 'success', label: 'Active' },
  inactive:   { variant: 'danger',  label: 'Inactive' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { variant: 'neutral' as const, label: status };
  return <Badge variant={config.variant} text={config.label} className={className} />;
}
