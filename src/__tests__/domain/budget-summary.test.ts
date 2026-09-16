import { describe, expect, it } from 'vitest';
import { normalizeBudgetAmount, resolveBudget } from '../../domain/budget';
import { buildMonthSummary } from '../../domain/summary';
import type { Category, BudgetVersion, Transaction } from '../../domain/types';

const categories: Category[] = [
  {
    id: 'c1',
    name: 'Hogar',
    colorKey: 'slate',
    order: 0,
    archivedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'Supermercado',
    colorKey: 'sage',
    order: 1,
    archivedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

const versions: BudgetVersion[] = [
  {
    id: 'v1',
    categoryId: 'c1',
    effectiveFrom: '2026-08',
    amountCents: 10000,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'v2',
    categoryId: 'c1',
    effectiveFrom: '2026-09',
    amountCents: 15000,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'v3',
    categoryId: 'c2',
    effectiveFrom: '2026-09',
    amountCents: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

const transactions: Transaction[] = [
  {
    id: 't1',
    concept: 'Renta',
    amountCents: 8000,
    categoryId: 'c1',
    date: '2026-09-10',
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
  },
  {
    id: 't2',
    concept: 'Fruta',
    amountCents: 1500,
    categoryId: 'c2',
    date: '2026-09-15',
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
  },
];

describe('budget and summary', () => {
  it('resolves the latest budget version for the given month', () => {
    expect(resolveBudget(versions, 'c1', '2026-09')).toBe(15000);
    expect(resolveBudget(versions, 'c1', '2026-08')).toBe(10000);
    expect(resolveBudget(versions, 'x', '2026-09')).toBe(0);
  });

  it('builds a month summary with statuses', () => {
    const summary = buildMonthSummary({ categories, versions, transactions, monthKey: '2026-09' });
    expect(summary.totalBudgetCents).toBe(15000);
    expect(summary.totalSpentCents).toBe(9500);
    expect(summary.rows[0]?.status).toBe('en-plan');
    expect(summary.rows[1]?.status).toBe('sin-presupuesto');
  });

  it('normalizes budget amounts as non-negative integers', () => {
    expect(normalizeBudgetAmount(2500)).toBe(2500);
    expect(() => normalizeBudgetAmount(-1)).toThrow();
  });

  it('keeps a category with spent money even if it has no budget', () => {
    const summary = buildMonthSummary({
      categories: [{
        id: 'c3',
        name: 'Sin presupuesto',
        colorKey: 'clay',
        order: 0,
        archivedAt: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      }],
      versions: [],
      transactions: [{
        id: 't3',
        concept: 'Compra sin presupuesto',
        amountCents: 1250,
        categoryId: 'c3',
        date: '2026-09-17',
        createdAt: '2026-09-17T12:00:00.000Z',
        updatedAt: '2026-09-17T12:00:00.000Z',
      }],
      monthKey: '2026-09',
    });

    expect(summary.rows).toHaveLength(1);
    expect(summary.rows[0]?.status).toBe('sin-presupuesto');
    expect(summary.totalSpentCents).toBe(1250);
  });

  it('keeps archived categories with spending visible in the month of the expense', () => {
    const summary = buildMonthSummary({
      categories: [{
        id: 'c4',
        name: 'Archivada',
        colorKey: 'teal',
        order: 0,
        archivedAt: '2026-09-20T00:00:00.000Z',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }],
      versions: [],
      transactions: [{
        id: 't4',
        concept: 'Gasto archivado',
        amountCents: 3330,
        categoryId: 'c4',
        date: '2026-09-18',
        createdAt: '2026-09-18T12:00:00.000Z',
        updatedAt: '2026-09-18T12:00:00.000Z',
      }],
      monthKey: '2026-09',
    });

    expect(summary.rows[0]?.name).toBe('Archivada');
    expect(summary.rows[0]?.spentCents).toBe(3330);
  });

  it('uses the previous budget when a later change starts in a future month', () => {
    const categories: Category[] = [{
      id: 'c5',
      name: 'Hogar',
      colorKey: 'slate',
      order: 0,
      archivedAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }];
    const versions: BudgetVersion[] = [
      { id: 'v10', categoryId: 'c5', effectiveFrom: '2026-08', amountCents: 5000, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
      { id: 'v11', categoryId: 'c5', effectiveFrom: '2026-10', amountCents: 9000, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' },
    ];
    const transactions: Transaction[] = [{
      id: 't5',
      concept: 'Gasto septiembre',
      amountCents: 2500,
      categoryId: 'c5',
      date: '2026-09-12',
      createdAt: '2026-09-12T10:00:00.000Z',
      updatedAt: '2026-09-12T10:00:00.000Z',
    }];

    const september = buildMonthSummary({ categories, versions, transactions, monthKey: '2026-09' });
    const october = buildMonthSummary({ categories, versions, transactions, monthKey: '2026-10' });

    expect(september.rows[0]?.budgetCents).toBe(5000);
    expect(october.rows[0]?.budgetCents).toBe(9000);
  });

  it('includes local transactions on the last day of the month and on leap-day February', () => {
    const september = buildMonthSummary({
      categories: [{
        id: 'c6',
        name: 'Transporte',
        colorKey: 'ochre',
        order: 0,
        archivedAt: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      }],
      versions: [],
      transactions: [{
        id: 't6',
        concept: 'Último día',
        amountCents: 3450,
        categoryId: 'c6',
        date: '2026-09-30',
        createdAt: '2026-09-30T23:59:00.000Z',
        updatedAt: '2026-09-30T23:59:00.000Z',
      }],
      monthKey: '2026-09',
    });

    const february = buildMonthSummary({
      categories: [{
        id: 'c7',
        name: 'Febrero',
        colorKey: 'sage',
        order: 0,
        archivedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }],
      versions: [],
      transactions: [{
        id: 't7',
        concept: 'Feb 29',
        amountCents: 1234,
        categoryId: 'c7',
        date: '2024-02-29',
        createdAt: '2024-02-29T12:00:00.000Z',
        updatedAt: '2024-02-29T12:00:00.000Z',
      }],
      monthKey: '2024-02',
    });

    expect(september.totalSpentCents).toBe(3450);
    expect(february.totalSpentCents).toBe(1234);
  });

  it('sums row spent amounts to the total for the month', () => {
    const summary = buildMonthSummary({
      categories: [
        { id: 'c8', name: 'Hogar', colorKey: 'slate', order: 0, archivedAt: null, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
        { id: 'c9', name: 'Transporte', colorKey: 'ochre', order: 1, archivedAt: null, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
      ],
      versions: [],
      transactions: [
        { id: 't8', concept: 'Renta', amountCents: 8000, categoryId: 'c8', date: '2026-09-10', createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z' },
        { id: 't9', concept: 'Gasolina', amountCents: 1500, categoryId: 'c9', date: '2026-09-15', createdAt: '2026-09-15T00:00:00.000Z', updatedAt: '2026-09-15T00:00:00.000Z' },
      ],
      monthKey: '2026-09',
    });

    const totalFromRows = summary.rows.reduce((sum, row) => sum + row.spentCents, 0);
    expect(totalFromRows).toBe(summary.totalSpentCents);
    expect(summary.totalSpentCents).toBe(9500);
  });

  it('assigns each status correctly', () => {
    const summary = buildMonthSummary({
      categories: [
        { id: 'a', name: 'En plan', colorKey: 'slate', order: 0, archivedAt: null, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
        { id: 'b', name: 'Cerca', colorKey: 'sage', order: 1, archivedAt: null, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
        { id: 'c', name: 'Por encima', colorKey: 'ochre', order: 2, archivedAt: null, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
        { id: 'd', name: 'Sin presupuesto', colorKey: 'clay', order: 3, archivedAt: null, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
        { id: 'e', name: 'Sin actividad', colorKey: 'plum', order: 4, archivedAt: null, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
      ],
      versions: [
        { id: 'v-a', categoryId: 'a', effectiveFrom: '2026-09', amountCents: 10000, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
        { id: 'v-b', categoryId: 'b', effectiveFrom: '2026-09', amountCents: 10000, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
        { id: 'v-c', categoryId: 'c', effectiveFrom: '2026-09', amountCents: 10000, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
      ],
      transactions: [
        { id: 'ta', concept: 'En plan', amountCents: 4000, categoryId: 'a', date: '2026-09-05', createdAt: '2026-09-05T00:00:00.000Z', updatedAt: '2026-09-05T00:00:00.000Z' },
        { id: 'tb', concept: 'Cerca', amountCents: 9000, categoryId: 'b', date: '2026-09-06', createdAt: '2026-09-06T00:00:00.000Z', updatedAt: '2026-09-06T00:00:00.000Z' },
        { id: 'tc', concept: 'Por encima', amountCents: 12000, categoryId: 'c', date: '2026-09-07', createdAt: '2026-09-07T00:00:00.000Z', updatedAt: '2026-09-07T00:00:00.000Z' },
        { id: 'td', concept: 'Sin presupuesto', amountCents: 1500, categoryId: 'd', date: '2026-09-08', createdAt: '2026-09-08T00:00:00.000Z', updatedAt: '2026-09-08T00:00:00.000Z' },
      ],
      monthKey: '2026-09',
    });

    expect(summary.rows.find((row) => row.categoryId === 'a')?.status).toBe('en-plan');
    expect(summary.rows.find((row) => row.categoryId === 'b')?.status).toBe('cerca');
    expect(summary.rows.find((row) => row.categoryId === 'c')?.status).toBe('por-encima');
    expect(summary.rows.find((row) => row.categoryId === 'd')?.status).toBe('sin-presupuesto');
    expect(summary.rows.find((row) => row.categoryId === 'e')?.status).toBe('sin-actividad');
  });
});
