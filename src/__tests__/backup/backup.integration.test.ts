// @vitest-environment node
// Node en lugar de jsdom: el `Blob` de jsdom no implementa `text()` y aquí se
// vuelve a leer el archivo exportado. fake-indexeddb funciona igual.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../data/db';
import { ensureSeedCategories, listCategories } from '../../data/repositories/categories';
import { setBudgetForMonth } from '../../data/repositories/budgets';
import { upsertTransaction } from '../../data/repositories/transactions';
import { getSettings } from '../../data/repositories/settings';
import {
  BACKUP_MIME,
  backupFilename,
  buildBackupFile,
  exportBackup,
  markBackupCompleted,
  readBackupData,
} from '../../services/backup/exportBackup';
import {
  BackupImportError,
  parseBackupText,
  type BackupFile,
} from '../../services/backup/backupSchema';
import { importBackup, summarizeBackup } from '../../services/backup/importBackup';
import { makeValidBackup } from './fixtures';

/** Foto completa de la base, ordenada por id, para comparaciones profundas. */
async function snapshot() {
  const byId = <T extends { id: string }>(rows: T[]) =>
    [...rows].sort((a, b) => a.id.localeCompare(b.id));
  return {
    categories: byId(await db.categories.toArray()),
    budgetVersions: byId(await db.budgetVersions.toArray()),
    transactions: byId(await db.transactions.toArray()),
    settings: (await db.settings.toArray()).map((row) => ({ ...row })),
  };
}

/** Datos "reales" a través de los repositorios: semilla, dos presupuestos y tres movimientos. */
async function seedRealData() {
  await ensureSeedCategories();
  const [hogar, superm] = await listCategories();
  if (!hogar || !superm) throw new Error('semilla incompleta');
  await setBudgetForMonth({ categoryId: hogar.id, effectiveFrom: '2026-09', amountCents: 700000 });
  await setBudgetForMonth({ categoryId: superm.id, effectiveFrom: '2026-10', amountCents: 300000 });
  await upsertTransaction({
    concept: 'Renta',
    amountCents: 850000,
    categoryId: hogar.id,
    date: '2026-09-01',
  });
  await upsertTransaction({
    concept: 'Despensa',
    amountCents: 123450,
    categoryId: superm.id,
    date: '2026-09-10',
  });
  await upsertTransaction({
    concept: 'Foco',
    amountCents: 9900,
    categoryId: hogar.id,
    date: '2026-09-16',
  });
}

describe('respaldo: exportación', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('nombra el archivo con la fecha local', () => {
    expect(backupFilename(new Date(2026, 8, 16, 23, 30))).toBe('trazia-respaldo-2026-09-16.json');
  });

  it('produce un Blob JSON con el sobre exacto y las cuatro colecciones', async () => {
    await seedRealData();
    const exportedAt = new Date('2026-09-16T15:04:05.000Z');
    const blob = await exportBackup(exportedAt);

    expect(blob.type).toBe(BACKUP_MIME);
    const parsed = JSON.parse(await blob.text()) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual([
      'app',
      'formatVersion',
      'schemaVersion',
      'exportedAt',
      'data',
    ]);
    expect(parsed.app).toBe('trazia');
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.exportedAt).toBe('2026-09-16T15:04:05.000Z');

    const data = parsed.data as Record<string, unknown>;
    expect(Object.keys(data)).toEqual(['categories', 'budgetVersions', 'transactions', 'settings']);
    expect(data.categories).toHaveLength(8);
    expect(data.budgetVersions).toHaveLength(2);
    expect(data.transactions).toHaveLength(3);
    // `settings` va sin la clave fija `key`.
    expect(Object.keys(data.settings as object).sort()).toEqual([
      'lastBackupAt',
      'persistenceRequested',
      'seededAt',
    ]);
  });

  it('exporta settings por omisión si la fila aún no existe', async () => {
    const data = await readBackupData();
    expect(data.settings).toEqual({
      seededAt: null,
      lastBackupAt: null,
      persistenceRequested: false,
    });
  });

  it('el documento exportado pasa la validación de importación', async () => {
    await seedRealData();
    const blob = await exportBackup(new Date());
    expect(parseBackupText(await blob.text()).data.transactions).toHaveLength(3);
  });

  it('markBackupCompleted actualiza lastBackupAt y conserva el resto', async () => {
    await ensureSeedCategories();
    const before = await getSettings();
    await markBackupCompleted(new Date('2026-09-16T10:00:00.000Z'));
    const after = await getSettings();
    expect(after.lastBackupAt).toBe('2026-09-16T10:00:00.000Z');
    expect(after.seededAt).toBe(before.seededAt);
    expect(after.persistenceRequested).toBe(before.persistenceRequested);
  });

  it('exportar no modifica la base', async () => {
    await seedRealData();
    const before = await snapshot();
    await exportBackup(new Date());
    expect(await snapshot()).toEqual(before);
  });
});

