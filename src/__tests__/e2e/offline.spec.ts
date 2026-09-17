import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * SPEC-08 — PWA, funcionamiento sin conexión y despliegue.
 *
 * Corre contra `npm run build && npm run preview` (playwright.config.ts), es decir,
 * contra el artefacto que se despliega, con el service worker real y con los
 * encabezados de netlify.toml servidos por `vite preview`.
 *
 * Los escenarios sin conexión y el de actualización van sólo en Chromium: el
 * WebKit de Playwright no soporta `context.setOffline` con service worker
 * ("WebKit encountered an internal error"); iPhone se revisa a mano (SPEC-08 › Pruebas).
 */

const DIST = join(process.cwd(), 'dist');
const ROOT = process.cwd();

const CSP = /Content-Security-Policy = "([^"]+)"/.exec(readFileSync(join(ROOT, 'netlify.toml'), 'utf8'))?.[1];

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
const isoNow = '2026-01-01T00:00:00.000Z';

/** Un presupuesto en el mes actual, para que el plan en PDF tenga qué exportar. */
const conPresupuesto: SeedPayload = {
  categories: [
    {
      id: 'pwa-cat-hogar',
      name: 'Hogar PWA',
      colorKey: 'slate',
      order: 50,
      archivedAt: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  budgetVersions: [
    {
      id: `pwa-cat-hogar-${monthKey}`,
      categoryId: 'pwa-cat-hogar',
      effectiveFrom: monthKey,
      amountCents: 700000,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ],
  transactions: [],
};

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

/** Errores de consola, excepciones y violaciones de CSP (estas últimas no siempre llegan a la consola). */
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    // Los blobs de descarga no son solicitudes de red.
    if (!request.url().startsWith('blob:')) {
      errors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText})`);
    }
  });
  void page.exposeFunction('__reportCspViolation', (detail: string) => {
    errors.push(`csp: ${detail}`);
  });
  void page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      const report = `${event.violatedDirective} bloqueó ${event.blockedURI || event.sourceFile || '(inline)'}`;
      (window as unknown as { __reportCspViolation?: (d: string) => void }).__reportCspViolation?.(report);
    });
  });
  return errors;
}

function expectNoErrors(errors: string[]) {
  expect(errors, `La página reportó errores:\n${errors.join('\n')}`).toEqual([]);
}

/** Solicitudes de todo el contexto (página y service worker) a un origen que no sea el propio. */
function watchExternalRequests(context: BrowserContext): { external: string[]; total: () => number } {
  const external: string[] = [];
  let count = 0;
  context.on('request', (request) => {
    count += 1;
    const url = new URL(request.url());
    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url());
  });
  return { external, total: () => count };
}

/** Espera a que el service worker esté activado (el precache termina antes de activarse). */
async function waitForServiceWorker(page: Page) {
  const status = await page.evaluate(() =>
    navigator.serviceWorker.ready.then(
      (registration) =>
        new Promise<{ state: string; scriptURL: string }>((resolve) => {
          const worker = registration.active!;
          const report = () => resolve({ state: worker.state, scriptURL: worker.scriptURL });
          if (worker.state === 'activated') report();
          else worker.addEventListener('statechange', () => worker.state === 'activated' && report());
        }),
    ),
  );
  expect(status.state).toBe('activated');
  expect(status.scriptURL).toMatch(/\/sw\.js/);
}

async function capturarGasto(page: Page, monto: string, concepto: string) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();
  await page.fill('input[placeholder="$0.00"]', monto);
  await page.fill('input[name="concepto"]', concepto);
  await page.locator('[role="radiogroup"] [role="radio"]').first().click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText(/Guardado:/)).toBeVisible();
}

async function descargarExcel(page: Page) {
  await page.goto(`/visualizacion?mes=${monthKey}`);
  await expect(page.getByRole('heading', { name: 'Visualización', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Exportar a Excel' }).click();
  const dialog = page.getByRole('dialog', { name: 'Exportar a Excel' });
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar Excel' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`trazia-transacciones-${monthKey}.xlsx`);
  expect(statSync((await download.path())!).size).toBeGreaterThan(0);
  await expect(dialog).not.toBeVisible();
}

async function descargarPdf(page: Page) {
  await page.goto('/configuracion');
  await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible();
  const section = page.getByRole('region', { name: 'Plan en PDF' });
  const button = section.getByRole('button', { name: 'Descargar plan en PDF' });
  await expect(button).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await button.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`trazia-plan-${monthKey}.pdf`);
  const bytes = readFileSync((await download.path())!);
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
}

async function borrarTodoPorLaUI(page: Page) {
  const borrar = page.getByRole('region', { name: 'Borrar todos los datos' });
  await borrar.getByRole('button', { name: 'Borrar todos los datos' }).click();
  const dialog = page.getByRole('dialog', { name: 'Borrar todos los datos' });
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await dialog.getByLabel('Escribe BORRAR para confirmar').fill('BORRAR');
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  await expect(dialog).not.toBeVisible();
}

test.describe('Precache del build (SPEC-08)', () => {
  test('sw.js precachea todo dist, incluidos los chunks de exportación', async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Lee dist en Node; basta una vez.');

    const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
    const precached = [...sw.matchAll(/url:"([^"]*)",revision:(?:"[^"]*"|null)/g)].map((m) => decodeURI(m[1]!));
    expect(precached.length).toBeGreaterThan(0);
    expect(new Set(precached).size, 'entradas repetidas en el precache').toBe(precached.length);

    const files: string[] = [];
    const walk = (dir: string, prefix = '') => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, `${prefix}${name}/`);
        else files.push(`${prefix}${name}`);
      }
    };
    walk(DIST);

    const missing = files.filter((file) => file !== 'sw.js' && !precached.includes(file));
    expect(missing, 'archivos de dist fuera del precache').toEqual([]);

    // Criterio 2: sin estos dos chunks no se puede exportar en modo avión.
    expect(precached.find((url) => /^assets\/transactionsXlsx-.*\.js$/.test(url))).toBeTruthy();
    expect(precached.find((url) => /^assets\/budgetPdf-.*\.js$/.test(url))).toBeTruthy();

    const totalBytes = precached.reduce((sum, url) => sum + statSync(join(DIST, url)).size, 0);
    // Un cambio de dependencias que empuje el precache muy por encima debería notarse.
    expect(totalBytes).toBeLessThan(3 * 1024 * 1024);
    console.log(`precache: ${precached.length} entradas, ${(totalBytes / 1024).toFixed(1)} KiB`);
  });
});

test.describe('Sin conexión (SPEC-08, criterio 2)', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'setOffline con service worker sólo funciona en Chromium.');
  });

  test('en modo avión la app abre, captura, muestra Visualización y exporta Excel y PDF', async ({
    page,
    context,
  }) => {
    const errors = watchForErrors(page);

    // Primera carga con red: el service worker se instala y precachea el build.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();
    await waitForServiceWorker(page);
    await seedLocalDatabase(page, conPresupuesto);

    await context.setOffline(true);

    await capturarGasto(page, '250', 'Café sin conexión');

    await page.goto(`/visualizacion?mes=${monthKey}`);
    await expect(page.getByRole('heading', { name: 'Visualización', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tarjeta principal del mes' })).toContainText('$250.00');

    // Los chunks de ExcelJS y react-pdf salen del precache.
    const served: string[] = [];
    page.on('response', (response) => {
      if (/\/assets\/(transactionsXlsx|budgetPdf)-/.test(response.url())) {
        served.push(`${response.url()} fromServiceWorker=${response.fromServiceWorker()}`);
      }
    });

    await descargarExcel(page);
    await descargarPdf(page);

    expect(served.filter((line) => line.includes('transactionsXlsx'))).toHaveLength(1);
    expect(served.filter((line) => line.includes('budgetPdf-'))).toHaveLength(1);
    expect(served.every((line) => line.endsWith('fromServiceWorker=true')), served.join('\n')).toBe(true);

    await context.setOffline(false);
    expectNoErrors(errors);
  });

  test('el service worker no rompe respaldo, borrado y restauración (SPEC-07), también sin conexión', async ({
    page,
    context,
  }) => {
    const errors = watchForErrors(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();
    await waitForServiceWorker(page);

    await context.setOffline(true);

    await capturarGasto(page, '99', 'Respaldo sin conexión');

    await page.goto('/configuracion');
    await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible();
    const section = page.getByRole('region', { name: 'Datos y respaldo' });
    await expect(section).toContainText('8 categorías y 1 movimiento');

    const downloadPromise = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Descargar respaldo' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^trazia-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
    const path = (await download.path())!;
    expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject({ app: 'trazia' });

    await borrarTodoPorLaUI(page);
    await expect(section).toContainText('8 categorías y 0 movimientos');

    await section.getByLabel('Archivo de respaldo').setInputFiles(path);
    await section.getByTestId('respaldo-vista-previa').getByRole('button', { name: 'Restaurar' }).click();
    await page.getByRole('dialog', { name: 'Restaurar respaldo' }).getByRole('button', { name: 'Reemplazar' }).click();
    await expect(section).toContainText('Respaldo restaurado. Tus datos ya están actualizados.');
    await expect(section).toContainText('8 categorías y 1 movimiento');

    await page.goto(`/movimientos?mes=${monthKey}`);
    await expect(page.getByText('Respaldo sin conexión')).toBeVisible();

    await context.setOffline(false);
    expectNoErrors(errors);
  });
});

test.describe('Actualización (SPEC-08, criterio 3)', () => {
  test('una versión nueva muestra el aviso; "Actualizar" recarga con el service worker nuevo y sin perder datos', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'La API de service worker de Playwright es sólo de Chromium.');
    const errors = watchForErrors(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();
    await waitForServiceWorker(page);
    await capturarGasto(page, '120', 'Antes de actualizar');

    // Como en un uso real: la página siguiente ya abre controlada por el service worker.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();
    expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await expect(page.getByRole('status').filter({ hasText: 'nueva versión' })).toHaveCount(0);

    // Playwright no puede interceptar la descarga de sw.js, así que la "versión nueva"
    // se simula registrando la misma hoja con otra URL en el mismo scope: el navegador
    // la instala y la deja en espera exactamente igual que un despliegue con bytes nuevos.
    await page.evaluate(() => navigator.serviceWorker.register('/sw.js?v=2'));

    const aviso = page.getByRole('status').filter({ hasText: 'Hay una nueva versión disponible' });
    await expect(aviso).toBeVisible();
    await expect(aviso).toHaveText(/Hay una nueva versión disponible\s*·\s*Actualizar/);

    const loaded = page.waitForEvent('load');
    await aviso.getByRole('button', { name: 'Actualizar' }).click();
    await loaded;

    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();
    expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toMatch(/\/sw\.js\?v=2$/);
    await expect(page.getByRole('status').filter({ hasText: 'nueva versión' })).toHaveCount(0);

    // Los datos viven en IndexedDB: la actualización no los toca.
    await page.goto(`/movimientos?mes=${monthKey}`);
    await expect(page.getByText('Antes de actualizar')).toBeVisible();

    expectNoErrors(errors);
  });
});

test.describe('Privacidad de red y CSP (SPEC-08, criterio 4)', () => {
  test('ninguna solicitud sale a un origen distinto de localhost', async ({ page, context, browserName }) => {
    const requests = watchExternalRequests(context);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();
    if (browserName === 'chromium') await waitForServiceWorker(page);
    await seedLocalDatabase(page, conPresupuesto);

    await capturarGasto(page, '45', 'Sin terceros');
    await descargarExcel(page);
    await descargarPdf(page);
    await page.goto(`/movimientos?mes=${monthKey}`);
    await expect(page.getByText('Sin terceros')).toBeVisible();

    expect(requests.total()).toBeGreaterThan(5);
    expect(requests.external, 'solicitudes a terceros').toEqual([]);
  });

  test('la CSP de netlify.toml llega en el documento y no bloquea ninguna función', async ({ page }) => {
    expect(CSP, 'netlify.toml sin Content-Security-Policy').toBeTruthy();
    const errors = watchForErrors(page);

    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy']).toBe(CSP);
    expect(response?.headers()['x-content-type-options']).toBe('nosniff');
    expect(response?.headers()['referrer-policy']).toBe('no-referrer');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();
    await seedLocalDatabase(page, conPresupuesto);

    // Recorrido completo bajo CSP: captura, cuatro rutas, ambas exportaciones y respaldo.
    await capturarGasto(page, '10', 'Bajo CSP');
    await page.goto('/movimientos');
    await expect(page.getByRole('heading', { name: 'Movimientos', level: 1 })).toBeVisible();
    await descargarExcel(page);
    await descargarPdf(page);
    const section = page.getByRole('region', { name: 'Datos y respaldo' });
    const downloadPromise = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Descargar respaldo' }).click();
    await downloadPromise;

    expectNoErrors(errors);
  });
});

test.describe('Instalación en iOS (SPEC-08)', () => {
  test('manifest y metaetiquetas iOS', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();

    const meta = await page.evaluate(() => ({
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
      capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content'),
      statusBar: document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content'),
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
      touchIcon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
      manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
      inlineScripts: [...document.scripts].filter((script) => !script.src).length,
    }));
    expect(meta.viewport).toContain('viewport-fit=cover');
    expect(meta.capable).toBe('yes');
    expect(meta.statusBar).toBeTruthy();
    expect(meta.themeColor).toBe('#faf7f2');
    expect(meta.touchIcon).toBe('/icons/apple-touch-icon-180.png');
    expect(meta.manifest).toBe('/manifest.webmanifest');
    // Cualquier script inline chocaría con `script-src 'self'`.
    expect(meta.inlineScripts).toBe(0);

    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBe(true);
    const manifest = (await manifestResponse.json()) as {
      name: string;
      short_name: string;
      lang: string;
      display: string;
      start_url: string;
      theme_color: string;
      background_color: string;
      icons: Array<{ src: string; sizes: string; purpose?: string }>;
    };
    expect(manifest).toMatchObject({
      name: 'TRAZIA',
      short_name: 'TRAZIA',
      lang: 'es-MX',
      display: 'standalone',
      start_url: '/',
      theme_color: '#faf7f2',
      background_color: '#faf7f2',
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192' }),
        expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512' }),
        expect.objectContaining({ src: '/icons/icon-512-maskable.png', sizes: '512x512', purpose: 'maskable' }),
      ]),
    );
    for (const src of [...manifest.icons.map((icon) => icon.src), meta.touchIcon!]) {
      const icon = await request.get(src);
      expect(icon.ok(), src).toBe(true);
    }

    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toMatch(/Disallow: \//);
  });

  test('Chrome considera la app instalable (criterio 1)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Veredicto de instalabilidad del propio Chromium (CDP).');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();
    await waitForServiceWorker(page);

    const cdp = await page.context().newCDPSession(page);
    const manifest = await cdp.send('Page.getAppManifest');
    expect(manifest.errors).toEqual([]);

    // El contexto de Playwright es de incógnito, y ese es el único motivo admisible.
    // Un ícono inservible, un manifest roto o un service worker ausente aparecerían aquí.
    await expect
      .poll(async () => {
        const result = (await cdp.send('Page.getInstallabilityErrors')) as {
          installabilityErrors: Array<{ errorId: string }>;
        };
        return result.installabilityErrors.map((error) => error.errorId).filter((id) => id !== 'in-incognito');
      })
      .toEqual([]);
  });

  test('la barra inferior respeta el área segura de iOS', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Captura', level: 1 })).toBeVisible();

    const report = await page.evaluate(() => {
      const nav = document.querySelector('.bottom-nav')!;
      const rect = nav.getBoundingClientRect();
      // Las reglas con env() conservan su texto en el CSSOM aunque el valor resuelva a 0.
      const rulesWithSafeArea: string[] = [];
      const visit = (rules: CSSRuleList) => {
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule && rule.selectorText.includes('.bottom-nav')) {
            // `padding` con var()/env() no se descompone en longhands: se lee el texto de la regla.
            if (/padding[^;]*safe-area-inset-bottom/.test(rule.cssText)) rulesWithSafeArea.push(rule.selectorText);
          }
          if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
        }
      };
      for (const sheet of document.styleSheets) visit(sheet.cssRules);
      return {
        visible: getComputedStyle(nav).display !== 'none',
        bottom: rect.bottom,
        innerHeight: window.innerHeight,
        rulesWithSafeArea,
      };
    });

    expect(report.visible).toBe(true);
    // Pegada al borde inferior: el padding extra de env(safe-area-inset-bottom) crece hacia adentro.
    expect(Math.round(report.bottom)).toBe(report.innerHeight);
    expect(report.rulesWithSafeArea).toContain('.bottom-nav');
  });

  test('la invitación a instalar sólo aparece en Safari iOS fuera de standalone y se puede cerrar', async ({
    page,
    browserName,
  }) => {
    await page.goto('/configuracion');
    await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Datos y respaldo' })).toBeVisible();

    const card = page.getByRole('region', { name: 'Usar TRAZIA como app' });

    if (browserName !== 'webkit') {
      // Chromium de escritorio: no es Safari iOS.
      await expect(card).toHaveCount(0);
      return;
    }

    // El proyecto webkit emula un iPhone (agente de Safari iOS).
    await expect(card).toBeVisible();
    await expect(card).toContainText('Compartir › Agregar a pantalla de inicio');
    await card.getByRole('button', { name: 'Cerrar' }).click();
    await expect(card).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('region', { name: 'Datos y respaldo' })).toBeVisible();
    await expect(card).toHaveCount(0);
  });

  test('instalada (standalone) no muestra la invitación', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Sólo aplica al agente de Safari iOS.');
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    });
    await page.goto('/configuracion');
    await expect(page.getByRole('region', { name: 'Datos y respaldo' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Usar TRAZIA como app' })).toHaveCount(0);
  });
});
