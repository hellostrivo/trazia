import { describe, expect, it } from 'vitest';
import { isSameCategoryName, normalizeName } from '../../domain/categories';
import { resolveBudget } from '../../domain/budget';
import { makeSeedCategories, seedCategories, seedColorKeys } from '../../domain/seed';

describe('categories', () => {
  it('normalizes names', () => {
    expect(normalizeName('  Cuidado Personal  ')).toBe('cuidado personal');
    expect(normalizeName('Gastos Médicos')).toBe('gastos medicos');
  });

  it('compares category names semantically', () => {
    expect(isSameCategoryName('Cuidado Personal', 'cuidado personal')).toBe(true);
  });

  it('builds the seeded category list in the SPEC order with zero default budget', () => {
    const nowIso = '2026-09-01T00:00:00.000Z';
    const categories = makeSeedCategories(nowIso);

    expect(categories.map((category) => category.name)).toEqual([...seedCategories]);
    expect(categories.map((category) => category.colorKey)).toEqual([...seedColorKeys]);
    expect(categories.every((category, index) => category.order === index)).toBe(true);
    expect(categories.every((category) => resolveBudget([], category.id, '2026-09') === 0)).toBe(true);
    expect(categories.every((category) => category.createdAt === nowIso && category.updatedAt === nowIso)).toBe(true);
  });
});
