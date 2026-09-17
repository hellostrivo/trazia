import { useId, useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import {
  clearAllData,
  CONFIRM_DELETE_WORD,
  isDeleteConfirmationValid,
} from '../../services/backup/clearAllData';
import { downloadCurrentBackup } from '../../services/backup/exportBackup';

export const DELETE_INTRO_TEXT =
  'Se borrarán todas tus categorías, presupuestos y movimientos de este dispositivo. La app quedará como recién instalada, con las categorías genéricas. Esta acción no se puede deshacer.';
export const DELETE_DONE_TEXT = 'Datos borrados. La app quedó como recién instalada.';
const DELETE_FAILED_TEXT = 'No se pudieron borrar los datos. Tus datos actuales no se modificaron.';
const DOWNLOAD_ERROR_TEXT = 'No se pudo generar el archivo. Intenta de nuevo.';

type Step = 'closed' | 'confirm' | 'type' | 'deleting';

/**
 * Configuración › Borrar todos los datos (SPEC-07, punto 5).
 * Doble confirmación: diálogo con explicación y opción de respaldar primero,
 * y después escribir "BORRAR" exactamente. El borrado y la resiembra van en
 * una sola transacción (`clearAllData`).
 */
export function BorrarDatosSection() {
  const inputId = useId();
  const [step, setStep] = useState<Step>('closed');
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<{ kind: 'status' | 'alert'; text: string } | null>(null);
  const [download, setDownload] = useState<'idle' | 'generating' | 'error'>('idle');

  const open = () => {
    setTyped('');
    setDownload('idle');
    setMessage(null);
    setStep('confirm');
  };

  const close = () => {
    if (step === 'deleting') return;
    setStep('closed');
    setTyped('');
  };

  const handleDownload = async () => {
    setDownload('generating');
    try {
      await downloadCurrentBackup();
      setDownload('idle');
    } catch {
      setDownload('error');
    }
  };

  const handleDelete = async () => {
    if (!isDeleteConfirmationValid(typed)) return;
    setStep('deleting');
    try {
      await clearAllData();
      setMessage({ kind: 'status', text: DELETE_DONE_TEXT });
    } catch {
      setMessage({ kind: 'alert', text: DELETE_FAILED_TEXT });
    } finally {
      setStep('closed');
      setTyped('');
    }
  };

  const canDelete = isDeleteConfirmationValid(typed) && step === 'type';
  const busy = step === 'deleting' || download === 'generating';

  return (
    <section className="card" style={{ padding: '1.5rem' }} aria-labelledby="borrar-datos-title">
      <h2 id="borrar-datos-title" style={{ marginBottom: '0.5rem' }}>
        Borrar todos los datos
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Deja la app como recién instalada. Conviene descargar un respaldo antes.
      </p>
      {message && <p role={message.kind}>{message.text}</p>}
      <div>
        <Button variant="secondary" onClick={open}>
          Borrar todos los datos
        </Button>
      </div>

      <Dialog open={step !== 'closed'} title="Borrar todos los datos" onClose={close}>
        <div className="dialog-body stack">
          <p>{DELETE_INTRO_TEXT}</p>
          {download === 'error' && <p role="alert">{DOWNLOAD_ERROR_TEXT}</p>}

          {step === 'confirm' && (
            <div className="dialog-footer">
              <Button
                variant="secondary"
                onClick={handleDownload}
                disabled={busy}
                aria-busy={download === 'generating'}
              >
                {download === 'generating' ? 'Generando…' : 'Descargar respaldo actual primero'}
              </Button>
              <Button variant="ghost" onClick={close} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={() => setStep('type')} disabled={busy}>
                Continuar
              </Button>
            </div>
          )}

          {(step === 'type' || step === 'deleting') && (
            <>
              <div className="field">
                <label htmlFor={inputId}>Escribe {CONFIRM_DELETE_WORD} para confirmar</label>
                <input
                  id={inputId}
                  type="text"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={step === 'deleting'}
                />
              </div>
              <div className="dialog-footer">
                <Button variant="ghost" onClick={close} disabled={step === 'deleting'}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={!canDelete}
                  aria-busy={step === 'deleting'}
                >
                  {step === 'deleting' ? 'Borrando…' : 'Borrar todo'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </section>
  );
}
