import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const sizeMap: Record<string, string> = {
  sm: '380px',
  md: '520px',
  lg: '680px',
  xl: '860px',
};

export function Modal({ isOpen, onClose, title, size = 'md', footer, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="confirm-overlay open"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="confirm-box" style={{ maxWidth: sizeMap[size] }}>
        <div className="side-panel-header" style={{ margin: '-28px -28px 20px', padding: '18px 22px' }}>
          <div className="side-panel-title">{title}</div>
          <button className="side-panel-close" onClick={onClose}>&times;</button>
        </div>
        <div>{children}</div>
        {footer && (
          <div className="confirm-actions" style={{ marginTop: '20px' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
