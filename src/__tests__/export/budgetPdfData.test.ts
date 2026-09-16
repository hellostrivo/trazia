import { describe, expect, it } from 'vitest';
import {
  buildBudgetPdfData,
  budgetPdfFilename,
  CHART_COLORS,
  formatPdfMonthLabel,
  OTHERS_COLOR,
} from '../../services/export/budgetPdfData';
import { buildMonthSummary } from '../../domain/summary';
import type { BudgetVersion, Category, ChartColorKey, MonthSummary } from '../../domain/types';

const iso = '2026-09-01T00:00:00.000Z';
const colors: ChartColorKey[] = [
  'slate',
  'sage',
  'ochre',
  'clay',
  'plum',
  'teal',
  'olive',
  'denim',
  'rose',
];

function makeSummary(budgets: Array<[string, number]>): MonthSummary {
  const categories: Category[] = budgets.map(([name], index) => ({
    id: `cat-${index}`,
    name,
    colorKey: colors[index % colors.length] ?? 'slate',
    order: index,
    archivedAt: null,
    createdAt: iso,
    updatedAt: iso,
  }));
  const versions: BudgetVersion[] = budgets.flatMap(([, cents], index) =>
    cents > 0
      ? [
          {
            id: `v-${index}`,
            categoryId: `cat-${index}`,
            effectiveFrom: '2026-09',
            amountCents: cents,
            createdAt: iso,
            updatedAt: iso,
          },
        ]
      : [],
  );
  return buildMonthSummary({ categories, versions, transactions: [], monthKey: '2026-09' });
}

const generatedAt = new Date(2026, 8, 16, 10, 30);

describe('buildBudgetPdfData', () => {
  it('arma la tabla en el orden configurado con porcentajes enteros y total', () => {
    const data = buildBudgetPdfData(
      makeSummary([
        ['Hogar', 500000],
        ['Comida', 300000],
        ['Transporte', 200000],
      ]),
      generatedAt,
    );

    expect(data.monthKey).toBe('2026-09');
    expect(data.monthLabel).toBe('Septiembre 2026');
    expect(data.generatedOn).toBe('16 de septiembre de 2026');
    expect(data.totalBudgetCents).toBe(1_000_000);
    expect(data.categoriesWithBudget).toBe(3);
    expect(data.table.map((row) => [row.name, row.budgetCents, row.sharePercent])).toEqual([
      ['Hogar', 500000, 50],
      ['Comida', 300000, 30],
      ['Transporte', 200000, 20],
    ]);
    expect(data.table[0]?.color).toBe(CHART_COLORS.slate);
    expect(data.unbudgeted).toEqual([]);
  });

  it('ordena las barras de mayor a menor aunque la configuración sea otra', () => {
    const data = buildBudgetPdfData(
      makeSummary([
        ['Pequeña', 10000],
        ['Grande', 90000],
      ]),
      generatedAt,
    );
    expect(data.bars.map((row) => row.name)).toEqual(['Grande', 'Pequeña']);
    expect(data.table.map((row) => row.name)).toEqual(['Pequeña', 'Grande']);
  });

  it('agrupa a partir de la séptima categoría en "Otras" y lista las que no tienen presupuesto', () => {
    const data = buildBudgetPdfData(
      makeSummary([
        ['A', 80000],
        ['B', 70000],
        ['C', 60000],
        ['D', 50000],
        ['E', 40000],
        ['F', 30000],
        ['G', 20000],
        ['H', 10000],
        ['Sin plan', 0],
      ]),
      generatedAt,
    );

    expect(data.donut).toHaveLength(7);
    expect(data.donut.map((row) => row.name)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'Otras']);
    const others = data.donut[6];
    expect(others?.budgetCents).toBe(30000);
    expect(others?.color).toBe(OTHERS_COLOR);
    expect(others?.sharePercent).toBe(8);
    expect(data.donut.reduce((sum, row) => sum + row.budgetCents, 0)).toBe(data.totalBudgetCents);
    expect(data.table).toHaveLength(8);
    expect(data.unbudgeted).toEqual(['Sin plan']);
  });

  it('con seis categorías o menos no añade "Otras"', () => {
    const data = buildBudgetPdfData(
      makeSummary([
        ['A', 1000],
        ['B', 1000],
        ['C', 1000],
        ['D', 1000],
        ['E', 1000],
        ['F', 1000],
      ]),
      generatedAt,
    );
    expect(data.donut.map((row) => row.name)).not.toContain('Otras');
    expect(data.donut).toHaveLength(6);
  });

  it('sin presupuestos devuelve estructuras vacías y total 0', () => {
    const data = buildBudgetPdfData(makeSummary([['Hogar', 0]]), generatedAt);
    expect(data.totalBudgetCents).toBe(0);
    expect(data.categoriesWithBudget).toBe(0);
    expect(data.table).toEqual([]);
    expect(data.donut).toEqual([]);
    expect(data.unbudgeted).toEqual(['Hogar']);
  });

  it('el nombre del archivo y la etiqueta del mes siguen el formato del SPEC', () => {
    expect(budgetPdfFilename('2026-09')).toBe('trazia-plan-2026-09.pdf');
    expect(formatPdfMonthLabel('2026-01')).toBe('Enero 2026');
  });
});
