import { db } from '../../data/db';
import type { AppSettings, LocalDate } from '../../domain/types';
import {
  assertBackupSize,
  backupFileSchema,
  BackupImportError,
  parseBackupText,
  type BackupFile,
} from './backupSchema';

export interface BackupSummary {
  categories: number;
  transactions: number;
  /** Rango de fechas de los movimientos; `null` si no hay ninguno. */
  range: { from: LocalDate; to: LocalDate } | null;
}

/** Datos para la vista previa: "Contiene N categorías y M movimientos (del … al …)". */
export function summarizeBackup(backup: BackupFile): BackupSummary {
  const dates = backup.data.transactions.map((transaction) => transaction.date).sort();
  const from = dates[0];
  const to = dates[dates.length - 1];
  return {
    categories: backup.data.categories.length,
    transactions: backup.data.transactions.length,
    range: from !== undefined && to !== undefined ? { from, to } : null,
  };
}

function readFileText(file: Blob): Promise<string> {
  // FileReader en lugar de `Blob.text()`: mismo resultado y disponible en
  // todos los navegadores objetivo (y en jsdom para las pruebas).
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'));
    reader.readAsText(file);
  });
}

/**
 * Paso 1 y 2 del flujo de restauración: lee el archivo elegido y lo valida
 * por completo. Lanza `BackupImportError`; no toca la base de datos.
 */
export async function readBackupFile(file: Blob): Promise<BackupFile> {
  assertBackupSize(file.size);
  const text = await readFileText(file);
  return parseBackupText(text);
}

/**
 * Paso 5: reemplaza todos los datos por los del respaldo.
 *
 * Todo ocurre en UNA transacción `rw` sobre las cuatro tablas: si cualquier
 * escritura falla, Dexie aborta y la base queda exactamente como estaba.
 * La validación completa se repite antes de abrir la transacción, de modo que
 * dentro de ella sólo hay escrituras (nunca se valida fila por fila).
 *
 * `persistenceRequested` describe a este navegador, no a los datos, así que
 * se conserva el valor local; `seededAt` y `lastBackupAt` vienen del archivo.
 */
export async function importBackup(input: BackupFile): Promise<void> {
  const parsed = backupFileSchema.safeParse(input);
  if (!parsed.success) {
    throw new BackupImportError('invalid-data', parsed.error);
  }
  const { data } = parsed.data;

  await db.transaction(
    'rw',
    db.categories,
    db.budgetVersions,
    db.transactions,
    db.settings,
    async () => {
      const current = await db.settings.get('app');
      const settings: AppSettings = {
        key: 'app',
        seededAt: data.settings.seededAt,
        lastBackupAt: data.settings.lastBackupAt,
        persistenceRequested: current?.persistenceRequested ?? false,
        backupReminderDismissedAt: data.settings.backupReminderDismissedAt,
      };

      await db.categories.clear();
      await db.budgetVersions.clear();
      await db.transactions.clear();

      // `bulkAdd` (no `bulkPut`): un ID repetido que se colara fallaría y abortaría todo.
      await db.categories.bulkAdd(data.categories);
      await db.budgetVersions.bulkAdd(data.budgetVersions);
      await db.transactions.bulkAdd(data.transactions);
      await db.settings.put(settings);
    },
  );
}
