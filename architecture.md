# Arquitectura — TRAZIA

## 1. Contexto

TRAZIA es una SPA estática y *local-first*: no hay backend. Todo el estado persiste en IndexedDB del dispositivo. Netlify solo sirve archivos estáticos. La base está pensada para empaquetarse en iOS con Capacitor en la fase 2 sin reescribir el dominio ni la UI.

```
┌───────────────────────── Navegador / WebView ─────────────────────────┐
│  UI (React)  ──►  hooks (useLiveQuery)  ──►  repositorios (Dexie)     │
│      │                                             │                  │
│      └──►  dominio puro (cálculos, validación) ◄───┘                  │
│      └──►  servicios: exportación (xlsx/pdf), respaldo, entrega       │
│                                            de archivos                │
│                         IndexedDB "trazia"                            │
└───────────────────────────────────────────────────────────────────────┘
        ▲ archivos estáticos + service worker (Netlify, sin API)
```

## 2. Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| Lenguaje | TypeScript en modo `strict` | Seguridad de tipos en cálculos financieros |
| UI | React | Ecosistema maduro y compatible con Capacitor |
| Build | Vite | Arranque y build rápidos; salida estática para Netlify |
| Ruteo | React Router | Pocas rutas, modo SPA |
| Persistencia | Dexie (IndexedDB) + `dexie-react-hooks` | Consultas reactivas: guardar actualiza todas las vistas sin estado global adicional |
| Validación | Zod | Un esquema por entidad para formularios, respaldo e importación |
| Gráficas en pantalla | Recharts | Responsive y legible; cada gráfica tiene una tabla alternativa accesible |
| Excel | ExcelJS (carga diferida) | Formato real: fechas, moneda, estilos, filtros |
| PDF | @react-pdf/renderer (carga diferida) | PDF vectorial con gráficas nativas (SVG) y maquetación flexible |
| PWA | vite-plugin-pwa (Workbox) | Uso sin conexión e instalación en iOS |
| Estilos | CSS Modules + variables CSS (`tokens.css`) | Identidad propia, sin framework pesado |
| Pruebas | Vitest, Testing Library, fake-indexeddb, Playwright | Unitarias, de componentes y E2E (Chromium + WebKit) |
| Calidad | ESLint (typescript-eslint, react-hooks, jsx-a11y), Prettier | Estilo consistente y accesibilidad estática |

Las versiones exactas quedan fijadas en `package-lock.json` al instalar (versión estable vigente). No se usan dependencias globales.

## 3. Estructura del repositorio

```
repo_trazia/
├─ CLAUDE.md                 reglas para agentes
├─ README.md
├─ .editorconfig  .gitignore  .nvmrc  .prettierrc  .env.example
├─ eslint.config.js  tsconfig.json  tsconfig.node.json
├─ vite.config.ts            (incluye configuración de Vitest y PWA)
├─ playwright.config.ts
├─ netlify.toml
├─ index.html
├─ public/                   íconos, apple-touch-icon, robots.txt
├─ docs/                     documentación y SPECS
├─ e2e/                      pruebas Playwright
└─ src/
   ├─ main.tsx
   ├─ app/                   App, router, layout (tab bar / riel), proveedores
   ├─ screens/
   │  ├─ capture/            Captura
   │  ├─ summary/            Visualización
   │  ├─ transactions/       Movimientos
   │  └─ settings/           Configuración (categorías, plan PDF, datos, privacidad)
   ├─ components/
   │  ├─ ui/                 Button, Field, MoneyInput, DateField, Dialog, Toast,
   │  │                      EmptyState, ProgressBar, MonthSwitcher, StatusBadge
   │  └─ charts/             DonutChart, BudgetBars, ChartDataTable
   ├─ domain/                lógica pura y sin dependencias de UI ni de DB
   │  ├─ types.ts
   │  ├─ money.ts            parseo, formato y aritmética en centavos
   │  ├─ dates.ts            fechas locales, MonthKey, rangos
   │  ├─ budget.ts           resolución de presupuesto vigente por mes
   │  ├─ summary.ts          resumen mensual y estados de avance
   │  ├─ categories.ts       normalización de nombres, colores
   │  ├─ seed.ts             plantilla genérica inicial
   │  └─ schemas.ts          esquemas Zod
   ├─ data/
   │  ├─ db.ts               definición Dexie y migraciones
   │  ├─ repositories/       categories, budgets, transactions, settings
   │  ├─ hooks/              useMonthSummary, useCategories, …
   │  ├─ backup.ts           exportar e importar JSON
   │  └─ storage.ts          persistencia (navigator.storage)
   ├─ services/
   │  ├─ export/             transactionsXlsx.ts, budgetPdf.tsx
   │  └─ files/deliverFile.ts  entrega de archivos (web: descarga; iOS: hoja de compartir)
   ├─ copy/strings.ts        textos de la interfaz centralizados (es-MX)
   ├─ styles/                tokens.css, global.css
   └─ test/                  setup y factories
```

