// @vitest-environment node
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../data/db';
import { ensureSeedCategories, listCategories } from '../../data/repositories/categories';
import { setBudgetForMonth } from '../../data/repositories/budgets';
import { upsertTransaction } from '../../data/repositories/transactions';
import { getSettings } from '../../data/repositories/settings';
import { seedCategories } from '../../domain/seed';
import {
  clearAllData,
  CONFIRM_DELETE_WORD,
  isDeleteConfirmationValid,
} from '../../services/backup/clearAllData';
import { exportBackup, markBackupCompleted } from '../../services/backup/exportBackup';
import { parseBackupText } from '../../services/backup/backupSchema';
import { importBackup } from '../../services/backup/importBackup';

async function snapshot() {
  const byId = <T extends { id: string }>(rows: T[]) =>
    [...rows].sort((a, b) => a.id.localeCompare(b.id));
  return {
    categories: byId(await db.categories.toArray()),
    budgetVersions: byId(await db.budgetVersions.toArray()),
    transactions: byId(await db.transactions.toArray()),
    settings: await db.settings.toArray(),
  };
}

async function seedRealData() {
  await ensureSeedCategories();
  const [hogar, superm] = await listCategories();
  if (!hogar || !superm) throw new Error('semilla incompleta');
  await setBudgetForMonth({ categoryId: hogar.id, effectiveFrom: '2026-09', amountCents: 700000 });
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
}

describe('isDeleteConfirmationValid (criterio 4)', () => {
  it('sólo acepta BORRAR exacto, mayúsculas incluidas', () => {
    expect(CONFIRM_DELETE_WORD).toBe('BORRAR');
    expect(isDeleteConfirmationValid('BORRAR')).toBe(true);
    expect(isDeleteConfirmationValid('borrar')).toBe(false);
    expect(isDeleteConfirmationValid('BORRA')).toBe(false);
    expect(isDeleteConfirmationValid('')).toBe(false);
    expect(isDeleteConfirmationValid(' BORRAR')).toBe(false);
    expect(isDeleteConfirmationValid('BORRAR ')).toBe(false);
    expect(isDeleteConfirmationValid('Borrar')).toBe(false);
  });
});

describe('clearAllData (SPEC-07, punto 5)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deja la app como recién instalada: 8 categorías genéricas, cero movimientos y seededAt no nulo', async () => {
    await seedRealData();
    await markBackupCompleted(new Date('2026-09-01T00:00:00.000Z'));
    await db.settings.update('app', { persistenceRequested: true });
    const oldIds = (await db.categories.toArray()).map((c) => c.id);

    const now = new Date('2026-09-16T10:00:00.000Z');
    await clearAllData(now);

    const categories = await listCategories();
    expect(categories.map((c) => c.name)).toEqual([...seedCategories]);
    expect(categories.every((c) => c.archivedAt === null)).toBe(true);
    // Categorías nuevas, no las anteriores reescritas.
    expect(categories.some((c) => oldIds.includes(c.id))).toBe(false);
    expect(await db.transactions.count()).toBe(0);
    expect(await db.budgetVersions.count()).toBe(0);

    expect(await getSettings()).toEqual({
      key: 'app',
      seededAt: now.toISOString(),
      lastBackupAt: null,
      persistenceRequested: true,
      backupReminderDismissedAt: null,
    });
  });

  it('funciona sobre una base vacía (sin fila de settings)', async () => {
    await clearAllData();
    expect(await db.categories.count()).toBe(8);
    expect((await getSettings()).seededAt).not.toBeNull();
    expect((await getSettings()).persistenceRequested).toBe(false);
  });

  it('no vuelve a sembrar encima: ensureSeedCategories respeta seededAt tras el borrado', async () => {
    await clearAllData();
    await ensureSeedCategories();
    expect(await db.categories.count()).toBe(8);
  });

  it('un fallo en la resiembra revierte el borrado: los datos quedan intactos, nunca una base vacía', async () => {
    await seedRealData();
    const before = await snapshot();

    const spy = vi
      .spyOn(db.categories, 'bulkAdd')
      .mockRejectedValueOnce(new Error('fallo simulado en la resiembra'));

    await expect(clearAllData()).rejects.toThrow('fallo simulado en la resiembra');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await snapshot()).toEqual(before);
    expect(await db.categories.count()).toBe(8);

    spy.mockRestore();
    await clearAllData();
    expect(await db.transactions.count()).toBe(0);
  });

  it('un fallo al escribir settings (última escritura) también deja todo intacto', async () => {
    await seedRealData();
    const before = await snapshot();

    vi.spyOn(db.settings, 'put').mockRejectedValueOnce(new Error('fallo simulado al final'));

    await expect(clearAllData()).rejects.toThrow('fallo simulado al final');
    expect(await snapshot()).toEqual(before);
  });

  it('criterio 1: respaldar → borrar todo → restaurar deja los datos idénticos', async () => {
    await seedRealData();
    const original = await snapshot();
    const text = await (await exportBackup(new Date())).text();

    await clearAllData();
    expect(await db.transactions.count()).toBe(0);
    expect((await snapshot()).categories).not.toEqual(original.categories);

    await importBackup(parseBackupText(text));
    expect(await snapshot()).toEqual(original);
  });
});
