import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { ensureSeedCategories, listCategories, removeCategory } from '../../data/repositories/categories';
import { setBudgetForMonth } from '../../data/repositories/budgets';
import { upsertTransaction } from '../../data/repositories/transactions';
import { getSettings } from '../../data/repositories/settings';

describe('repositories integration', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('seeds categories once', async () => {
    await ensureSeedCategories();
    await ensureSeedCategories();

    const categories = await listCategories();
    expect(categories).toHaveLength(8);
    expect((await getSettings()).seededAt).not.toBeNull();
  });

  it('blocks category deletion when in use', async () => {
    await ensureSeedCategories();
    const category = (await listCategories())[0];
    if (!category) throw new Error('No category found');

    await upsertTransaction({
      concept: 'Renta',
      amountCents: 1000,
      categoryId: category.id,
      date: '2026-09-10',
    });

    await expect(removeCategory(category.id)).rejects.toThrow();
  });

  it('upserts a budget version per category and month', async () => {
    await ensureSeedCategories();
    const category = (await listCategories())[0];
    if (!category) throw new Error('No category found');

    await setBudgetForMonth({ categoryId: category.id, effectiveFrom: '2026-09', amountCents: 5000 });
    await setBudgetForMonth({ categoryId: category.id, effectiveFrom: '2026-09', amountCents: 7000 });

    const budgets = await db.budgetVersions.where('categoryId').equals(category.id).toArray();
    expect(budgets).toHaveLength(1);
    expect(budgets[0]?.amountCents).toBe(7000);
  });
});