**Reglas de dependencia (verificadas con ESLint `no-restricted-imports`):**
- `domain` no importa nada del proyecto.
- `data` importa solo de `domain`.
- `screens` y `components` no acceden a Dexie directamente, solo a través de `data/hooks` y `data/repositories`.

## 4. Modelo de datos

Base IndexedDB `trazia`, esquema versión 1.

```ts
type ID = string;           // crypto.randomUUID()
type ISODateTime = string;  // "2026-09-16T18:04:11.000Z"
type LocalDate = string;    // "2026-09-16"  (fecha local, sin zona horaria)
type MonthKey = string;     // "2026-09"
type Cents = number;        // entero seguro ≥ 0

interface Category {
  id: ID;
  name: string;                 // 1–40 caracteres, único (normalizado)
  colorKey: ChartColorKey;      // paleta fija de tokens
  order: number;                // orden definido por la persona usuaria
  archivedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface BudgetVersion {       // presupuesto vigente desde un mes
  id: ID;
  categoryId: ID;
  effectiveFrom: MonthKey;      // aplica de este mes en adelante
  amountCents: Cents;           // 0 = sin presupuesto
  createdAt: ISODateTime;
}

interface Transaction {
  id: ID;
  concept: string;              // 1–80 caracteres
  amountCents: Cents;           // 1 … 999 999 999
  categoryId: ID;
  date: LocalDate;              // ≤ hoy
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface AppSettings {         // registro único, key = "app"
  key: 'app';
  seededAt: ISODateTime | null;
  lastBackupAt: ISODateTime | null;
  persistenceRequested: boolean;
}
```

**Índices Dexie:**

| Tabla | Índices |
|---|---|
| `categories` | `id, order, archivedAt` |
| `budgetVersions` | `id, categoryId, &[categoryId+effectiveFrom]` |
| `transactions` | `id, date, categoryId, [categoryId+date]` |
| `settings` | `key` |

**Migraciones:**
- Cada cambio de esquema incrementa la versión Dexie con su función `upgrade`.
- `schemaVersion` también se incluye en el respaldo JSON.

## 5. Reglas de cálculo (fuente única: `src/domain`)

1. **Presupuesto de una categoría en el mes M:** el `amountCents` de la versión con el mayor `effectiveFrom` que sea ≤ M. Si no existe ninguna versión, el presupuesto es 0.
2. **Gastado de una categoría en el mes M:** la suma de `amountCents` de las transacciones de esa categoría con fecha entre `M-01` y el último día de M.
3. **Disponible:** `presupuesto − gastado`. Si es menor que 0, se muestra como “por encima de lo planeado” con el valor absoluto.
4. **Estado de avance** (solo si el presupuesto es mayor que 0):

   | Condición | Estado |
   |---|---|
   | `gastado / presupuesto < 0.8` | `en-plan` |
   | `0.8 ≤ gastado / presupuesto ≤ 1` | `cerca` |
   | `gastado / presupuesto > 1` | `por-encima` |
   | presupuesto = 0 y gastado > 0 | `sin-presupuesto` |
   | presupuesto = 0 y gastado = 0 | `sin-actividad` |

