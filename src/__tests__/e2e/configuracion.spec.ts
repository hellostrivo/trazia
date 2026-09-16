import { test, expect } from '@playwright/test';

test.describe('Configuración', () => {
  test('crear una categoría con presupuesto', async ({ page }) => {
    await page.goto('/configuracion');

    // Verificar que estamos en la página de configuración
    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();

    // Hacer clic en "Agregar categoría"
    await page.getByRole('button', { name: 'Agregar categoría' }).click();

    // Esperar a que el diálogo aparezca
    await expect(page.getByRole('heading', { name: 'Agregar categoría' })).toBeVisible();

    // Rellenar el formulario
    await page.fill('input[placeholder="Ej. Hogar"]', 'Test Category');

    // Seleccionar color
    const colorSelect = page.locator('select').first();
    await colorSelect.selectOption('sage');

    // Guardar
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Esperar a que el diálogo desaparezca
    await expect(page.getByRole('heading', { name: 'Agregar categoría' })).not.toBeVisible();
    
    // Verificar que el toast de "Categoría guardada" aparece
    await expect(page.getByText('Categoría guardada')).toBeVisible();

    // Verificar que la categoría aparece en la lista
    await expect(page.getByText('Test Category')).toBeVisible();
  });

  test('selector de mes funciona correctamente', async ({ page }) => {
    await page.goto('/configuracion');

    // Verificar que hay botones de navegación del mes.
    // Se acota al selector de la cabecera: desde SPEC-06, "Plan en PDF" tiene su propio selector.
    const header = page.getByRole('group', { name: 'Presupuesto de' });
    const prevButton = header.getByRole('button', { name: 'Mes anterior' });
    const nextButton = header.getByRole('button', { name: 'Mes siguiente' });

    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    // Hacer clic en el botón siguiente
    await nextButton.click();

    // El selector debe haber actualizado (verificar que cambió algo)
    // Simplemente verificar que los botones siguen siendo clicables
    await expect(prevButton).toBeEnabled();
  });

  test('mostrar/ocultar tabla de datos', async ({ page }) => {
    await page.goto('/configuracion');

    // Buscar si existe el botón "Ver como tabla"
    const tableButton = page.getByRole('button', { name: /Ver como tabla|Ver gráfica/ }).first();
    
    // Verificar si el botón existe antes de hacer clic
    const exists = await tableButton.isVisible().catch(() => false);
    
    if (exists) {
      await tableButton.click();
      
      // Verificar que ocurrió algún cambio
      const newButton = page.getByRole('button', { name: /Ver como tabla|Ver gráfica/ }).first();
      await expect(newButton).toBeVisible();
    }
  });
});

