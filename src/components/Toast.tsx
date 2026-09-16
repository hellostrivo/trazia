export interface ToastAction {
  label: string;
  onAction: () => void;
}

interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  /** Acción opcional dentro del toast, por ejemplo "Deshacer" (T-011). */
  action?: ToastAction;
}

export function Toast({ message, open, onClose, action }: ToastProps) {
  if (!open) return null;

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      <div className="toast" role="status" aria-live="polite" aria-atomic="true">
        <span>{message}</span>
        {action ? (
          <button type="button" className="toast-action" onClick={action.onAction}>
            {action.label}
          </button>
        ) : null}
        <button type="button" onClick={onClose} aria-label="Cerrar aviso" style={{ marginLeft: '0.75rem' }}>
          ×
        </button>
      </div>
    </div>
  );
}
