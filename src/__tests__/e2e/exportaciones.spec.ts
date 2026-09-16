import { test, expect, type Page } from '@playwright/test';

/**
 * SPEC-06 — Exportaciones.
 *
 * Descarga el Excel de transacciones y el PDF del plan con el evento `download`
 * de Playwright, y comprueba el nombre y que el archivo pese más de 0 bytes.
 * Además vigila que durante la exportación no salga ninguna solicitud de red
 * fuera del propio servidor de la app (criterio 7).
 */

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
      id: 'exp-cat-hogar',
      name: 'Hogar EXP',
      colorKey: 'slate',
      order: 30,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'exp-cat-comida',
      name: 'Comida EXP',
      colorKey: 'sage',
      order: 31,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  budgetVersions: [
    {
      id: `exp-cat-hogar-${monthKey}`,
      categoryId: 'exp-cat-hogar',
      effectiveFrom: monthKey,
      amountCents: 700000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: `exp-cat-comida-${monthKey}`,
      categoryId: 'exp-cat-comida',
      effectiveFrom: monthKey,
      amountCents: 300000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  transactions: [
    {
      id: 'exp-tx-1',
      concept: 'Renta parcial',
      amountCents: 42500,
      categoryId: 'exp-cat-hogar',
      date: localDate,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'exp-tx-2',
      concept: '=HYPERLINK("https://example.test","x")',
      amountCents: 1000,
      categoryId: 'exp-cat-comida',
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

/** Registra las solicitudes que salen del servidor de la app a partir de ahora. */
function watchExternalRequests(page: Page): string[] {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol !== 'blob:') {
      external.push(request.url());
    }
  });
  return external;
}

test.describe('Exportaciones', () => {
  test('descarga el Excel del mes seleccionado', async ({ page }) => {
    await page.goto(`/visualizacion?mes=${monthKey}`);
    await expect(page.getByRole('heading', { name: 'Visualización', level: 1 })).toBeVisible();
    await seedLocalDatabase(page, seedPayload);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Tarjeta principal del mes' })).toContainText(
      '$435.00',
    );

    const external = watchExternalRequests(page);

    await page.getByRole('button', { name: 'Exportar a Excel' }).click();
    const dialog = page.getByRole('dialog', { name: 'Exportar a Excel' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('radio', { name: /todo el historial/i })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Descargar Excel' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(`trazia-transacciones-${monthKey}.xlsx`);
    const path = await download.path();
    expect(path).not.toBeNull();
    const { statSync } = await import('node:fs');
    expect(statSync(path!).size).toBeGreaterThan(0);

    await expect(dialog).not.toBeVisible();
    expect(external).toEqual([]);
  });

  test('descarga todo el historial con la fecha de generación en el nombre', async ({ page }) => {
    await page.goto(`/visualizacion?mes=${monthKey}`);
    await expect(page.getByRole('heading', { name: 'Visualización', level: 1 })).toBeVisible();
    await seedLocalDatabase(page, seedPayload);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Exportar a Excel' })).toBeVisible();

    await page.getByRole('button', { name: 'Exportar a Excel' }).click();
    const dialog = page.getByRole('dialog', { name: 'Exportar a Excel' });
    await dialog.getByRole('radio', { name: /todo el historial/i }).check();

    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Descargar Excel' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(
      /^trazia-transacciones-historial-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
  });

  test('sin movimientos en el alcance deshabilita la descarga', async ({ page }) => {
    // Un mes lejano sin datos; el botón de exportar sigue disponible en el estado vacío.
    await page.goto('/visualizacion?mes=2020-01');
    await expect(page.getByRole('heading', { name: 'Visualización', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Exportar a Excel' }).click();
    const dialog = page.getByRole('dialog', { name: 'Exportar a Excel' });
    await expect(dialog.getByText('No hay movimientos para exportar')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Descargar Excel' })).toBeDisabled();
  });

  test('descarga el plan del mes en PDF', async ({ page }) => {
    await page.goto('/configuracion');
    await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible();
    await seedLocalDatabase(page, seedPayload);
    await page.reload();

    const section = page.getByRole('region', { name: 'Plan en PDF' });
    await expect(section).toBeVisible();
    const button = section.getByRole('button', { name: 'Descargar plan en PDF' });
    await expect(button).toBeEnabled();

    const external = watchExternalRequests(page);

    const downloadPromise = page.waitForEvent('download');
    await button.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(`trazia-plan-${monthKey}.pdf`);
    const path = await download.path();
    expect(path).not.toBeNull();
    const { readFileSync } = await import('node:fs');
    const bytes = readFileSync(path!);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');

    await expect(button).toBeEnabled();
    expect(external).toEqual([]);
  });

  test('sin presupuestos el PDF queda deshabilitado con la nota', async ({ page }) => {
    await page.goto('/configuracion');
    await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible();

    const section = page.getByRole('region', { name: 'Plan en PDF' });
    await expect(
      section.getByText('Asigna al menos un presupuesto para generar tu plan'),
    ).toBeVisible();
    await expect(section.getByRole('button', { name: 'Descargar plan en PDF' })).toBeDisabled();
  });
});
