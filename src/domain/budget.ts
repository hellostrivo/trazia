import { z } from 'zod';
import type { BudgetVersion, MonthKey } from './types';

export function resolveBudget(
  versions: readonly BudgetVersion[],
  categoryId: string,
  monthKey: MonthKey,
): number {
  const matches = versions
    .filter((version) => version.categoryId === categoryId && version.effectiveFrom <= monthKey)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));

  return matches[0]?.amountCents ?? 0;
}

export const budgetVersionUpsertSchema = z.object({
  categoryId: z.string().min(1),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}$/),
  amountCents: z.number().int().nonnegative(),
});

export function normalizeBudgetAmount(value: number): number {
  return z.number().int().nonnegative().parse(value);
}
