import { test, expect } from '@playwright/test';

test.describe('Visualización', () => {
  test('muestra el resumen del mes actual y mantiene la URL', async ({ page }) => {
    await page.goto('/visualizacion?mes=2026-09');

    await expect(page).toHaveURL(/\/visualizacion\?mes=2026-09$/);
    await expect(page.getByText('Gastado')).toBeVisible();
    await expect(page.getByText('Planeado')).toBeVisible();
    await expect(page.getByRole('button', { name: /mes anterior/i })).toBeVisible();
  });
});
