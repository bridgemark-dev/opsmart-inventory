interface EmptyStateProps {
  icon?: string;
  message: string;
}

export function EmptyState({ icon = '○', message }: EmptyStateProps) {
  return (
    <div className="state-empty">
      <div className="state-icon">{icon}</div>
      <div className="state-text">{message}</div>
    </div>
  );
}
