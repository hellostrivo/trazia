import { db } from '../../data/db';
import { formatLocalDate } from '../../domain/dates';
import { makeDefaultSettings } from '../../domain/seed';
import {
  BACKUP_APP,
  BACKUP_FORMAT_VERSION,
  BACKUP_SCHEMA_VERSION,
  backupFileSchema,
  type BackupData,
  type BackupFile,
} from './backupSchema';

export const BACKUP_MIME = 'application/json';

/** `trazia-respaldo-2026-09-16.json`, con la fecha local del dispositivo. */
export function backupFilename(date: Date): string {
  return `trazia-respaldo-${formatLocalDate(date)}.json`;
}

/**
 * Lee las cuatro tablas en una sola transacción de lectura para que el
 * respaldo sea una foto coherente (nada escrito a medias entre tablas).
 */
export async function readBackupData(): Promise<BackupData> {
  return db.transaction(
    'r',
    db.categories,
    db.budgetVersions,
    db.transactions,
    db.settings,
    async () => {
      const [categories, budgetVersions, transactions, settingsRow] = await Promise.all([
        db.categories.toArray(),
        db.budgetVersions.toArray(),
        db.transactions.toArray(),
        db.settings.get('app'),
      ]);
      const row = settingsRow ?? makeDefaultSettings();
      const settings: BackupData['settings'] = {
        seededAt: row.seededAt,
        lastBackupAt: row.lastBackupAt,
        persistenceRequested: row.persistenceRequested,
      };
      return { categories, budgetVersions, transactions, settings };
    },
  );
}

/** Arma el documento; función pura para poder probar el sobre sin base de datos. */
export function buildBackupFile(data: BackupData, exportedAt: Date): BackupFile {
  return backupFileSchema.parse({
    app: BACKUP_APP,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    data,
  });
}

export function serializeBackup(file: BackupFile): Blob {
  return new Blob([JSON.stringify(file, null, 2)], { type: BACKUP_MIME });
}

/** Respaldo completo de la base local como `Blob` JSON. No modifica nada. */
export async function exportBackup(now: Date = new Date()): Promise<Blob> {
  const data = await readBackupData();
  return serializeBackup(buildBackupFile(data, now));
}

/** Registra que el respaldo se entregó (SPEC-07, punto 2). */
export async function markBackupCompleted(at: Date = new Date()): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = (await db.settings.get('app')) ?? makeDefaultSettings();
    await db.settings.put({ ...current, key: 'app', lastBackupAt: at.toISOString() });
  });
}
