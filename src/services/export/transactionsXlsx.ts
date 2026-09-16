import ExcelJS from 'exceljs';
import type { Category, LocalDate, MonthKey, Transaction } from '../../domain/types';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Azul-pizarra: `--color-graph-slate` en `src/styles/tokens.css`. */
const HEADER_FILL = 'FF3E5C76';
const HEADER_TEXT = 'FFFFFFFF';
const MONEY_FORMAT = '"$"#,##0.00';
const DATE_FORMAT = 'dd/mm/yyyy';

export type TransactionsXlsxScope =
  { kind: 'month'; monthKey: MonthKey } | { kind: 'history'; generatedOn: LocalDate };

export interface TransactionsXlsxInput {
  transactions: readonly Transaction[];
  categories: readonly Category[];
}

/**
 * Un concepto que empieza con `=`, `+`, `-` o `@` se exporta con apóstrofo
 * inicial para que Excel/Numbers lo traten como texto y no como fórmula
 * (inyección de fórmulas en hojas de cálculo).
 */
export function escapeFormula(text: string): string {
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function transactionsXlsxFilename(scope: TransactionsXlsxScope): string {
  return scope.kind === 'month'
    ? `trazia-transacciones-${scope.monthKey}.xlsx`
    : `trazia-transacciones-historial-${scope.generatedOn}.xlsx`;
}

/** Orden de exportación: fecha ascendente y, a igual fecha, `createdAt`. */
export function sortForExport(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt),
  );
}

/**
 * Fecha "real" para Excel. ExcelJS convierte a número de serie a partir del
 * instante UTC, así que se construye en UTC para que el serie sea entero y el
 * día no se desplace por el huso horario del dispositivo.
 */
function toExcelDate(date: LocalDate): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export async function buildTransactionsXlsx({
  transactions,
  categories,
}: TransactionsXlsxInput): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  // Sin autor ni ningún otro dato personal: solo el nombre de la app.
  workbook.title = 'TRAZIA — Transacciones';
  workbook.creator = 'TRAZIA';
  workbook.lastModifiedBy = 'TRAZIA';
  workbook.created = new Date();
  workbook.modified = workbook.created;

  const sheet = workbook.addWorksheet('Transacciones', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Concepto', key: 'concept', width: 40 },
    { header: 'Fecha', key: 'date', width: 14, style: { numFmt: DATE_FORMAT } },
    { header: 'Categoría', key: 'category', width: 24 },
    { header: 'Monto', key: 'amount', width: 16, style: { numFmt: MONEY_FORMAT } },
  ];

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: HEADER_TEXT } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: 'middle' };

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const rows = sortForExport(transactions);

  rows.forEach((transaction) => {
    sheet.addRow({
      concept: escapeFormula(transaction.concept),
      date: toExcelDate(transaction.date),
      category: categoryNames.get(transaction.categoryId) ?? 'Sin categoría',
      amount: transaction.amountCents / 100,
    });
  });

  const lastDataRow = rows.length + 1;
  sheet.autoFilter = { from: 'A1', to: `D${lastDataRow}` };

  const totalRow = sheet.addRow({ concept: 'Total' });
  totalRow.font = { bold: true };
  const totalCell = totalRow.getCell('amount');
  const totalCents = rows.reduce((sum, transaction) => sum + transaction.amountCents, 0);
  totalCell.value =
    rows.length > 0 ? { formula: `SUM(D2:D${lastDataRow})`, result: totalCents / 100 } : 0;
  totalCell.numFmt = MONEY_FORMAT;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
}
