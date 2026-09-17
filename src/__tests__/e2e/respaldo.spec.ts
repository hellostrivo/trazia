import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * SPEC-07 (bloque A) — Respaldo y restauración con archivo real.
 *
 * Descarga el respaldo con el evento `download`, vacía la base como haría el
 * borrado total, vuelve a cargar ese mismo archivo desde disco y comprueba que
 * los datos regresan. También cubre los mensajes de error con archivos
 * inválidos y que Privacidad se lee sin red.
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
      id: 'bk-cat-hogar',
      name: 'Hogar BK',
      colorKey: 'slate',
      order: 40,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'bk-cat-comida',
      name: 'Comida BK',
      colorKey: 'sage',
      order: 41,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  budgetVersions: [
    {
      id: `bk-cat-hogar-${monthKey}`,
      categoryId: 'bk-cat-hogar',
      effectiveFrom: monthKey,
      amountCents: 700000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  transactions: [
    {
      id: 'bk-tx-1',
      concept: 'Renta respaldo',
      amountCents: 42500,
      categoryId: 'bk-cat-hogar',
      date: localDate,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'bk-tx-2',
      concept: 'Tacos respaldo',
      amountCents: 1000,
      categoryId: 'bk-cat-comida',
      date: localDate,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
};

/** Escribe directamente en la base local, como en las pruebas de SPEC-06. */
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

/** Vacía las tres tablas de datos (equivale al "borrar todo" del bloque B). */
async function wipeLocalDatabase(page: Page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('trazia');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const tx = database.transaction(
          ['categories', 'budgetVersions', 'transactions'],
          'readwrite',
        );
        tx.objectStore('categories').clear();
        tx.objectStore('budgetVersions').clear();
        tx.objectStore('transactions').clear();
        tx.oncomplete = () => {
          database.close();
          resolve(null);
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
}

/** Lee todas las filas de una tabla, ordenadas por id, para comparar de forma profunda. */
async function readTable(page: Page, table: string): Promise<unknown[]> {
  return page.evaluate(async (name: string) => {
    return new Promise<unknown[]>((resolve, reject) => {
      const request = indexedDB.open('trazia');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const store = database.transaction(name, 'readonly').objectStore(name);
        const all = store.getAll();
        all.onsuccess = () => {
          database.close();
          const rows = all.result as Array<{ id?: string; key?: string }>;
          rows.sort((a, b) => String(a.id ?? a.key).localeCompare(String(b.id ?? b.key)));
          resolve(rows);
        };
        all.onerror = () => reject(all.error);
      };
    });
  }, table);
}

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

async function openConfiguracion(page: Page) {
  await page.goto('/configuracion');
  await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible();
}

test.describe('Respaldo y restauración (SPEC-07, bloque A)', () => {
  test('respaldar → vaciar → restaurar deja los datos idénticos', async ({ page }) => {
    await openConfiguracion(page);
    await seedLocalDatabase(page, seedPayload);
    await page.reload();

    const section = page.getByRole('region', { name: 'Datos y respaldo' });
    await expect(section).toBeVisible();
    // 8 de la semilla + 2 sembradas aquí.
    await expect(section).toContainText('10 categorías y 2 movimientos');
    await expect(section).toContainText('Nunca');
    await expect(section).toContainText(
      'El respaldo no está cifrado. Guárdalo en un lugar seguro.',
    );
    // Estado de persistencia: uno de los dos textos, nunca un hueco.
    await expect(
      section.getByText(/Protegido contra borrado automático|El navegador podría borrar los datos/),
    ).toBeVisible();

    const external = watchExternalRequests(page);

    // 1. Descargar.
    const before = {
      categories: await readTable(page, 'categories'),
      budgetVersions: await readTable(page, 'budgetVersions'),
      transactions: await readTable(page, 'transactions'),
    };
    const downloadPromise = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Descargar respaldo' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^trazia-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
    const path = await download.path();
    expect(path).not.toBeNull();

    const file = JSON.parse(readFileSync(path!, 'utf8')) as {
      app: string;
      formatVersion: number;
      schemaVersion: number;
      exportedAt: string;
      data: {
        categories: unknown[];
        transactions: Array<{ id: string }>;
        settings: Record<string, unknown>;
      };
    };
    expect(file.app).toBe('trazia');
    expect(file.formatVersion).toBe(1);
    expect(file.schemaVersion).toBe(1);
    expect(Number.isNaN(Date.parse(file.exportedAt))).toBe(false);
    expect(file.data.categories).toHaveLength(10);
    expect(file.data.transactions.map((t) => t.id).sort()).toEqual(['bk-tx-1', 'bk-tx-2']);
    expect(Object.keys(file.data.settings).sort()).toEqual([
      'lastBackupAt',
      'persistenceRequested',
      'seededAt',
    ]);

    await expect(section).toContainText('Respaldo descargado.');
    await expect(section).not.toContainText('Nunca');

    // 2. Vaciar (como el borrado total del bloque B).
    await wipeLocalDatabase(page);
    await page.reload();
    await expect(section).toContainText('0 categorías y 0 movimientos');

    // 3. Restaurar desde el archivo real: validar → vista previa → confirmar → reemplazar.
    await section.getByLabel('Archivo de respaldo').setInputFiles(path!);
    const preview = section.getByTestId('respaldo-vista-previa');
    await expect(preview).toHaveText(/^Contiene 10 categorías y 2 movimientos \(del .+ al .+\)/);
    // Nada cambia hasta confirmar.
    await expect(section).toContainText('0 categorías y 0 movimientos');

    await preview.getByRole('button', { name: 'Restaurar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Restaurar respaldo' });
    await expect(dialog).toContainText('Esto reemplazará todos tus datos actuales.');
    await expect(
      dialog.getByRole('button', { name: 'Descargar respaldo actual primero' }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Reemplazar' }).click();

    await expect(section).toContainText('Respaldo restaurado. Tus datos ya están actualizados.');
    await expect(dialog).not.toBeVisible();
    await expect(section).toContainText('10 categorías y 2 movimientos');

    const after = {
      categories: await readTable(page, 'categories'),
      budgetVersions: await readTable(page, 'budgetVersions'),
      transactions: await readTable(page, 'transactions'),
    };
    expect(after).toEqual(before);

    // Los movimientos vuelven a la vista.
    await page.goto(`/movimientos?mes=${monthKey}`);
    await expect(page.getByText('Renta respaldo')).toBeVisible();
    await expect(page.getByText('Tacos respaldo')).toBeVisible();

    expect(external).toEqual([]);
  });

  test('"Descargar respaldo actual primero" entrega los datos vigentes antes de reemplazar', async ({
    page,
  }, testInfo) => {
    await openConfiguracion(page);
    await seedLocalDatabase(page, seedPayload);
    await page.reload();
    const section = page.getByRole('region', { name: 'Datos y respaldo' });

    // Un respaldo válido pero distinto (una sola categoría, sin movimientos).
    const otherBackup = {
      app: 'trazia',
      formatVersion: 1,
      schemaVersion: 1,
      exportedAt: isoNow,
      data: {
        categories: [seedPayload.categories[0]],
        budgetVersions: [],
        transactions: [],
        settings: { seededAt: isoNow, lastBackupAt: null, persistenceRequested: false },
      },
    };
    const otherPath = testInfo.outputPath('otro-respaldo.json');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(otherPath, JSON.stringify(otherBackup));

    await section.getByLabel('Archivo de respaldo').setInputFiles(otherPath);
    await expect(section.getByTestId('respaldo-vista-previa')).toContainText(
      'Contiene 1 categoría y 0 movimientos',
    );
    await section
      .getByTestId('respaldo-vista-previa')
      .getByRole('button', { name: 'Restaurar' })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Restaurar respaldo' });

    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Descargar respaldo actual primero' }).click();
    const download = await downloadPromise;
    const current = JSON.parse(readFileSync((await download.path())!, 'utf8')) as {
      data: { transactions: Array<{ id: string }> };
    };
    expect(current.data.transactions.map((t) => t.id).sort()).toEqual(['bk-tx-1', 'bk-tx-2']);
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Reemplazar' }).click();
    await expect(section).toContainText('1 categoría y 0 movimientos');
  });

  test('archivos inválidos: mensaje exacto y datos intactos', async ({ page }, testInfo) => {
    await openConfiguracion(page);
    await seedLocalDatabase(page, seedPayload);
    await page.reload();
    const section = page.getByRole('region', { name: 'Datos y respaldo' });
    await expect(section).toContainText('10 categorías y 2 movimientos');
    const input = section.getByLabel('Archivo de respaldo');
    const { writeFileSync } = await import('node:fs');

    const cases: Array<{ name: string; content: string; message: string }> = [
      {
        name: 'no-json.json',
        content: '{ esto no es json',
        message: 'Este archivo no es un respaldo de TRAZIA.',
      },
      {
        name: 'otra-app.json',
        content: JSON.stringify({ app: 'otra', formatVersion: 1, schemaVersion: 1, data: {} }),
        message: 'Este archivo no es un respaldo de TRAZIA.',
      },
      {
        name: 'futuro.json',
        content: JSON.stringify({
          app: 'trazia',
          formatVersion: 99,
          schemaVersion: 1,
          exportedAt: isoNow,
          data: {},
        }),
        message:
          'Este respaldo se creó con una versión más reciente de TRAZIA. Actualiza la app e inténtalo de nuevo.',
      },
      {
        name: 'referencia-rota.json',
        content: JSON.stringify({
          app: 'trazia',
          formatVersion: 1,
          schemaVersion: 1,
          exportedAt: isoNow,
          data: {
            categories: [seedPayload.categories[0]],
            budgetVersions: [],
            transactions: [{ ...seedPayload.transactions[1], categoryId: 'no-existe' }],
            settings: { seededAt: isoNow, lastBackupAt: null, persistenceRequested: false },
          },
        }),
        message:
          'El respaldo tiene datos incompletos o dañados. Tus datos actuales no se modificaron.',
      },
    ];

    for (const item of cases) {
      const path = testInfo.outputPath(item.name);
      writeFileSync(path, item.content);
      await input.setInputFiles(path);
      await expect(section.getByRole('alert'), item.name).toHaveText(item.message);
      await expect(section.getByTestId('respaldo-vista-previa')).toHaveCount(0);
    }

    await expect(section).toContainText('10 categorías y 2 movimientos');
    const transactions = (await readTable(page, 'transactions')) as Array<{ id: string }>;
    expect(transactions.map((t) => t.id)).toEqual(['bk-tx-1', 'bk-tx-2']);
  });

  test('Privacidad se lee sin conexión y se enlaza desde Acerca de', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();

    // Sin red: la navegación es del lado del cliente y el texto vive en el bundle.
    await context.setOffline(true);
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.getByRole('link', { name: 'Configuración' }).first().click();
    await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible();

    const acerca = page.getByRole('region', { name: 'Acerca de' });
    await expect(acerca).toContainText(/TRAZIA, versión \d+\.\d+\.\d+/);
    await acerca.getByRole('link', { name: /Privacidad/ }).click();
    await expect(page).toHaveURL(/#privacidad$/);

    const privacidad = page.getByRole('region', { name: 'Privacidad' });
    await expect(privacidad).toBeVisible();
    await expect(privacidad).toContainText('únicamente en este dispositivo y en este navegador');
    await expect(privacidad).toContainText('No hay cuentas ni contraseñas');
    await expect(privacidad).toContainText('Sin sincronización entre dispositivos');
    await expect(privacidad).toContainText('Cómo respaldar');
    await expect(privacidad).toContainText('Si se borran los datos del navegador');
    await expect(privacidad).toContainText('bajo tu responsabilidad');

    expect(requests).toEqual([]);
    await context.setOffline(false);
  });
});
