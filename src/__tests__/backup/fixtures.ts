import type { BackupFile } from '../../services/backup/backupSchema';

export const ISO = '2026-09-01T12:00:00.000Z';

/** Respaldo válido con dos categorías, dos presupuestos y tres movimientos. */
export function makeValidBackup(): BackupFile {
  return {
    app: 'trazia',
    formatVersion: 1,
    schemaVersion: 1,
    exportedAt: '2026-09-16T10:00:00.000Z',
    data: {
      categories: [
        {
          id: 'cat-hogar',
          name: 'Hogar',
          colorKey: 'slate',
          order: 0,
          archivedAt: null,
          createdAt: ISO,
          updatedAt: ISO,
        },
        {
          id: 'cat-super',
          name: 'Supermercado',
          colorKey: 'sage',
          order: 1,
          archivedAt: null,
          createdAt: ISO,
          updatedAt: ISO,
        },
      ],
      budgetVersions: [
        {
          id: 'cat-hogar-2026-09',
          categoryId: 'cat-hogar',
          effectiveFrom: '2026-09',
          amountCents: 700000,
          createdAt: ISO,
          updatedAt: ISO,
        },
        {
          id: 'cat-super-2026-09',
          categoryId: 'cat-super',
          effectiveFrom: '2026-09',
          amountCents: 300000,
          createdAt: ISO,
          updatedAt: ISO,
        },
      ],
      transactions: [
        {
          id: 'tx-1',
          concept: 'Renta',
          amountCents: 850000,
          categoryId: 'cat-hogar',
          date: '2026-03-01',
          createdAt: ISO,
          updatedAt: ISO,
        },
        {
          id: 'tx-2',
          concept: 'Despensa',
          amountCents: 123450,
          categoryId: 'cat-super',
          date: '2026-09-10',
          createdAt: ISO,
          updatedAt: ISO,
        },
        {
          id: 'tx-3',
          concept: 'Foco',
          amountCents: 9900,
          categoryId: 'cat-hogar',
          date: '2026-09-16',
          createdAt: ISO,
          updatedAt: ISO,
        },
      ],
      settings: {
        seededAt: ISO,
        lastBackupAt: null,
        persistenceRequested: false,
        backupReminderDismissedAt: null,
      },
    },
  };
}

/** Copia profunda para mutar sin tocar el original. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