5. **Categorías que aparecen en el mes M:** las que estaban activas en M (no archivadas, o archivadas en un mes posterior a M) y cualquier categoría con gasto en M.
6. **Totales del mes:**
   - total presupuestado = suma de presupuestos de las categorías visibles;
   - total gastado = suma de **todas** las transacciones del mes;
   - disponible total = presupuestado − gastado.
7. **Aritmética:** solo con enteros en centavos. Los porcentajes se redondean al entero más cercano únicamente al mostrarlos.

## 6. Flujo reactivo

- Los repositorios escriben en Dexie.
- Las pantallas leen con `useLiveQuery`, que reemite cuando cambian las tablas observadas.
- Por eso, guardar, editar o eliminar un movimiento actualiza Captura, Visualización, Movimientos y Configuración sin recargar la página ni duplicar estado.

## 7. Seguridad y privacidad

- **Sin red de terceros.** Encabezados en `netlify.toml`:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' data:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`;
    - `'wasm-unsafe-eval'` y `data:` en `connect-src` existen sólo por `@react-pdf/renderer` v4: su motor de maquetado (Yoga) va compilado a WebAssembly e incrustado como `data:` URL, y la app hace `fetch` de ese `data:` y luego `WebAssembly.instantiate`. Es el ajuste mínimo (aprobado, T-090): `'wasm-unsafe-eval'` permite compilar WebAssembly pero **no** `eval`, `new Function` ni ningún otro `eval` de JavaScript (eso exigiría `'unsafe-eval'`); `data:` en `connect-src` permite leer bytes que ya vienen en el bundle, **no** contactar ningún host. Siguen bloqueados los scripts inline y de otros orígenes, y cualquier `fetch`, `XMLHttpRequest` o WebSocket fuera de `'self'`.
  - `Referrer-Policy: no-referrer`;
  - `X-Content-Type-Options: nosniff`;
  - `Permissions-Policy` con cámara, micrófono, geolocalización y pagos desactivados;
  - `X-Robots-Tag: noindex`.
- **Sin analítica, cookies ni almacenamiento remoto.** Las tipografías son del sistema, sin fuentes externas.
- **Datos sin cifrar en IndexedDB.** La protección depende del bloqueo del dispositivo. El cifrado con Face ID se evalúa en la fase 2 (nativa).
- **Respaldos en JSON en texto plano.** La interfaz lo advierte antes de descargarlos.
- **Entradas seguras.** Todo se valida con Zod antes de escribir. React escapa el texto y no se usa `dangerouslySetInnerHTML`.
- **Persistencia.** `navigator.storage.persist()` se solicita tras el primer movimiento guardado.

## 8. Rendimiento

- ExcelJS y @react-pdf/renderer se cargan con `import()` solo al exportar.
- Presupuesto del bundle inicial: ≤ 250 KB gzip de JavaScript.
- Las consultas mensuales usan el índice `date` con un rango `between`. Se espera un buen desempeño hasta ~50 000 movimientos.

## 9. Preparación para iOS (fase 2)

- **Entrega de archivos:** `services/files/deliverFile.ts` abstrae la entrega. En web usa un Blob con descarga; en Capacitor usará Filesystem + Share, porque WKWebView no admite descargas con `<a download>`.
- **Almacenamiento:** los repositorios aíslan el almacenamiento, de modo que se puede migrar a SQLite nativo si es necesario.
- **Interfaz:** áreas seguras (`env(safe-area-inset-*)`), objetivos táctiles de 44 pt o más y campos de 16 px o más para evitar zoom.
