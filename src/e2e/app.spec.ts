import { test, expect, type Page } from '@playwright/test';

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

/**
 * Criterio 3 de SPEC-00: sin scroll horizontal en 320 px.
 *
 * Se comprueba en las cuatro rutas, con la base recién sembrada y con datos
 * (presupuestos y movimientos). Hasta SPEC-06 solo se medía `/`, y Configuración
 * llegó a 587 px y Visualización a 368 px sin que ninguna prueba lo viera.
 * Cuando falla, el mensaje lista los elementos que sobresalen del viewport para
 * no tener que volver a diagnosticarlo a mano.
 */

const VIEWPORT_320 = { width: 320, height: 640 };

/** `loaded` es un texto que solo aparece cuando la ruta ya pintó los datos sembrados. */
const ROUTES = [
  { path: '/', heading: 'Captura', loaded: 'Renta parcial de la casa de septiembre' },
  { path: '/visualizacion', heading: 'Visualización', loaded: '$21,659.50' },
  { path: '/movimientos', heading: 'Movimientos', loaded: 'Renta parcial de la casa de septiembre' },
  { path: '/configuracion', heading: 'Configuración', loaded: '$20,500.00' },
] as const;

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

/** Nombres largos y montos de cinco cifras: lo que ensanchaba tablas, leyendas y filas. */
const conDatos: SeedPayload = {
  categories: [
    {
      id: 'ancho-cat-hogar',
      name: 'Hogar y servicios del hogar',
      colorKey: 'slate',
      order: 30,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'ancho-cat-super',
      name: 'Supermercado y despensa quincenal',
      colorKey: 'sage',
      order: 31,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  budgetVersions: [
    {
      id: `ancho-cat-hogar-${monthKey}`,
      categoryId: 'ancho-cat-hogar',
      effectiveFrom: monthKey,
      amountCents: 1250000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: `ancho-cat-super-${monthKey}`,
      categoryId: 'ancho-cat-super',
      effectiveFrom: monthKey,
      amountCents: 800000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  transactions: [
    {
      id: 'ancho-tx-1',
      concept: 'Renta parcial de la casa de septiembre',
      amountCents: 1042500,
      categoryId: 'ancho-cat-hogar',
      date: localDate,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'ancho-tx-2',
      concept: 'Despensa',
      amountCents: 1123450,
      categoryId: 'ancho-cat-super',
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

interface OverflowReport {
  innerWidth: number;
  scrollWidth: number;
  /** Elementos cuyo borde derecho sobrepasa el viewport y que ningún ancestro recorta con overflow-x. */
  offenders: string[];
}

async function measureHorizontalOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const describe = (el: Element) => {
      const classes = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      const text = el.children.length === 0 ? ` "${(el.textContent ?? '').trim().slice(0, 30)}"` : '';
      return `${el.tagName.toLowerCase()}${classes}${text}`;
    };
    const isClippedByAncestor = (el: Element) => {
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden') return true;
        parent = parent.parentElement;
      }
      return false;
    };
    const offenders: string[] = [];
    document.querySelectorAll('body *').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > innerWidth + 1 && !isClippedByAncestor(el)) {
        offenders.push(`${describe(el)} → right=${Math.round(rect.right)}px (w=${Math.round(rect.width)}px)`);
      }
    });
    return { innerWidth, scrollWidth, offenders: offenders.slice(0, 15) };
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const report = await measureHorizontalOverflow(page);
  const detail = [
    `${label}: scrollWidth=${report.scrollWidth}px con viewport de ${report.innerWidth}px.`,
    ...report.offenders.map((line) => `  ${line}`),
  ].join('\n');
  expect(report.scrollWidth, detail).toBeLessThanOrEqual(report.innerWidth);
  expect(report.offenders, detail).toEqual([]);
}

test.describe('Sin scroll horizontal en 320 px (SPEC-00, criterio 3)', () => {
  test.use({ viewport: VIEWPORT_320 });

  test('la barra inferior muestra las cuatro etiquetas completas, sin solaparse y con objetivos de 44×44 px', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();

    const links = await page.evaluate(() =>
      [...document.querySelectorAll('.bottom-nav .nav-link')].map((link) => {
        const box = link.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(link);
        const text = range.getBoundingClientRect();
        return {
          label: link.textContent?.trim() ?? '',
          box: { left: box.left, right: box.right, width: box.width, height: box.height },
          text: { left: text.left, right: text.right },
        };
      }),
    );

    // Nombres completos: ni abreviaturas ni iconos (decisión de la persona usuaria).
    expect(links.map((link) => link.label)).toEqual(['Captura', 'Visualización', 'Movimientos', 'Configuración']);

    for (const link of links) {
      const detail = `${link.label}: caja ${Math.round(link.box.left)}..${Math.round(link.box.right)} (${Math.round(link.box.width)}×${Math.round(link.box.height)}), texto ${Math.round(link.text.left)}..${Math.round(link.text.right)}`;
      // Objetivo táctil mínimo de 44×44 px (SPEC-00).
      expect(link.box.width, detail).toBeGreaterThanOrEqual(44);
      expect(link.box.height, detail).toBeGreaterThanOrEqual(44);
      // El texto vive dentro de su propio enlace (tolerancia de 1 px por redondeo subpíxel).
      expect(link.text.left, detail).toBeGreaterThanOrEqual(link.box.left - 1);
      expect(link.text.right, detail).toBeLessThanOrEqual(link.box.right + 1);
      expect(link.box.right, detail).toBeLessThanOrEqual(VIEWPORT_320.width);
    }

    // Y los textos de enlaces vecinos no se tocan.
    for (let index = 1; index < links.length; index += 1) {
      const previous = links[index - 1];
      const current = links[index];
      if (!previous || !current) continue;
      expect(current.text.left, `${previous.label} → ${current.label}`).toBeGreaterThan(previous.text.right);
    }
  });

  for (const route of ROUTES) {
    test(`${route.path} sin datos`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: route.heading, level: 1 })).toBeVisible();
      await expectNoHorizontalOverflow(page, `${route.path} sin datos`);
    });

    test(`${route.path} con datos`, async ({ page }) => {
      await page.goto(route.path);
      // La base queda abierta cuando la primera consulta termina de resolverse.
      await expect(page.getByRole('heading', { name: route.heading, level: 1 })).toBeVisible();
      await seedLocalDatabase(page, conDatos);
      await page.reload();
      await expect(page.getByRole('heading', { name: route.heading, level: 1 })).toBeVisible();
      await expect(page.getByText(route.loaded).first()).toBeVisible();
      await expectNoHorizontalOverflow(page, `${route.path} con datos`);

      if (route.path === '/configuracion') {
        // La vista de tabla de "Distribución" es la más ancha de la ruta.
        await page.getByRole('button', { name: 'Ver como tabla' }).click();
        await expect(page.getByRole('table', { name: 'Distribución del presupuesto' })).toBeVisible();
        await expectNoHorizontalOverflow(page, `${route.path} con datos, vista de tabla`);
      }
    });
  }
});
