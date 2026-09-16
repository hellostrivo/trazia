interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
}

export function Toast({ message, open, onClose }: ToastProps) {
  if (!open) return null;

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      <div className="toast" role="status" aria-live="polite" aria-atomic="true">
        <span>{message}</span>
        <button type="button" onClick={onClose} aria-label="Cerrar aviso" style={{ marginLeft: '0.75rem' }}>
          ×
        </button>
      </div>
    </div>
  );
}
