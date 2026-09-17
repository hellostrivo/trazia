import { useId, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { parseLocalDate } from '../../domain/dates';
import { downloadCurrentBackup } from '../../services/backup/exportBackup';
import { BackupImportError, type BackupFile } from '../../services/backup/backupSchema';
import {
  importBackup,
  readBackupFile,
  summarizeBackup,
  type BackupSummary,
} from '../../services/backup/importBackup';
import { EstadoAlmacenamiento } from './EstadoAlmacenamiento';

export const BACKUP_UNENCRYPTED_NOTICE =
  'El respaldo no está cifrado. Guárdalo en un lugar seguro.';
export const RESTORE_CONFIRM_TEXT = 'Esto reemplazará todos tus datos actuales.';
const DOWNLOAD_ERROR_TEXT = 'No se pudo generar el archivo. Intenta de nuevo.';
const RESTORE_FAILED_TEXT =
  'No se pudo restaurar el respaldo. Tus datos actuales no se modificaron.';

const longDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function count(value: number, singular: string, plural: string): string {
  return `${value.toLocaleString('es-MX')} ${value === 1 ? singular : plural}`;
}

/** "Contiene N categorías y M movimientos (del {fecha} al {fecha})". */
export function formatBackupSummary(summary: BackupSummary): string {
  const base = `Contiene ${count(summary.categories, 'categoría', 'categorías')} y ${count(
    summary.transactions,
    'movimiento',
    'movimientos',
  )}`;
  if (!summary.range) return base;
  const from = longDateFormatter.format(parseLocalDate(summary.range.from));
  const to = longDateFormatter.format(parseLocalDate(summary.range.to));
  return `${base} (del ${from} al ${to})`;
}

type DownloadStatus = 'idle' | 'generating' | 'done' | 'error';

type RestoreState =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'error'; message: string }
  | {
      step: 'preview';
      backup: BackupFile;
      summary: BackupSummary;
      confirming: boolean;
      importing: boolean;
    }
  | { step: 'done' };

/**
 * Configuración › Datos y respaldo (SPEC-07, puntos 1 a 3).
 *
 * Restaurar sigue el orden obligatorio: elegir archivo → validar todo →
 * vista previa → confirmar (con opción de descargar el respaldo actual) →
 * reemplazar en una sola transacción (`importBackup`).
 */
export function RespaldoSection() {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [download, setDownload] = useState<DownloadStatus>('idle');
  const [restore, setRestore] = useState<RestoreState>({ step: 'idle' });

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async () => {
    setDownload('generating');
    try {
      await downloadCurrentBackup();
      setDownload('done');
    } catch {
      setDownload('error');
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRestore({ step: 'reading' });
    try {
      const backup = await readBackupFile(file);
      setRestore({
        step: 'preview',
        backup,
        summary: summarizeBackup(backup),
        confirming: false,
        importing: false,
      });
    } catch (error) {
      const message = error instanceof BackupImportError ? error.message : RESTORE_FAILED_TEXT;
      setRestore({ step: 'error', message });
      resetFileInput();
    }
  };

  const openConfirm = () => {
    if (restore.step === 'preview') setRestore({ ...restore, confirming: true });
  };

  const closeConfirm = () => {
    if (restore.step === 'preview' && !restore.importing)
      setRestore({ ...restore, confirming: false });
  };

  const cancelRestore = () => {
    setRestore({ step: 'idle' });
    resetFileInput();
  };

  const handleReplace = async () => {
    if (restore.step !== 'preview') return;
    setRestore({ ...restore, importing: true });
    try {
      await importBackup(restore.backup);
      setRestore({ step: 'done' });
    } catch (error) {
      const message = error instanceof BackupImportError ? error.message : RESTORE_FAILED_TEXT;
      setRestore({ step: 'error', message });
    } finally {
      resetFileInput();
    }
  };

  const busy = restore.step === 'reading' || (restore.step === 'preview' && restore.importing);

  return (
    <section className="card" style={{ padding: '1.5rem' }} aria-labelledby="respaldo-title">
      <h2 id="respaldo-title" style={{ marginBottom: '1rem' }}>
        Datos y respaldo
      </h2>

      <div className="stack">
        <EstadoAlmacenamiento />

        {/* Punto 2: descargar */}
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          <h3 style={{ margin: 0 }}>Descargar respaldo</h3>
          <p className="muted" style={{ margin: 0 }}>
            Un archivo JSON con tus categorías, presupuestos y movimientos.
          </p>
          <p style={{ margin: 0 }}>{BACKUP_UNENCRYPTED_NOTICE}</p>
          {download === 'error' && <p role="alert">{DOWNLOAD_ERROR_TEXT}</p>}
          {download === 'done' && <p role="status">Respaldo descargado.</p>}
          <div>
            <Button
              onClick={handleDownload}
              disabled={download === 'generating'}
              aria-busy={download === 'generating'}
            >
              {download === 'generating' ? 'Generando…' : 'Descargar respaldo'}
            </Button>
          </div>
        </div>

        {/* Punto 3: restaurar */}
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          <h3 style={{ margin: 0 }}>Restaurar respaldo</h3>
          <p className="muted" style={{ margin: 0 }}>
            Elige un archivo de respaldo de TRAZIA (.json, hasta 20 MB). Antes de reemplazar nada se
            revisa el archivo completo y se muestra lo que contiene.
          </p>
          <div className="field">
            <label htmlFor={fileInputId}>Archivo de respaldo</label>
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              disabled={busy}
            />
          </div>

          {restore.step === 'reading' && <p role="status">Revisando el archivo…</p>}
          {restore.step === 'error' && <p role="alert">{restore.message}</p>}
          {restore.step === 'done' && (
            <p role="status">Respaldo restaurado. Tus datos ya están actualizados.</p>
          )}

          {restore.step === 'preview' && (
            <div className="form-note" data-testid="respaldo-vista-previa">
              <p>{formatBackupSummary(restore.summary)}</p>
              <div className="row" style={{ marginTop: 'var(--space-3)' }}>
                <Button onClick={openConfirm} disabled={restore.importing}>
                  Restaurar
                </Button>
                <Button variant="secondary" onClick={cancelRestore} disabled={restore.importing}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={restore.step === 'preview' && restore.confirming}
        title="Restaurar respaldo"
        onClose={closeConfirm}
      >
        <div className="dialog-body stack">
          <p>{RESTORE_CONFIRM_TEXT}</p>
          {restore.step === 'preview' && (
            <p className="muted">{formatBackupSummary(restore.summary)}</p>
          )}
          {download === 'error' && <p role="alert">{DOWNLOAD_ERROR_TEXT}</p>}
          <div className="dialog-footer">
            <Button
              variant="secondary"
              onClick={handleDownload}
              disabled={busy || download === 'generating'}
            >
              {download === 'generating' ? 'Generando…' : 'Descargar respaldo actual primero'}
            </Button>
            <Button variant="ghost" onClick={closeConfirm} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleReplace} disabled={busy} aria-busy={busy}>
              {busy ? 'Reemplazando…' : 'Reemplazar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
