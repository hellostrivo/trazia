import { db } from '../../data/db';
import { categorySchema } from '../../domain/schemas';
import { makeDefaultSettings, makeSeedCategories } from '../../domain/seed';
import type { AppSettings } from '../../domain/types';

export const CONFIRM_DELETE_WORD = 'BORRAR';

/** Criterio 4: la palabra debe coincidir exactamente, mayúsculas incluidas. */
export function isDeleteConfirmationValid(text: string): boolean {
  return text === CONFIRM_DELETE_WORD;
}

/**
 * Borra todos los datos y deja la app como recién instalada (SPEC-07, punto 5).
 *
 * Borrado y resiembra van en UNA transacción `rw` sobre las cuatro tablas:
 * `clear` × 4 → `bulkAdd` de las 8 categorías genéricas → `put` de settings
 * con `seededAt` nuevo. Si la resiembra falla, Dexie revierte también el
 * borrado y los datos anteriores siguen intactos; nunca queda una base vacía
 * sin categorías (que dejaría Captura sin poder guardar).
 *
 * `persistenceRequested` se conserva: describe a este navegador, no a los
 * datos (misma regla que la restauración, T-063).
 */
export async function clearAllData(now: Date = new Date()): Promise<void> {
  const nowIso = now.toISOString();
  const seed = makeSeedCategories(nowIso).map((category) => categorySchema.parse(category));

  await db.transaction(
    'rw',
    db.categories,
    db.budgetVersions,
    db.transactions,
    db.settings,
    async () => {
      const current = await db.settings.get('app');

      await db.categories.clear();
      await db.budgetVersions.clear();
      await db.transactions.clear();
      await db.settings.clear();

      await db.categories.bulkAdd(seed);

      const settings: AppSettings = {
        ...makeDefaultSettings(),
        seededAt: nowIso,
        persistenceRequested: current?.persistenceRequested ?? false,
      };
      await db.settings.put(settings);
    },
  );
}
