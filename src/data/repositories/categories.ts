import { z } from 'zod';
import { db } from '../db';
import { normalizeName } from '../../domain/categories';
import { categorySchema } from '../../domain/schemas';
import { makeSeedCategories } from '../../domain/seed';
import type { Category } from '../../domain/types';

export class CategoryInUseError extends Error {
  constructor(message = 'La categoría está en uso') {
    super(message);
    this.name = 'CategoryInUseError';
  }
}

export const categoryUpsertInputSchema = categorySchema.pick({
  name: true,
  colorKey: true,
  order: true,
  archivedAt: true,
});

export async function listCategories(): Promise<Category[]> {
  return db.categories.orderBy('order').toArray();
}

export async function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}

export async function upsertCategory(
  input: z.infer<typeof categoryUpsertInputSchema> & { id?: string },
): Promise<Category> {
  const payload = categoryUpsertInputSchema.parse(input);
  const now = new Date().toISOString();
  const existing = input.id ? await db.categories.get(input.id) : undefined;

  const category: Category = {
    id: input.id ?? crypto.randomUUID(),
    name: payload.name.trim(),
    colorKey: payload.colorKey,
    order: payload.order,
    archivedAt: payload.archivedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  categorySchema.parse(category);
  await db.categories.put(category);
  return category;
}

export async function removeCategory(id: string): Promise<void> {
  const category = await db.categories.get(id);
  if (!category) return;

  const hasTransactions = await db.transactions.where('categoryId').equals(id).count();
  const hasActiveBudgetVersions = await db.budgetVersions
    .where('categoryId')
    .equals(id)
    .filter((version) => version.amountCents > 0)
    .count();

  if (hasTransactions > 0 || hasActiveBudgetVersions > 0) {
    throw new CategoryInUseError();
  }

  await db.categories.delete(id);
}

export async function ensureSeedCategories(): Promise<void> {
  const settings = await db.settings.get('app');
  if (settings?.seededAt) return;

  const existing = await db.categories.count();
  if (existing > 0) return;

  // Una sola fuente para la semilla: la misma que usa el borrado total
  // (`clearAllData`), así el primer arranque y el borrado dejan apps idénticas.
  const now = new Date().toISOString();
  const seed = makeSeedCategories(now).map((category) => categorySchema.parse(category));

  await db.transaction('rw', db.categories, db.settings, async () => {
    const currentSettings = await db.settings.get('app');
    if (currentSettings?.seededAt) return;

    await db.categories.bulkPut(seed);
    await db.settings.put({
      key: 'app',
      seededAt: now,
      lastBackupAt: null,
      persistenceRequested: false,
      backupReminderDismissedAt: null,
    });
  });
}

export function categoryExistsWithName(name: string): boolean {
  void name;
  return false;
}

export function normalizeCategoryName(name: string): string {
  return normalizeName(name);
}
