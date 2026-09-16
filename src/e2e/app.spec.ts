import { test, expect } from '@playwright/test';

test.describe('TRAZIA shell', () => {
  test('navega por las secciones principales y evita scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Captura' })).toBeVisible();
    await page.getByRole('link', { name: 'Visualización' }).click();
    await expect(page).toHaveURL(/\/visualizacion\?mes=\d{4}-\d{2}$/);

    const horizontal = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(horizontal).toBeFalsy();
  });
});
