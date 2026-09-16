import { test, expect, type Page } from '@playwright/test';

/**
 * Prueba de humo permanente.
 *
 * Falla si una ruta apunta a una pantalla de demostración, si un repositorio
 * lanza en tiempo de ejecución, o si algo cae en el ErrorBoundary. No basta con
 * mirar la pantalla: también escucha la consola, porque los fallos que hemos
 * tenido (índice inexistente en Dexie, `formatMXN` con negativos) se anunciaban
 * ahí antes de tumbar la vista.
 */

const ERROR_BOUNDARY_TEXT = 'Algo salió mal. Intenta recargar la página.';

const ROUTES = [
  { path: '/', heading: 'Captura' },
  { path: '/configuracion', heading: 'Configuración' },
  { path: '/visualizacion', heading: 'Visualización' },
  { path: '/movimientos', heading: 'Movimientos' },
] as const;

/** Las 8 categorías de la semilla de SPEC-01. */
const SEED_CATEGORIES = [
  'Hogar',
  'Supermercado',
  'Transporte',
  'Salud',
  'Cuidado personal',
  'Comidas fuera',
  'Entretenimiento',
  'Otros',
];

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
const isoNow = '2026-01-01T00:00:00.000Z';

/** Presupuesto de $100.00 contra un gasto de $425.00: el mes queda por encima del plan. */
const porEncimaDelPlan: SeedPayload = {
  categories: [
    {
      id: 'smoke-cat',
      name: 'Hogar SMOKE',
      colorKey: 'clay',
      order: 20,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  budgetVersions: [
    {
      id: `smoke-cat-${monthKey}`,
      categoryId: 'smoke-cat',
      effectiveFrom: monthKey,
      amountCents: 10000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  transactions: [
    {
      id: 'smoke-tx',
      concept: 'Reparación',
      amountCents: 42500,
      categoryId: 'smoke-cat',
      date: localDate,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
};

/** Acumula todo lo que la página reporte como error. Debe quedar vacío. */
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console.error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  return errors;
}

function expectNoErrors(errors: string[]) {
  expect(errors, `La página reportó errores:\n${errors.join('\n')}`).toEqual([]);
}

async function expectRouteIsHealthy(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
}

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

test.describe('Humo', () => {
  test('instalación nueva: las cuatro rutas abren y Captura trae la semilla', async ({ page }) => {
    const errors = watchForErrors(page);

    for (const route of ROUTES) {
      await expectRouteIsHealthy(page, route.path, route.heading);
    }

    // Si `/` apuntara a una pantalla de demostración no habría grupo de categorías,
    // y si nadie llamara a `ensureSeedCategories` el grupo estaría vacío.
    await page.goto('/');
    const chips = page.getByRole('radiogroup', { name: 'Categoría' });
    await expect(chips).toBeVisible();
    await expect(chips.getByRole('radio')).toHaveCount(SEED_CATEGORIES.length);
    for (const name of SEED_CATEGORIES) {
      await expect(chips.getByRole('radio', { name })).toBeVisible();
    }

    // Y los campos reales de captura, no los del maquetado.
    await expect(page.getByLabel('Monto')).toBeVisible();
    await expect(page.getByLabel('Concepto')).toBeVisible();

    expectNoErrors(errors);
  });

  test('un mes por encima del plan no tumba ninguna ruta', async ({ page }) => {
    const errors = watchForErrors(page);

    await expectRouteIsHealthy(page, '/movimientos', 'Movimientos');
    await seedLocalDatabase(page, porEncimaDelPlan);

    for (const route of ROUTES) {
      await expectRouteIsHealthy(page, route.path, route.heading);
    }

    // El estado se muestra con el texto de SPEC-04, no con un número negativo.
    await page.goto(`/visualizacion?mes=${monthKey}`);
    await expect(page.getByText(/Por encima de lo planeado: \$325\.00/).first()).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);

    expectNoErrors(errors);
  });

  test('ir de un mes con datos a uno sin datos, en Visualización y en Movimientos', async ({ page }) => {
    const errors = watchForErrors(page);

    await expectRouteIsHealthy(page, '/movimientos', 'Movimientos');
    await seedLocalDatabase(page, porEncimaDelPlan);

    // Visualización: del mes con datos al anterior, vacío.
    await page.goto(`/visualizacion?mes=${monthKey}`);
    await expect(page.getByRole('region', { name: 'Tarjeta principal del mes' })).toContainText('$425.00');

    await page.getByRole('button', { name: /mes anterior/i }).click();
    await expect(page).toHaveURL(new RegExp(`/visualizacion\\?mes=${previousMonthKey}$`));
    await expect(page.getByRole('region', { name: 'Tarjeta principal del mes' })).not.toContainText('$425.00');
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);

    // Y de vuelta al mes con datos.
    await page.getByRole('button', { name: /mes siguiente/i }).click();
    await expect(page.getByRole('region', { name: 'Tarjeta principal del mes' })).toContainText('$425.00');

    // Movimientos: mismo recorrido.
    await page.goto(`/movimientos?mes=${monthKey}`);
    await expect(page.getByText('1 movimiento · $425.00')).toBeVisible();

    await page.getByRole('button', { name: /mes anterior/i }).click();
    await expect(page.getByText(/Aún no hay movimientos en/)).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);

    await page.getByRole('button', { name: /mes siguiente/i }).click();
    await expect(page.getByText('1 movimiento · $425.00')).toBeVisible();

    expectNoErrors(errors);
  });
});
