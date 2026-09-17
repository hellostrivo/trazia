import type { ISODateTime } from './types';

/** Umbral del recordatorio de respaldo (SPEC-07, punto 4; T-019). */
export const BACKUP_REMINDER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface BackupReminderInput {
  transactionsCount: number;
  lastBackupAt: ISODateTime | null;
  dismissedAt: ISODateTime | null;
  now: Date;
}

function daysSince(iso: ISODateTime | null, now: Date): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return (now.getTime() - then) / DAY_MS;
}

/**
 * El recordatorio se muestra si hay movimientos y el último respaldo tiene
 * **más** de 30 días (o nunca se ha hecho), salvo que se haya cerrado hace
 * menos de 30 días. A los 30 días exactos ni se muestra ni cuenta el cierre
 * como vencido: "más de 30" es estricto en ambos sentidos.
 */
export function isBackupReminderDue(input: BackupReminderInput): boolean {
  if (input.transactionsCount <= 0) return false;

  const sinceBackup = daysSince(input.lastBackupAt, input.now);
  const backupIsOld = sinceBackup === null || sinceBackup > BACKUP_REMINDER_DAYS;
  if (!backupIsOld) return false;

  const sinceDismiss = daysSince(input.dismissedAt, input.now);
  const dismissalActive = sinceDismiss !== null && sinceDismiss <= BACKUP_REMINDER_DAYS;
  return !dismissalActive;
}
