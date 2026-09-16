import { describe, expect, it } from 'vitest';
import { resolveBudget } from '../../domain/budget';
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
});
