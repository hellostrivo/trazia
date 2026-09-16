import { describe, expect, it } from 'vitest';
import { isSameCategoryName, normalizeName } from '../../domain/categories';

describe('categories', () => {
  it('normalizes names', () => {
    expect(normalizeName('  Cuidado Personal  ')).toBe('cuidado personal');
    expect(normalizeName('Gastos Médicos')).toBe('gastos medicos');
  });

  it('compares category names semantically', () => {
    expect(isSameCategoryName('Cuidado Personal', 'cuidado personal')).toBe(true);
  });
});
