import { z } from 'zod';
import {
  appSettingsSchema,
  budgetVersionSchema,
  categorySchema,
  isoDateTimeSchema,
  transactionSchema,
} from '../../domain/schemas';

/**
 * Formato del archivo de respaldo (SPEC-07). Los registros usan los esquemas
 * del dominio de SPEC-01 tal cual; aquí sólo se añade el sobre y las reglas
 * que cruzan tablas (integridad referencial e IDs únicos).
 */
export const BACKUP_APP = 'trazia';
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_MAX_BYTES = 20 * 1024 * 1024;

/** Lo que se guarda de `settings`: todo menos la clave fija `key`. */
export const backupSettingsSchema = appSettingsSchema.omit({ key: true });

function findDuplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

export const backupDataSchema = z
  .object({
    categories: z.array(categorySchema),
    budgetVersions: z.array(budgetVersionSchema),
    transactions: z.array(transactionSchema),
    settings: backupSettingsSchema,
  })
  .superRefine((data, ctx) => {
    // IDs únicos por tabla.
    const tables = [
      ['categories', data.categories],
      ['budgetVersions', data.budgetVersions],
      ['transactions', data.transactions],
    ] as const;
    for (const [name, rows] of tables) {
      for (const id of findDuplicates(rows.map((row) => row.id))) {
        ctx.addIssue({ code: 'custom', path: [name], message: `ID duplicado: ${id}` });
      }
    }

    // Una versión de presupuesto por categoría y mes (índice único en Dexie).
    for (const key of findDuplicates(
      data.budgetVersions.map((version) => `${version.categoryId}|${version.effectiveFrom}`),
    )) {
      ctx.addIssue({
        code: 'custom',
        path: ['budgetVersions'],
        message: `Presupuesto repetido: ${key}`,
      });
    }

    // Integridad referencial: todo categoryId apunta a una categoría del archivo.
    const categoryIds = new Set(data.categories.map((category) => category.id));
    data.budgetVersions.forEach((version, index) => {
      if (!categoryIds.has(version.categoryId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['budgetVersions', index, 'categoryId'],
          message: `Categoría inexistente: ${version.categoryId}`,
        });
      }
    });
    data.transactions.forEach((transaction, index) => {
      if (!categoryIds.has(transaction.categoryId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['transactions', index, 'categoryId'],
          message: `Categoría inexistente: ${transaction.categoryId}`,
        });
      }
    });
  });

/** Sobre mínimo para distinguir "no es de TRAZIA" de "versión más nueva" antes de validar los datos. */
export const backupEnvelopeSchema = z.object({
  app: z.literal(BACKUP_APP),
  formatVersion: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
});

export const backupFileSchema = backupEnvelopeSchema.extend({
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: isoDateTimeSchema,
  data: backupDataSchema,
});

export type BackupSettings = z.infer<typeof backupSettingsSchema>;
export type BackupData = z.infer<typeof backupDataSchema>;
export type BackupFile = z.infer<typeof backupFileSchema>;

export type BackupErrorReason = 'not-trazia' | 'newer-version' | 'invalid-data' | 'too-large';

/** Mensajes exactos de SPEC-07; la UI los muestra sin cambios. */
export const backupErrorMessages: Record<BackupErrorReason, string> = {
  'not-trazia': 'Este archivo no es un respaldo de TRAZIA.',
  'newer-version':
    'Este respaldo se creó con una versión más reciente de TRAZIA. Actualiza la app e inténtalo de nuevo.',
  'invalid-data':
    'El respaldo tiene datos incompletos o dañados. Tus datos actuales no se modificaron.',
  'too-large': 'El archivo supera 20 MB.',
};

export class BackupImportError extends Error {
  readonly reason: BackupErrorReason;

  constructor(reason: BackupErrorReason, cause?: unknown) {
    super(backupErrorMessages[reason], cause === undefined ? undefined : { cause });
    this.name = 'BackupImportError';
    this.reason = reason;
  }
}

export function assertBackupSize(bytes: number): void {
  if (bytes > BACKUP_MAX_BYTES) {
    throw new BackupImportError('too-large');
  }
}

/**
 * Clasifica y valida un objeto ya deserializado. Lanza `BackupImportError`
 * con la razón exacta; nunca toca la base de datos.
 */
export function parseBackupObject(input: unknown): BackupFile {
  const envelope = backupEnvelopeSchema.safeParse(input);
  if (!envelope.success) {
    throw new BackupImportError('not-trazia', envelope.error);
  }
  if (
    envelope.data.formatVersion > BACKUP_FORMAT_VERSION ||
    envelope.data.schemaVersion > BACKUP_SCHEMA_VERSION
  ) {
    throw new BackupImportError('newer-version');
  }

  const file = backupFileSchema.safeParse(input);
  if (!file.success) {
    throw new BackupImportError('invalid-data', file.error);
  }
  return file.data;
}

/** Igual que `parseBackupObject`, partiendo del texto del archivo. */
export function parseBackupText(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new BackupImportError('not-trazia', error);
  }
  return parseBackupObject(parsed);
}
