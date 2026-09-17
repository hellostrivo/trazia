import { useState } from 'react';
import { Button } from '../../components/Button';
import { db } from '../../data/db';
import { useLiveQuery } from '../../data/hooks/useLiveQuery';
import { dismissBackupReminder } from '../../data/repositories/settings';
import { isBackupReminderDue } from '../../domain/backupReminder';
import { downloadCurrentBackup } from '../../services/backup/exportBackup';

export const REMINDER_NEVER_TEXT = 'Aún no has descargado un respaldo de tus datos.';
export const REMINDER_OLD_TEXT = 'Han pasado más de 30 días desde tu último respaldo.';
export const REMINDER_DOT_TEXT = 'respaldo pendiente';

/**
 * Estado del recordatorio (SPEC-07, punto 4) a partir de una consulta viva:
 * cambia solo cuando se guarda un movimiento, se respalda o se cierra el aviso.
 * Lo usan la sección de Configuración y el punto de la pestaña.
 */
export function useBackupReminder(): { due: boolean; neverBackedUp: boolean } {
  const query = useLiveQuery(async () => {
    const [transactionsCount, settings] = await Promise.all([
      db.transactions.count(),
      db.settings.get('app'),
    ]);
    const lastBackupAt = settings?.lastBackupAt ?? null;
    return {
      due: isBackupReminderDue({
        transactionsCount,
        lastBackupAt,
        dismissedAt: settings?.backupReminderDismissedAt ?? null,
        now: new Date(),
      }),
      neverBackedUp: lastBackupAt === null,
    };
  });

  return query.data ?? { due: false, neverBackedUp: false };
}

type Status = 'idle' | 'generating' | 'error';

/** Aviso discreto en Configuración; no se renderiza si no toca. */
export function RecordatorioRespaldo() {
  const reminder = useBackupReminder();
  const [status, setStatus] = useState<Status>('idle');

  if (!reminder.due) return null;

  const handleDownload = async () => {
    setStatus('generating');
    try {
      await downloadCurrentBackup();
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissBackupReminder();
    } catch {
      setStatus('error');
    }
  };

  return (
    <aside className="form-note recordatorio-respaldo" aria-label="Recordatorio de respaldo">
      <p>{reminder.neverBackedUp ? REMINDER_NEVER_TEXT : REMINDER_OLD_TEXT}</p>
      {status === 'error' && <p role="alert">No se pudo generar el archivo. Intenta de nuevo.</p>}
      <div className="row" style={{ marginTop: 'var(--space-3)' }}>
        <Button
          onClick={handleDownload}
          disabled={status === 'generating'}
          aria-busy={status === 'generating'}
        >
          {status === 'generating' ? 'Generando…' : 'Descargar respaldo'}
        </Button>
        <Button variant="ghost" onClick={handleDismiss} disabled={status === 'generating'}>
          Cerrar por 30 días
        </Button>
      </div>
    </aside>
  );
}
