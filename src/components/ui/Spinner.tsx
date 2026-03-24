interface SpinnerProps {
  message?: string;
}

export function Spinner({ message = 'Loading…' }: SpinnerProps) {
  return (
    <div className="state-loading">
      <div className="state-icon">↻</div>
      <div className="state-text">{message}</div>
    </div>
  );
}
