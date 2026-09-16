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

    // Hacer click en Deshacer
    await page.getByRole('button', { name: 'Deshacer' }).click();

    // El toast debe desaparecer
    await expect(page.getByText(/Guardado:/)).not.toBeVisible();
  });
});
