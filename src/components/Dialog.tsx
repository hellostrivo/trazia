import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ open, title, onClose, children }: DialogProps) {
  const titleId = useRef(`dialog-title-${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" aria-hidden={!open}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId.current}>
        <div className="dialog-header">
          <h2 id={titleId.current}>{title}</h2>
          <button type="button" className="dialog-close" aria-label="Cerrar diálogo" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
