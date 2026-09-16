import { test, expect, type Page } from '@playwright/test';

interface SeedPayload {
  categories: Array<Record<string, unknown>>;
  budgetVersions: Array<Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

const now = new Date();
const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
const localDate = `${monthKey}-${pad(now.getDate())}`;
const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const previousMonthKey = `${previous.getFullYear()}-${pad(previous.getMonth() + 1)}`;
const previousLocalDate = `${previousMonthKey}-05`;
const isoNow = '2026-01-01T00:00:00.000Z';

const seedPayload: SeedPayload = {
  categories: [
    {
      id: 'viz-cat-hogar',
      name: 'Hogar VIZ',
      colorKey: 'slate',
      order: 0,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  budgetVersions: [
    {
      id: `viz-cat-hogar-${monthKey}`,
      categoryId: 'viz-cat-hogar',
      effectiveFrom: monthKey,
      amountCents: 100000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  transactions: [
    {
      id: 'viz-tx-1',
      concept: 'Renta parcial',
      amountCents: 42500,
      categoryId: 'viz-cat-hogar',
      date: localDate,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'viz-tx-prev',
      concept: 'Gasto del mes anterior',
      amountCents: 11100,
      categoryId: 'viz-cat-hogar',
      date: previousLocalDate,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
};

/** Escribe directamente en la base local (la app no expone una importación). */
async function seedLocalDatabase(page: Page, payload: SeedPayload) {
  await page.evaluate(async (data: SeedPayload) => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('trazia');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const tx = database.transaction(['categories', 'budgetVersions', 'transactions'], 'readwrite');
        data.categories.forEach((category) => tx.objectStore('categories').put(category));
        data.budgetVersions.forEach((version) => tx.objectStore('budgetVersions').put(version));
        data.transactions.forEach((transaction) => tx.objectStore('transactions').put(transaction));
        tx.oncomplete = () => {
          database.close();
          resolve(null);
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, payload);
}

test.describe('Visualización', () => {
  test('muestra el resumen del mes actual y mantiene la URL', async ({ page }) => {
    await page.goto(`/visualizacion?mes=${monthKey}`);

    // La base queda abierta cuando la primera consulta termina de resolverse.
    await expect(page.getByRole('heading', { name: 'Visualización', level: 1 })).toBeVisible();
    await seedLocalDatabase(page, seedPayload);
    await page.reload();

    await expect(page).toHaveURL(new RegExp(`/visualizacion\\?mes=${monthKey}$`));
    await expect(page.getByRole('button', { name: /mes anterior/i })).toBeVisible();

    const tarjeta = page.getByRole('region', { name: 'Tarjeta principal del mes' });
    await expect(tarjeta.getByText('Gastado')).toBeVisible();
    await expect(tarjeta.getByText('Planeado')).toBeVisible();
    await expect(tarjeta).toContainText('$425.00');
    await expect(tarjeta).toContainText('$1,000.00');

    const tabla = page.locator('table');
    await expect(tabla.locator('tbody tr').filter({ hasText: 'Hogar VIZ' })).toContainText('$425.00');
  });

  test('cambiar de mes vuelve a consultar los movimientos de ese mes', async ({ page }) => {
    await page.goto(`/visualizacion?mes=${monthKey}`);

    await expect(page.getByRole('heading', { name: 'Visualización', level: 1 })).toBeVisible();
    await seedLocalDatabase(page, seedPayload);
    await page.reload();

    const tarjeta = page.getByRole('region', { name: 'Tarjeta principal del mes' });
    await expect(tarjeta).toContainText('$425.00');

    await page.getByRole('button', { name: /mes anterior/i }).click();

    await expect(page).toHaveURL(new RegExp(`/visualizacion\\?mes=${previousMonthKey}$`));
    await expect(tarjeta).toContainText('$111.00');
    await expect(tarjeta).not.toContainText('$425.00');
  });
});
