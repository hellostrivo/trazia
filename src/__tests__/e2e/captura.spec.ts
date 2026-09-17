import { test, expect } from '@playwright/test';

test.describe('Captura', () => {
  test('capturar un gasto básico y deshacer', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Captura' })).toBeVisible();

    // Rellenar monto
    await page.fill('input[placeholder="$0.00"]', '250');

    // Rellenar concepto
    await page.fill('input[name="concepto"]', 'Mercado test');

    // Seleccionar primera categoría
    const firstChip = page.locator('[role="radiogroup"] [role="radio"]').first();
    await firstChip.click();

    // Guardar
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Toast de guardado
    await expect(page.getByText(/Guardado:/)).toBeVisible();

    // SPEC-07, criterio 5: el primer movimiento guardado deja registrado el
    // intento de persistencia (se comprueba en la base real, no en la función).
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<boolean | null>((resolve, reject) => {
              const request = indexedDB.open('trazia');
              request.onerror = () => reject(request.error);
              request.onsuccess = () => {
                const database = request.result;
                const get = database.transaction('settings', 'readonly').objectStore('settings').get('app');
                get.onsuccess = () => {
                  database.close();
                  const row = get.result as { persistenceRequested?: boolean } | undefined;
                  resolve(row?.persistenceRequested ?? null);
                };
                get.onerror = () => reject(get.error);
              };
            }),
        ),
      )
      .toBe(true);

    // Hacer click en Deshacer
    await page.getByRole('button', { name: 'Deshacer' }).click();

    // El toast debe desaparecer
    await expect(page.getByText(/Guardado:/)).not.toBeVisible();
  });
});