describe('respaldo: importación', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ida y vuelta: exportar → importar en base vacía → datos idénticos (criterio 1)', async () => {
    await seedRealData();
    await markBackupCompleted(new Date('2026-09-15T08:00:00.000Z'));
    const original = await snapshot();
    const text = await (await exportBackup(new Date())).text();

    // Base vacía (equivale a "borrar todo" o a otro dispositivo).
    await db.delete();
    await db.open();
    expect((await snapshot()).categories).toEqual([]);

    await importBackup(parseBackupText(text));

    expect(await snapshot()).toEqual(original);
  });

  it('reemplaza por completo los datos previos (no combina)', async () => {
    await seedRealData();
    const backup = makeValidBackup();
    await importBackup(backup);

    const after = await snapshot();
    expect(after.categories.map((c) => c.id).sort()).toEqual(['cat-hogar', 'cat-super']);
    expect(after.transactions.map((t) => t.id).sort()).toEqual(['tx-1', 'tx-2', 'tx-3']);
    expect(after.budgetVersions).toHaveLength(2);
    expect(after.settings).toEqual([
      {
        key: 'app',
        seededAt: backup.data.settings.seededAt,
        lastBackupAt: null,
        persistenceRequested: false,
      },
    ]);
  });

  it('conserva persistenceRequested del dispositivo y toma seededAt/lastBackupAt del archivo', async () => {
    await ensureSeedCategories();
    await db.settings.update('app', { persistenceRequested: true });
    const backup = makeValidBackup();
    backup.data.settings = {
      seededAt: '2025-01-01T00:00:00.000Z',
      lastBackupAt: '2026-09-01T00:00:00.000Z',
      persistenceRequested: false,
    };

    await importBackup(backup);

    expect(await db.settings.get('app')).toEqual({
      key: 'app',
      seededAt: '2025-01-01T00:00:00.000Z',
      lastBackupAt: '2026-09-01T00:00:00.000Z',
      persistenceRequested: true,
    });
  });

  it('un movimiento con categoría inexistente se rechaza sin modificar nada (criterio 2)', async () => {
    await seedRealData();
    const before = await snapshot();

    const backup = makeValidBackup();
    backup.data.transactions[1]!.categoryId = 'cat-que-no-existe';

    await expect(importBackup(backup)).rejects.toMatchObject({
      name: 'BackupImportError',
      reason: 'invalid-data',
      message:
        'El respaldo tiene datos incompletos o dañados. Tus datos actuales no se modificaron.',
    });
    expect(await snapshot()).toEqual(before);
  });

  it('un objeto sin validar que llega a importBackup también se rechaza sin tocar la base', async () => {
    await seedRealData();
    const before = await snapshot();
    const garbage = {
      app: 'trazia',
      formatVersion: 1,
      schemaVersion: 1,
      data: {},
    } as unknown as BackupFile;

    await expect(importBackup(garbage)).rejects.toBeInstanceOf(BackupImportError);
    expect(await snapshot()).toEqual(before);
  });

  it('un error a mitad de la transacción no altera los datos (criterio 3)', async () => {
    await seedRealData();
    const before = await snapshot();

    // Falla al escribir movimientos: categorías y presupuestos ya se borraron y
    // reescribieron dentro de la misma transacción; todo debe revertirse.
    const spy = vi
      .spyOn(db.transactions, 'bulkAdd')
      .mockRejectedValueOnce(new Error('fallo simulado'));

    await expect(importBackup(makeValidBackup())).rejects.toThrow('fallo simulado');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await snapshot()).toEqual(before);

    // Sin el fallo, el mismo respaldo entra completo: la prueba no pasa por casualidad.
    spy.mockRestore();
    await importBackup(makeValidBackup());
    expect((await snapshot()).transactions.map((t) => t.id).sort()).toEqual([
      'tx-1',
      'tx-2',
      'tx-3',
    ]);
  });

  it('un error en la última escritura (settings) tampoco deja nada a medias', async () => {
    await seedRealData();
    const before = await snapshot();

    vi.spyOn(db.settings, 'put').mockRejectedValueOnce(new Error('fallo simulado al final'));

    await expect(importBackup(makeValidBackup())).rejects.toThrow('fallo simulado al final');
    expect(await snapshot()).toEqual(before);
  });

  it('una violación del índice único dentro de la transacción revierte todo', async () => {
    await seedRealData();
    const before = await snapshot();

    // Se salta la validación previa a propósito para forzar el fallo en Dexie.
    const backup = makeValidBackup();
    backup.data.budgetVersions[1] = { ...backup.data.budgetVersions[0]!, id: 'otro-id' };
    const { backupFileSchema } = await import('../../services/backup/backupSchema');
    vi.spyOn(backupFileSchema, 'safeParse').mockReturnValueOnce({
      success: true,
      data: backup,
    } as never);

    await expect(importBackup(backup)).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  });

  it('summarizeBackup cuenta y da el rango de fechas', () => {
    expect(summarizeBackup(makeValidBackup())).toEqual({
      categories: 2,
      transactions: 3,
      range: { from: '2026-03-01', to: '2026-09-16' },
    });

    const empty = makeValidBackup();
    empty.data.transactions = [];
    expect(summarizeBackup(empty).range).toBeNull();
  });

  it('buildBackupFile valida lo que exporta', () => {
    const data = makeValidBackup().data;
    const file = buildBackupFile(data, new Date('2026-09-16T00:00:00.000Z'));
    expect(file.exportedAt).toBe('2026-09-16T00:00:00.000Z');
    expect(file.data).toEqual(data);
  });
});
