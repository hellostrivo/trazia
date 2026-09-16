// @vitest-environment node
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  buildTransactionsXlsx,
  escapeFormula,
  sortForExport,
  transactionsXlsxFilename,
  XLSX_MIME,
} from '../../services/export/transactionsXlsx';
import { buildMonthSummary } from '../../domain/summary';
import type { Category, Transaction } from '../../domain/types';

const iso = '2026-09-01T00:00:00.000Z';

const categories: Category[] = [
  {
    id: 'cat-hogar',
    name: 'Hogar',
    colorKey: 'slate',
    order: 0,
    archivedAt: null,
    createdAt: iso,
    updatedAt: iso,
  },
  {
    id: 'cat-comida',
    name: 'Comida',
    colorKey: 'sage',
    order: 1,
    archivedAt: null,
    createdAt: iso,
    updatedAt: iso,
  },
];

const transactions: Transaction[] = [
  {
    id: 't-2',
    concept: 'Súper de la semana',
    amountCents: 123456,
    categoryId: 'cat-comida',
    date: '2026-09-10',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: iso,
  },
  {
    id: 't-1',
    concept: 'Renta',
    amountCents: 850000,
    categoryId: 'cat-hogar',
    date: '2026-09-01',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: iso,
  },
  {
    id: 't-3',
    concept: '=HYPERLINK("https://example.test","Abrir")',
    amountCents: 999,
    categoryId: 'cat-comida',
    date: '2026-09-10',
    createdAt: '2026-09-10T08:00:00.000Z',
    updatedAt: iso,
  },
];

async function readBack(blob: Blob): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());
  return workbook;
}

describe('escapeFormula', () => {
  it('antepone un apóstrofo a conceptos que Excel interpretaría como fórmula', () => {
    expect(escapeFormula('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeFormula('+1')).toBe("'+1");
    expect(escapeFormula('-1')).toBe("'-1");
    expect(escapeFormula('@cmd')).toBe("'@cmd");
  });

  it('deja intactos los conceptos normales', () => {
    expect(escapeFormula('Renta')).toBe('Renta');
    expect(escapeFormula('Café 2x1')).toBe('Café 2x1');
  });
});

describe('transactionsXlsxFilename', () => {
  it('nombra por mes o por historial con la fecha de generación', () => {
    expect(transactionsXlsxFilename({ kind: 'month', monthKey: '2026-09' })).toBe(
      'trazia-transacciones-2026-09.xlsx',
    );
    expect(transactionsXlsxFilename({ kind: 'history', generatedOn: '2026-09-16' })).toBe(
      'trazia-transacciones-historial-2026-09-16.xlsx',
    );
  });
});

describe('sortForExport', () => {
  it('ordena por fecha ascendente y luego por createdAt', () => {
    expect(sortForExport(transactions).map((t) => t.id)).toEqual(['t-1', 't-3', 't-2']);
  });
});

describe('buildTransactionsXlsx', () => {
  it('genera un libro que se vuelve a leer con encabezados, tipos, formato y total', async () => {
    const blob = await buildTransactionsXlsx({ transactions, categories });
    expect(blob.type).toBe(XLSX_MIME);
    expect(blob.size).toBeGreaterThan(0);

    const workbook = await readBack(blob);
    expect(workbook.title).toBe('TRAZIA — Transacciones');
    expect(workbook.creator).toBe('TRAZIA');

    const sheet = workbook.getWorksheet('Transacciones');
    expect(sheet).toBeDefined();
    if (!sheet) return;

    const header = sheet.getRow(1);
    expect([1, 2, 3, 4].map((col) => header.getCell(col).value)).toEqual([
      'Concepto',
      'Fecha',
      'Categoría',
      'Monto',
    ]);
    expect(header.getCell(1).font?.bold).toBe(true);
    expect(header.getCell(1).font?.color?.argb).toBe('FFFFFFFF');
    expect(header.getCell(1).fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3E5C76' },
    });
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(sheet.autoFilter).toBe('A1:D4');
    expect(sheet.getColumn(1).width).toBeGreaterThan(20);

    // Fila 2: la primera por fecha (Renta, 1 de septiembre).
    const first = sheet.getRow(2);
    expect(first.getCell(1).value).toBe('Renta');
    expect(first.getCell(1).type).toBe(ExcelJS.ValueType.String);
    expect(first.getCell(2).type).toBe(ExcelJS.ValueType.Date);
    const date = first.getCell(2).value as Date;
    expect([date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]).toEqual([
      2026, 9, 1,
    ]);
    expect(first.getCell(2).numFmt).toBe('dd/mm/yyyy');
    expect(first.getCell(3).value).toBe('Hogar');
    expect(first.getCell(4).type).toBe(ExcelJS.ValueType.Number);
    expect(first.getCell(4).value).toBe(8500);
    expect(first.getCell(4).numFmt).toBe('"$"#,##0.00');

    // Fila 5: Total con =SUM() sobre la columna Monto.
    const total = sheet.getRow(5);
    expect(total.getCell(1).value).toBe('Total');
    expect(total.getCell(4).type).toBe(ExcelJS.ValueType.Formula);
    expect(total.getCell(4).formula).toBe('SUM(D2:D4)');
    expect(total.getCell(4).result).toBeCloseTo(9744.55, 2);
    expect(total.getCell(4).numFmt).toBe('"$"#,##0.00');
    expect(sheet.rowCount).toBe(5);
  });

  it('exporta un concepto =HYPERLINK(...) como texto literal con apóstrofo', async () => {
    const blob = await buildTransactionsXlsx({ transactions, categories });
    const sheet = (await readBack(blob)).getWorksheet('Transacciones');
    // t-3 es la segunda por fecha/createdAt → fila 3.
    const cell = sheet?.getRow(3).getCell(1);
    expect(cell?.type).toBe(ExcelJS.ValueType.String);
    expect(cell?.value).toBe('\'=HYPERLINK("https://example.test","Abrir")');
  });

  it('el total coincide con totalSpentCents de buildMonthSummary para el mes', async () => {
    const summary = buildMonthSummary({
      categories,
      versions: [],
      transactions,
      monthKey: '2026-09',
    });
    const blob = await buildTransactionsXlsx({ transactions, categories });
    const sheet = (await readBack(blob)).getWorksheet('Transacciones');
    const total = sheet?.getRow(5).getCell(4).result as number;
    expect(Math.round(total * 100)).toBe(summary.totalSpentCents);
  });

  it('sin movimientos deja un total de 0 sin fórmula circular', async () => {
    const blob = await buildTransactionsXlsx({ transactions: [], categories });
    const sheet = (await readBack(blob)).getWorksheet('Transacciones');
    expect(sheet?.getRow(2).getCell(1).value).toBe('Total');
    expect(sheet?.getRow(2).getCell(4).value).toBe(0);
  });
});
