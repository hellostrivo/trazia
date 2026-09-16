import { z } from 'zod';
import { db } from '../db';
import { budgetVersionSchema } from '../../domain/schemas';
import type { BudgetVersion } from '../../domain/types';

export const budgetInputSchema = z.object({
  categoryId: z.string().min(1),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}$/),
  amountCents: z.number().int().nonnegative(),
});

export async function listBudgets(): Promise<BudgetVersion[]> {
  // `effectiveFrom` no es un índice propio (sólo existe el compuesto
  // [categoryId+effectiveFrom]), así que el orden se resuelve en memoria.
  const versions = await db.budgetVersions.toArray();
  return versions.sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom));
}

export async function getBudgetForCategory(categoryId: string): Promise<BudgetVersion[]> {
  return db.budgetVersions.where('categoryId').equals(categoryId).sortBy('effectiveFrom');
}

export async function setBudgetForMonth(input: z.infer<typeof budgetInputSchema>): Promise<BudgetVersion> {
  const payload = budgetInputSchema.parse(input);
  const now = new Date().toISOString();
  const version: BudgetVersion = {
    id: `${payload.categoryId}-${payload.effectiveFrom}`,
    categoryId: payload.categoryId,
    effectiveFrom: payload.effectiveFrom,
    amountCents: payload.amountCents,
    createdAt: now,
    updatedAt: now,
  };

  budgetVersionSchema.parse(version);
  await db.transaction('rw', db.budgetVersions, async () => {
    await db.budgetVersions.put(version);
  });
  return version;
}

export async function listBudgetVersionsByCategory(categoryId: string): Promise<BudgetVersion[]> {
  return db.budgetVersions.where('categoryId').equals(categoryId).toArray();
}
