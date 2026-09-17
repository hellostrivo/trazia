import { describe, expect, it } from 'vitest';
import {
  BACKUP_MAX_BYTES,
  BackupImportError,
  assertBackupSize,
  backupErrorMessages,
  parseBackupObject,
  parseBackupText,
} from '../../services/backup/backupSchema';
import { clone, makeValidBackup } from './fixtures';

function reasonOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof BackupImportError) return error.reason;
    throw error;
  }
  throw new Error('No lanzó');
}

describe('backupSchema (SPEC-07)', () => {
  describe('válidos', () => {
    it('acepta un respaldo completo y devuelve los mismos datos', () => {
      const backup = makeValidBackup();
      expect(parseBackupObject(backup)).toEqual(backup);
    });

    it('acepta un respaldo vacío (sin categorías ni movimientos)', () => {
      const backup = makeValidBackup();
      backup.data = {
        categories: [],
        budgetVersions: [],
        transactions: [],
        settings: backup.data.settings,
      };
      expect(parseBackupObject(backup).data.categories).toEqual([]);
    });

    it('acepta el texto JSON del archivo', () => {
      const backup = makeValidBackup();
      expect(parseBackupText(JSON.stringify(backup))).toEqual(backup);
    });
  });

  describe('no es un respaldo de TRAZIA', () => {
    it('texto que no es JSON', () => {
      expect(reasonOf(() => parseBackupText('esto no es json {'))).toBe('not-trazia');
    });

    it('JSON de otra app', () => {
      const other = { ...makeValidBackup(), app: 'otra-app' };
      expect(reasonOf(() => parseBackupObject(other))).toBe('not-trazia');
    });

    it('JSON sin sobre (un arreglo, un número, un objeto cualquiera)', () => {
      expect(reasonOf(() => parseBackupObject([]))).toBe('not-trazia');
      expect(reasonOf(() => parseBackupObject(42))).toBe('not-trazia');
      expect(reasonOf(() => parseBackupObject({ categories: [] }))).toBe('not-trazia');
      expect(reasonOf(() => parseBackupObject(null))).toBe('not-trazia');
    });

    it('formatVersion que no es un entero positivo', () => {
      expect(reasonOf(() => parseBackupObject({ ...makeValidBackup(), formatVersion: '1' }))).toBe(
        'not-trazia',
      );
      expect(reasonOf(() => parseBackupObject({ ...makeValidBackup(), formatVersion: 0 }))).toBe(
        'not-trazia',
      );
    });

    it('usa el mensaje exacto', () => {
      expect(() => parseBackupText('x')).toThrow('Este archivo no es un respaldo de TRAZIA.');
    });
  });

  describe('versión más nueva', () => {
    it('formatVersion mayor', () => {
      expect(reasonOf(() => parseBackupObject({ ...makeValidBackup(), formatVersion: 2 }))).toBe(
        'newer-version',
      );
    });

    it('schemaVersion mayor', () => {
      expect(reasonOf(() => parseBackupObject({ ...makeValidBackup(), schemaVersion: 2 }))).toBe(
        'newer-version',
      );
    });

    it('se detecta antes de mirar los datos', () => {
      const future = { ...makeValidBackup(), formatVersion: 3, data: 'lo que sea' };
      expect(() => parseBackupObject(future)).toThrow(backupErrorMessages['newer-version']);
    });
  });

  describe('datos inválidos', () => {
    it('falta una tabla', () => {
      const backup = clone(makeValidBackup()) as unknown as { data: Record<string, unknown> };
      delete backup.data.transactions;
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('monto no entero, negativo o cero en un movimiento', () => {
      for (const amountCents of [10.5, -100, 0]) {
        const backup = makeValidBackup();
        backup.data.transactions[0]!.amountCents = amountCents;
        expect(
          reasonOf(() => parseBackupObject(backup)),
          String(amountCents),
        ).toBe('invalid-data');
      }
    });

    it('presupuesto negativo', () => {
      const backup = makeValidBackup();
      backup.data.budgetVersions[0]!.amountCents = -1;
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('fecha de movimiento con formato inválido', () => {
      const backup = makeValidBackup();
      backup.data.transactions[0]!.date = '16/09/2026';
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('mes de presupuesto y createdAt inválidos', () => {
      const withMonth = makeValidBackup();
      withMonth.data.budgetVersions[0]!.effectiveFrom = '2026-9';
      expect(reasonOf(() => parseBackupObject(withMonth))).toBe('invalid-data');

      const withIso = makeValidBackup();
      withIso.data.categories[0]!.createdAt = 'ayer';
      expect(reasonOf(() => parseBackupObject(withIso))).toBe('invalid-data');
    });

    it('exportedAt inválido y color fuera de la paleta', () => {
      expect(reasonOf(() => parseBackupObject({ ...makeValidBackup(), exportedAt: 'nunca' }))).toBe(
        'invalid-data',
      );

      const backup = makeValidBackup();
      (backup.data.categories[0] as { colorKey: string }).colorKey = 'neon';
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('un movimiento apunta a una categoría inexistente (criterio 2)', () => {
      const backup = makeValidBackup();
      backup.data.transactions[1]!.categoryId = 'cat-que-no-existe';
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('una versión de presupuesto apunta a una categoría inexistente', () => {
      const backup = makeValidBackup();
      backup.data.budgetVersions[0]!.categoryId = 'cat-fantasma';
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('IDs duplicados en categorías', () => {
      const backup = makeValidBackup();
      backup.data.categories[1]!.id = backup.data.categories[0]!.id;
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('IDs duplicados en movimientos', () => {
      const backup = makeValidBackup();
      backup.data.transactions[2]!.id = 'tx-1';
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('IDs duplicados en presupuestos', () => {
      const backup = makeValidBackup();
      backup.data.budgetVersions[1]!.id = backup.data.budgetVersions[0]!.id;
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('dos presupuestos para la misma categoría y mes (índice único de Dexie)', () => {
      const backup = makeValidBackup();
      backup.data.budgetVersions[1] = { ...backup.data.budgetVersions[0]!, id: 'otro-id' };
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('settings incompleto', () => {
      const backup = clone(makeValidBackup()) as unknown as {
        data: { settings: Record<string, unknown> };
      };
      delete backup.data.settings.persistenceRequested;
      expect(reasonOf(() => parseBackupObject(backup))).toBe('invalid-data');
    });

    it('usa el mensaje exacto', () => {
      const backup = makeValidBackup();
      backup.data.transactions[0]!.categoryId = 'x';
      expect(() => parseBackupObject(backup)).toThrow(
        'El respaldo tiene datos incompletos o dañados. Tus datos actuales no se modificaron.',
      );
    });
  });

  describe('tamaño', () => {
    it('acepta hasta 20 MB y rechaza por encima con el mensaje exacto', () => {
      expect(() => assertBackupSize(BACKUP_MAX_BYTES)).not.toThrow();
      expect(() => assertBackupSize(BACKUP_MAX_BYTES + 1)).toThrow('El archivo supera 20 MB.');
      expect(reasonOf(() => assertBackupSize(BACKUP_MAX_BYTES + 1))).toBe('too-large');
    });
  });
});
