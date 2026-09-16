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
const isoNow = '2026-01-01T00:00:00.000Z';

const seedPayload: SeedPayload = {
  categories: [
    {
      id: 'e2e-cat-hogar',
      name: 'Hogar E2E',
      colorKey: 'slate',
      order: 0,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'e2e-cat-super',
      name: 'Supermercado E2E',
      colorKey: 'sage',
      order: 1,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  budgetVersions: [
    {
      id: `e2e-cat-hogar-${monthKey}`,
      categoryId: 'e2e-cat-hogar',
      effectiveFrom: monthKey,
      amountCents: 100000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: `e2e-cat-super-${monthKey}`,
      categoryId: 'e2e-cat-super',
      effectiveFrom: monthKey,
      amountCents: 100000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  transactions: [
    {
      id: 'e2e-tx-1',
      concept: 'Café de olla',
      amountCents: 42500,
      categoryId: 'e2e-cat-hogar',
      date: localDate,
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
        const tx = database.transaction(
          ['categories', 'budgetVersions', 'transactions'],
          'readwrite',
        );
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

test.describe('Movimientos', () => {
  test('editar la categoría de un gasto se refleja en Visualización', async ({ page }) => {
    await page.goto(`/movimientos?mes=${monthKey}`);

    // La base queda abierta cuando la lista termina de consultar.
    await expect(page.getByText(/Aún no hay movimientos en/)).toBeVisible();
    await seedLocalDatabase(page, seedPayload);
    await page.reload();

    await expect(page.getByText('1 movimiento · $425.00')).toBeVisible();

    const fila = page.getByRole('button', { name: /^Editar Café de olla/ });
    await expect(fila).toBeVisible();
    await fila.click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await dialogo.getByLabel('Categoría').selectOption('e2e-cat-super');
    await dialogo.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Editar Café de olla, Supermercado E2E, $425.00' }),
    ).toBeVisible();

    // Navegación sin recargar: Visualización debe leer el cambio.
    await page.getByRole('link', { name: 'Visualización' }).first().click();
    await expect(page).toHaveURL(/\/visualizacion/);

    const tabla = page.locator('table');
    await expect(tabla.locator('tbody tr').filter({ hasText: 'Supermercado E2E' })).toContainText(
      '$425.00',
    );
    await expect(tabla.locator('tbody tr').filter({ hasText: 'Hogar E2E' })).toContainText('$0.00');
  });

  test('eliminar con confirmación y deshacer restaura el gasto', async ({ page }) => {
    await page.goto(`/movimientos?mes=${monthKey}`);

    await expect(page.getByText(/Aún no hay movimientos en/)).toBeVisible();
    await seedLocalDatabase(page, seedPayload);
    await page.reload();

    await page.getByRole('button', { name: /^Editar Café de olla/ }).click();
    const dialogo = page.getByRole('dialog');
    await dialogo.getByRole('button', { name: 'Eliminar' }).click();
    await expect(dialogo.getByText('¿Eliminar este gasto de $425.00?')).toBeVisible();
    await dialogo
      .getByRole('group', { name: 'Confirmar eliminación' })
      .getByRole('button', { name: 'Eliminar' })
      .click();

    await expect(page.getByText(/Aún no hay movimientos en/)).toBeVisible();

    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(page.getByText('1 movimiento · $425.00')).toBeVisible();
  });
});
