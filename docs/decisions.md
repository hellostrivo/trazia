# Registro de decisiones — TRAZIA

Estados: ✅ validada por la persona usuaria · 🟡 propuesta técnica (decisión menor, documentada) · ⏳ pendiente.

## Validadas (16 sep 2026)

| ID | Decisión | Estado |
|---|---|---|
| D-001 | Raíz local `~/Desktop/TRAZIA/repo_trazia`; remoto `github.com/hellostrivo/trazia` | ✅ |
| D-002 | Datos solo en el dispositivo (IndexedDB) con respaldo manual en JSON. Sin cuentas ni nube | ✅ |
| D-003 | Gastos fijos y suscripciones: fase 2 | ✅ |
| D-004 | Sin ingresos en el MVP; se compara gasto contra presupuesto | ✅ |
| D-005 | Periodo: mes calendario | ✅ |
| D-006 | Fecha de captura: hoy por defecto, editable (no se permiten fechas futuras) | ✅ |
| D-007 | Plan de gastos se exporta en PDF | ✅ |
| D-008 | Moneda: solo MXN en el MVP | ✅ |
| D-009 | Arranque con categorías genéricas editables, sin montos | ✅ |
| D-010 | Identidad: azul-pizarra, neutros cálidos, acento verde salvia; tipografía del sistema | ✅ |
| D-011 | No se usan categorías ni montos de los Excel de referencia | ✅ |

## Propuestas técnicas (menores)

| ID | Decisión | Motivo |
|---|---|---|
| T-001 | React + TypeScript + Vite + Dexie + Zod + Recharts | Ver `architecture.md` |
| T-002 | Dinero en centavos enteros | Evita errores de punto flotante |
| T-003 | Presupuesto versionado por mes (`BudgetVersion`) | Cambiar un presupuesto no altera meses anteriores |
| T-004 | Categorías con movimientos o presupuestos se archivan en lugar de borrarse | Nunca se pierde historial |
| T-005 | Nombres de categoría únicos, sin distinguir mayúsculas ni acentos | Evita el problema de “Gastos Médicos” contra “Gastos médicos” del Excel |
| T-006 | Umbral “cerca del límite” al 80 % | Aviso temprano y neutral |
| T-007 | “Por encima de lo planeado” en tono ocre, siempre acompañado de texto (nunca rojo ni solo color) | Lenguaje sin culpa y accesible |
| T-008 | Se agrega la sección **Movimientos** (editar y eliminar) | Sin ella no se pueden corregir errores |
| T-009 | En Captura, la categoría se elige con botones (chips) en lugar de un desplegable | Un solo toque |
| T-010 | Tras guardar se limpian monto, concepto y categoría; la fecha elegida se conserva mientras se permanece en la pantalla | Facilita capturar varios tickets de un mismo día anterior sin categorizar por inercia |
| T-011 | Eliminar un movimiento es definitivo, con opción “Deshacer” durante 6 s | Simple y seguro |
| T-012 | En Configuración, las gráficas muestran el gasto **planeado** (distribución del presupuesto); el gasto real vive en Visualización. Ambas usan los mismos componentes | Sin duplicar código ni información |
| T-013 | Excel de transacciones: mes seleccionado o todo el historial; incluye fila de total | Útil y equivalente a la pestaña Transacciones |
| T-014 | PDF con @react-pdf/renderer y gráficas vectoriales; fuente Helvetica integrada (cubre acentos y ñ) | Sin fuentes externas |
| T-015 | Tema claro y oscuro según el sistema | Comodidad en iOS |
| T-016 | Navegación con los nombres Captura · Visualización · Movimientos · Configuración; barra inferior en móvil, riel lateral en escritorio | Respeta los nombres pedidos |
| T-017 | npm como gestor de paquetes | No requiere instalar herramientas globales |
| T-018 | Sitio con `noindex` | App personal, no debe aparecer en buscadores |
| T-019 | Recordatorio discreto de respaldo si hay movimientos y el último respaldo tiene más de 30 días | Mitiga la pérdida de datos local sin presionar |
| T-020 | Importar un respaldo **reemplaza** todos los datos (no combina); pide confirmación y ofrece descargar antes el respaldo actual | Evita duplicados y conflictos |
| T-021 | Límite de 50 categorías | Mantiene la interfaz legible |
| T-022 | La Visualización permite navegar a meses pasados, pero no a meses futuros | No hay movimientos futuros |
| T-023 | Cobertura de `src/domain` con umbral objetivo de ≥90% según SPEC-01 | La validación del dominio debe ser explícita y mantener riesgo bajo |

## Supuestos

- La persona usuaria trabaja en macOS (Escritorio = `~/Desktop`). En Windows, la ruta equivalente es `%USERPROFILE%\Desktop\TRAZIA\repo_trazia`.
- La zona horaria es la del dispositivo.
- La cuenta `hellostrivo` de GitHub se usa por decisión de la persona usuaria. El repositorio `trazia` es independiente de Strivo.

## Auditoría de cobertura (16 sep 2026)

- Cobertura final de `src/domain`: 95.96%, superando el objetivo del SPEC-01 (≥90%).
- `src/domain/types.ts` quedó excluido del cálculo de cobertura porque contiene solo definiciones de tipos y no código ejecutable.
- En `src/domain/money.ts`, la rama de "suma fuera de rango" (`linea 61`) es código defensivo muerto: el valor se rechaza antes por Zod en `centsSchema`, así que no es alcanzable con datos válidos. Se revisará si cambia el orden de validación.
- En `src/domain/seed.ts`, las ramas defensivas de `makeDefaultSettings` quedan sin cubrir por decisión explícita, no por descuido; la semilla se valida a través del repositorio y la función de defaults es un valor neutral, estable y no funcionalmente crítico para el cálculo del dominio.

## SPEC-05 — Movimientos (16 sep 2026)

| ID | Decisión | Motivo |
|---|---|---|
| T-024 | ~~La lista lee **todos** los movimientos con `listTransactions()` y filtra el mes en memoria~~ **Revertida el 16 sep 2026 (bloque de estabilización, tarea 4).** Movimientos usa `listTransactionsByMonth(selectedMonth)` | Era un rodeo al defecto de `useLiveQuery` con `deps []`. Corregido el hook, el rodeo sobra y contradecía SPEC-01. Ver T-036. |
| T-025 | `restoreTransaction()` se añadió a `src/data/repositories/transactions.ts` | `upsertTransaction()` recalcula `createdAt` cuando el registro ya no existe, así que no puede cumplir el criterio 2 de SPEC-05 (mismo `id` y `createdAt`). Es una función nueva; no se modificó ninguna existente. |
| T-026 | Las validaciones de edición se apoyan en las primitivas del dominio (`parseMoneyInput`, `today()`, `transactionInputSchema`) y en los mismos mensajes de SPEC-03 | SPEC-03 dejó su validación en línea dentro de `Captura.tsx`; extraerla habría modificado un archivo de un SPEC anterior. Si se extrae más adelante, `validateMovimiento` debe pasar a usar esa función compartida. |
| T-027 | El foco inicial, la trampa de foco y la devolución del foco a la fila se implementaron en `EditarDialog` y en la página, no en `components/Dialog.tsx` | El `Dialog` de SPEC-00 sólo cierra con Esc. Conviene subirlo al componente compartido cuando se pueda tocar SPEC-00. |
| T-028 | Paginación incremental de 200 filas por bloque con `slice` y estado local | Criterio 3 de SPEC-05; se descarta una librería de virtualización para no añadir dependencias. |
| T-029 | La lista se pinta con tokens CSS en estilos en línea, sin clases nuevas en `global.css` | `global.css` pertenece a SPEC-00 y queda fuera del alcance de SPEC-05. |
| T-030 | `playwright.config.ts` pasa a `testDir: './src'` con `testMatch` explícito | Las pruebas E2E de SPEC-05 viven en `src/__tests__/e2e/`, fuera del `testDir` anterior. **Ampliada en la tarea 1 del bloque de estabilización:** ahora `testMatch` registra `e2e/*.spec.ts` y `__tests__/e2e/*.spec.ts`, sin listas a mano. |

### Corrección fuera de alcance

- `listBudgets()` ordenaba por `effectiveFrom`, que **no** es un índice de `budgetVersions` (sólo existe el compuesto `[categoryId+effectiveFrom]`). Dexie lanzaba `SchemaError` en cada carga, así que Visualización y Configuración fallaban siempre en tiempo de ejecución. Se ordena en memoria. Sin esta corrección, la prueba E2E exigida por SPEC-05 no podía pasar.

### Defectos detectados y **no** corregidos (fuera de alcance)

Los dos se corrigieron en el bloque de estabilización del 16 sep 2026; se conservan aquí como registro de cuándo se detectaron.

- ~~`TablaDetalle` (SPEC-04) llama a `formatMXN(summary.totalAvailableCents)` en la fila de totales sin proteger el caso negativo.~~ Corregido en la tarea 3.
- ~~Las pruebas E2E `captura.spec.ts`, `configuracion.spec.ts` y `visualizacion.spec.ts` nunca se ejecutaron, y `/captura` apuntaba al `AppShell` de demostración.~~ Corregido en las tareas 1 y 2.

## Bloque de estabilización (16 sep 2026)

### Por qué `validate` pasaba en verde con la app rota

Las cuatro pantallas estaban implementadas y con pruebas unitarias en verde, pero la app **no arrancaba bien en ejecución**. La validación no lo veía por tres huecos que se tapaban entre sí:

1. **Las pruebas E2E no se ejecutaban.** `playwright.config.ts` tenía `testDir: './src/e2e'`, pero las pruebas por SPEC se escribieron en `src/__tests__/e2e/`. Playwright registraba 3 de 16. Las otras 13 eran archivos que nadie corría: pasaban el `typecheck` y el `lint`, así que parecían parte de la suite.
2. **`validate` no incluía los E2E.** Aunque se hubieran registrado, `npm run validate` solo corría `typecheck`, `lint`, `test` y `build`. Ninguno de esos cuatro abre la aplicación.
3. **Las pruebas unitarias montan componentes, no la aplicación.** Renderizan `TablaDetalle` o `Movimientos` con datos inyectados, nunca `App` con sus rutas ni `main.tsx` con su arranque. Por eso nadie notó que `/captura` apuntaba a una maqueta, que `ensureSeedCategories()` no se llamaba desde ningún sitio, o que `listBudgets()` consultaba un índice inexistente.

En resumen: la cobertura medía las piezas, no el ensamblaje. Un defecto que solo aparece al conectar las piezas era invisible por construcción.

### Qué cambió para que no se repita

| ID | Decisión | Motivo |
|---|---|---|
| T-031 | `npm run validate` termina con `npm run test:e2e` | Orden: `typecheck → lint → test → build → e2e`, de lo más barato a lo más caro. Una app rota ya no puede pasar como verde. Tarda ~18 s en total (E2E ~9 s), así que no hace falta partirlo en un `validate:quick`. |
| T-032 | `src/__tests__/e2e/smoke.spec.ts` es prueba de humo permanente | Abre las cuatro rutas, escucha `console.error` y `pageerror`, y verifica que no aparezca el `ErrorBoundary`. Cubre base vacía con la semilla completa, un mes por encima del plan y el salto a un mes sin datos. Se verificó reintroduciendo los cuatro defectos uno a uno: la prueba falla con cada uno. |
| T-033 | La semilla corre en `main.tsx`, antes del render | `ensureSeedCategories()` existía desde SPEC-01 y estaba probada en integración, pero ningún punto de arranque la llamaba. Una instalación nueva abría Captura sin categorías. |
| T-034 | `/` es la URL canónica de Captura y `/captura` redirige ahí | SPEC-03 define Captura en `/`. El `NavLink` a `/` necesita `end`, o la sección aparece activa en todas las pantallas. |
| T-035 | `Toast` acepta `action?: { label, onAction }` y pinta el botón dentro de la región `aria-live` | El botón "Deshacer" vivía en un overlay flotante aparte, en Captura y en Movimientos. En Captura el propio toast lo tapaba y era **inpulsable**. SPEC-03 y T-011 describen un solo elemento. |
| T-036 | `useLiveQuery(query, deps)` acepta dependencias; `deps` por omisión es `[]` | Con `deps []` fijas, Dexie memoiza el querier del primer render y una consulta por mes nunca se vuelve a ejecutar. El valor por omisión conserva el comportamiento de las llamadas sin parámetros, y hay una prueba que lo fija. |
| T-037 | En Visualización y Movimientos, el **estado** es la fuente de verdad del mes y un efecto sincroniza la URL | Visualización navegaba desde `changeMonth` mientras un efecto hacía el camino inverso: los dos se pisaban y el mes oscilaba indefinidamente. |
| T-038 | El signo de una diferencia se resuelve en presentación, no en `formatMXN` | `formatMXN` guarda el contrato "centavos no negativos" con `centsSchema`, compartido con `sumCents`, `centsToNumber` y `safeCents`. `availableCents` está tipado con signo a propósito. `formatDisponible()` aplica la regla de SPEC-04: texto ocre "Por encima de lo planeado: $X" (T-007). |

### Anotado, sin corregir

- **`ResumenBrieve` (SPEC-03) está incompleto.** Muestra "Septiembre: $X gastado"; el SPEC pide "Septiembre: $X de $Y planeado" con barra de progreso y enlace a Visualización. Se corrigió únicamente el mes equivocado (`new Date('2026-09-01')` se interpreta en UTC y en husos negativos cae al mes anterior); el resto es implementación pendiente de SPEC-03, no un defecto de estabilidad.
- **`formatMXN` no distingue "monto" de "diferencia" en el tipo.** Hoy la disciplina depende de que cada punto de presentación se acuerde de usar `formatDisponible()`. Un tipo `SignedCents` distinto de `Cents` lo haría imposible de olvidar, pero es un cambio de dominio con alcance propio.
- **Las validaciones de captura siguen en línea dentro de `Captura.tsx`.** `validateMovimiento` (SPEC-05) reusa las primitivas del dominio y repite los mensajes. Cuando se extraigan a un módulo compartido, hay que apuntar los dos sitios ahí. Ver T-026.
- **`useLiveQuery` nunca rellena `error`.** `dexie-react-hooks` relanza los errores durante el render para que los capture un `ErrorBoundary`, así que el campo `error` que devuelve el hook siempre es `null`. El estado "Error: toast neutral" de SPEC-05 no se puede alimentar desde ahí tal como está.

## SPEC-06 — Exportaciones (16 sep 2026)

| ID | Decisión | Motivo |
|---|---|---|
| T-039 | ExcelJS 4.4 y @react-pdf/renderer 4.9 se cargan **sólo** con `import()` desde `ExportarExcelDialog` y `PlanPdfSection`; los servicios `services/export/*` los importan de forma estática | Criterio 6. Rollup separa `transactionsXlsx-*.js` (940 kB) y `budgetPdf-*.js` (1.25 MB) del chunk inicial, que pasó de 419.33 kB a 424.37 kB (+5 kB de UI). Verificado buscando `exceljs`, `jszip`, `react-pdf`, `PDFDocument`, `fontkit` y `Helvetica` en el chunk inicial: 0 coincidencias. |
| T-040 | `vite.config.ts` añade `optimizeDeps.include: ['exceljs', '@react-pdf/renderer']` | Como sólo se importan dinámicamente, Vite no los descubre al arrancar el servidor de desarrollo; la primera exportación disparaba una re-optimización y **una recarga de página a mitad de la descarga**. Los E2E fallaban en Chromium con varios workers. No afecta al build de producción ni a los chunks. |
| T-041 | Las fechas del Excel se construyen en UTC (`Date.UTC(y, m-1, d)`) | ExcelJS calcula el número de serie desde el instante UTC. Con fechas locales, en husos negativos el serie llevaba fracción (hora) y en el límite podía caer al día anterior. Así el serie es entero: `46266` = 01/09/2026. |
| T-042 | Metadatos del libro: `title` "TRAZIA — Transacciones", `creator` y `lastModifiedBy` = "TRAZIA" | ExcelJS escribe `Unknown` como creador si se deja vacío. El nombre de la app no es un dato personal; se comprobó en `docProps/core.xml`. |
| T-043 | Sin movimientos en el alcance, el servicio escribe `0` en la fila Total en lugar de `=SUM()` | `SUM(D2:D1)` es un rango invertido y `SUM(D2:D2)` sería circular. La UI ya deshabilita el botón; es sólo robustez del servicio. |
| T-044 | La protección contra fórmulas cubre exactamente `=`, `+`, `-`, `@` con apóstrofo literal en el valor | Es lo que pide el SPEC. El apóstrofo viaja como parte del texto (`'=HYPERLINK(...)`, celda tipo `t="s"`), así que Excel y Numbers lo muestran tal cual y nunca lo evalúan. Queda anotado que OWASP también lista tabulador y retorno de carro; no se añadieron para no ampliar el alcance. |
| T-045 | El PDF se construye desde `buildMonthSummary({ transactions: [] })` con las categorías activas, y `buildBudgetPdfData` sólo lee `budgetCents` | Cumple la regla de arquitectura (el servicio recibe datos del dominio, no toca la DB) y hace imposible que un gasto real entre al documento (T-012). Los totales usan el mismo `resolveBudget` que Configuración (criterio 5). |
| T-046 | Porcentajes del PDF como enteros con `Math.round`, igual que `ChartDataTable` | Criterio 5: coincidir con Configuración. Pueden no sumar 100 exactamente; la fila de total imprime "100%" fijo. |
| T-047 | La dona de distribución sigue **una sola regla** en Configuración y en el PDF: las 6 categorías de **mayor presupuesto** son las principales, el resto se suma en "Otras", y una categoría con $0 no ocupa lugar en ninguna. Vive en `src/domain/distribution.ts` (`groupDonutSlices`) y la usan `DonaChart` y `buildBudgetPdfData` | `DonaChart` (SPEC-02) tomaba las 6 primeras en orden configurado, incluidas las de $0, así que con datos reales (por ejemplo, "Hogar" con $0 en el primer lugar, o 8 categorías con presupuesto en un orden distinto al de monto) las dos donas agrupaban "Otras" de forma distinta y rompían el criterio 5 de SPEC-06. SPEC-02 y SPEC-06 dicen "6 principales + Otras", no "las 6 primeras". `donutConsistency.test.tsx` compara la leyenda de `DonaChart` con `donut` del PDF con 9 categorías, una con $0 y montos desordenados; se verificó que falla con la regla anterior. |
| T-048 | Colores del PDF fijados en `budgetPdfData.ts`/`budgetPdf.tsx` con los valores hex de `tokens.css` (tema claro). `budgetPdfData.test.ts` comprueba que `OTHERS_COLOR` sea idéntico a `--color-graph-otros` en `tokens.css` y distinto de los 10 colores de categoría | react-pdf no lee CSS. Fijar los hex garantiza el tema claro aunque el sistema esté en oscuro, y la prueba impide que el token y la constante se desincronicen. |
| T-049 | `deliverFile` revoca la URL con `setTimeout(…, 1000)` en lugar de hacerlo en el mismo tic | Safari cancela la descarga si la URL del blob se revoca justo después del `click()`. |
| T-050 | El botón "Exportar a Excel" también aparece en el estado vacío de Visualización | Un mes sin movimientos no impide exportar "Todo el historial". Con el mes seleccionado y sin datos, el diálogo deshabilita la descarga con la nota del SPEC. |
| T-051 | `configuracion.spec.ts` (SPEC-02) acota el selector de mes al grupo "Presupuesto de" | Usaba `button:has-text("←")` a nivel de página; con el segundo selector de "Plan en PDF" resolvía a dos elementos y fallaba en modo estricto. |

| T-052 | El grupo agregado de las tres donas (Configuración, Visualización y PDF) se llama **"Otras categorías"**, definido una sola vez como `OTHERS_LABEL` en `src/domain/distribution.ts` | "Otras" difería en una letra de la categoría "Otros" de la semilla: cuando "Otros" está entre las principales y además hay grupo agregado, los dos aparecen juntos en la leyenda y eran indistinguibles de un vistazo. Medido a 320px: 129px en `DonaChart` y 120px en `DonaGasto`, una línea, sin elipsis; en el PDF la columna de leyenda mide 352pt y el texto ~75pt. |
| T-053 | `--color-graph-otros` pasa de `#b8b1a6` a **`#a5b3c4`** (gris frío), y `DonaChart` y `DonaGasto` lo usan para el grupo agregado en lugar de `stone` | En la web el agregado compartía color con la categoría "Otros" (`stone`, `#8c8279`); en el PDF era otro gris cálido a ΔE 17.6. El nuevo valor está a ΔE 24.2 de `stone` (cambia de cálido a frío, además de más claro) y a ≥26 de los otros nueve colores de la paleta; contraste 2.0:1 sobre el fondo claro y 8.4:1 sobre el oscuro. `seed.ts` no se toca: la semilla corre una vez y no arreglaría instalaciones existentes. |
| T-054 | En el PDF, los títulos "Presupuesto por categoría" y "De mayor a menor" van sueltos bajo `Page` con `minPresenceAhead={120}`, no dentro de su sección | react-pdf nunca salta de página por el primer hijo de un contenedor (`breakingImprovesPresence`), así que dentro de la sección el título quedaba huérfano al pie con dos filas sueltas. Como hermanos de página, el salto funciona y con 50 categorías (máximo de SPEC-02) las barras siguen partiéndose por filas (4 páginas). |
| T-055 | Los contenedores de página usan `minmax(0, 1fr)`: `.app-layout` en móvil, `.stack`, `.categorias-lista`, `.categorias-list-container` y la figura/leyenda de `DonaGasto`. `.page-header` envuelve (`flex-wrap`) | Bloque de corrección previo a SPEC-07. `1fr` a secas y la columna implícita de un grid valen `minmax(auto, 1fr)`: su mínimo es el min-content del hijo más ancho, así que el encabezado (h1 + selector de mes, 555px en Configuración) empujaba `main` y el body a 587px en 320px, incumpliendo el criterio 3 de SPEC-00 desde SPEC-02/04. Con 0 de mínimo el contenido ancho cabe o hace scroll dentro de su tarjeta y nunca empuja el body. |
| T-056 | Adaptaciones de Configuración solo bajo el breakpoint móvil existente (767px): el selector de mes envuelve con controles a todo el ancho, los totales se apilan, las cuatro acciones de cada categoría pasan bajo el nombre, la fila de barras se apila (etiqueta / barra / valor), y `<figure>` pierde sus 40px laterales por defecto. La tabla de "Distribución" va en un envoltorio con `overflow-x: auto` | Ninguno de esos bloques cabe en 240px (ancho útil de una tarjeta a 320px): acciones ≈300px, fila de barras 120px + 150px fijos, "$23,500.00" a 28px junto a "Categorías con presupuesto", tabla ≈374px. No se añadió un segundo breakpoint para no introducir un punto de corte nuevo; escritorio y tableta conservan las columnas originales (verificado con captura a 1280px). |
| T-057 | `src/e2e/app.spec.ts` mide el desbordamiento horizontal a 320px en las cuatro rutas, sin datos y con datos (nombres largos y montos de cinco cifras), más la vista de tabla de Configuración; al fallar lista los elementos que sobresalen y ningún ancestro recorta | El E2E de SPEC-00 solo miraba `/` a 375px, por eso la regresión pasó dos SPEC sin verse. Se verificó que la prueba falla con el CSS anterior (Configuración 587px, Visualización 368/466px, Movimientos 365px). Los elementos `position: fixed` no cuentan en `scrollWidth`, así que la barra inferior queda fuera de esta medición. |
| T-058 | Por debajo de 360px las etiquetas de la barra inferior bajan a 12px (`--font-size-12`, token nuevo) con padding lateral de 4px; nombres completos, sin abreviar ni iconos | Decisión de la persona usuaria. A 14px las cuatro etiquetas suman ~312px y se tocaban a 320px; a 12px caben (cajas de 50/73/71/78px). Objetivos táctiles medidos en Chromium y WebKit a 320px: 50×44, 73×44, 71×44 y 78×44 (el `min-height: var(--touch-target)` fija los 44px). A 360px vuelve a 14px. `app.spec.ts` comprueba a 320px las cuatro etiquetas completas, texto dentro de su enlace, sin solaparse y ≥44×44; falla con el CSS anterior. |

### Anotado, sin corregir

- ~~A 320px de ancho, Configuración (587px) y Visualización (368px) desbordan horizontalmente.~~ Corregido en T-055/T-056; Movimientos también desbordaba (365px). Las cuatro rutas miden 320px.
- ~~A 320px las etiquetas de la barra inferior se tocan.~~ Corregido en T-058.
- Vite avisa de chunks mayores de 500 kB en el build (`transactionsXlsx`, `budgetPdf`). Es el comportamiento deseado: son diferidos. Si el aviso molesta, `build.chunkSizeWarningLimit` lo silencia; no se tocó por estar fuera de alcance.
- ExcelJS entra por su bundle de navegador (`dist/exceljs.min.js`, con polyfills propios); es la razón del peso del chunk. La alternativa `xlsx-js-style` sigue documentada en el SPEC.
- Las pruebas de `src/__tests__/export/` que generan archivos corren con `// @vitest-environment node` porque el `Blob` de jsdom no implementa `arrayBuffer()`.

## SPEC-07 — Respaldo, restauración y privacidad · bloque A (16 sep 2026)

Fuera de este bloque, por instrucción de la persona usuaria: recordatorio de respaldo (punto 4) y borrado total (punto 5).

| ID | Decisión | Motivo |
|---|---|---|
| T-059 | `importBackup` reemplaza en **una** transacción `rw` sobre las cuatro tablas (`clear` × 3 → `bulkAdd` × 3 → `put` de settings). La validación completa (`backupFileSchema`) se repite dentro de `importBackup` antes de abrir la transacción, aunque la UI ya validó | Criterio 3. Dentro de la transacción sólo hay escrituras; cualquier rechazo (incluido el índice único `[categoryId+effectiveFrom]`) aborta y Dexie revierte. `backup.integration.test.ts` inyecta un fallo en `db.transactions.bulkAdd` (a mitad, con categorías ya reescritas) y otro en `db.settings.put` (última escritura) y compara la foto completa de la base antes y después; también fuerza una violación del índice único saltándose la validación. Repetir la validación cuesta milisegundos y hace imposible que un llamador se salte el paso 2. |
| T-060 | `bulkAdd` en lugar de `bulkPut` al restaurar | Un ID repetido que se colara fallaría en vez de sobrescribir en silencio; con `clear` previo, `put` no aporta nada. |
| T-061 | Integridad referencial e IDs únicos en `backupDataSchema.superRefine`; además se rechaza un respaldo con dos versiones de presupuesto para la misma categoría y mes | Ese par es índice único en Dexie: si pasara la validación, fallaría dentro de la transacción con un error genérico en lugar del mensaje "datos incompletos o dañados". Los registros usan `categorySchema`, `budgetVersionSchema`, `transactionSchema` y `appSettingsSchema.omit({ key })` del dominio, sin redefinir. |
| T-062 | Clasificación en dos pasos: `backupEnvelopeSchema` (`app === 'trazia'`, `formatVersion` y `schemaVersion` enteros positivos) decide "no es de TRAZIA" vs "versión más nueva" **antes** de mirar `data`; `backupFileSchema` decide "datos inválidos" | Un archivo de una versión futura puede traer campos que hoy no validan; si se validara todo de golpe se le diría "dañado" en lugar de "actualiza la app". `formatVersion` o `schemaVersion` mayores que 1 → "versión más nueva". |
| T-063 | Al restaurar, `seededAt` y `lastBackupAt` vienen del archivo y `persistenceRequested` conserva el valor del dispositivo | `persistenceRequested` describe a este navegador, no a los datos. Con `seededAt` del archivo, `ensureSeedCategories` no vuelve a sembrar sobre datos restaurados (además el conteo de categorías > 0 ya lo impide). La comparación profunda de ida y vuelta incluye `settings`. |
| T-064 | `lastBackupAt` se actualiza sólo **después** de que `deliverFile` resuelva (`markBackupCompleted`), también desde "Descargar respaldo actual primero" | Si la entrega falla no se registra un respaldo que no existe. Probado en `RespaldoSection.test.tsx`. |
| T-065 | El aviso "El respaldo no está cifrado. Guárdalo en un lugar seguro." es texto fijo sobre el botón, no un diálogo previo | Es un aviso, no una decisión; un diálogo añadiría un toque a cada respaldo y el texto queda visible siempre. |
| T-066 | Nuevo `isStoragePersisted()` en `storage.ts` (`navigator.storage.persisted()`); `getPersistenceStatus()` no se toca | `getPersistenceStatus` sólo informa si la API existe (nunca devuelve `'denied'` ni consulta `persisted()`), y "Protegido contra borrado automático" necesita el estado real. Sin API o sin concesión se muestra el aviso de SPEC-07. |
| T-067 | El archivo se lee con `FileReader` y no con `Blob.text()` | Mismo resultado; disponible en todos los navegadores objetivo y en jsdom (que no implementa `text()`), así que el flujo completo del componente se prueba con `userEvent.upload`. El límite de 20 MB se comprueba con `File.size` antes de leer. |
| T-068 | Fallo en tiempo de ejecución al restaurar (después de validar): "No se pudo restaurar el respaldo. Tus datos actuales no se modificaron." | SPEC-07 no lo cubre; sigue el patrón de SPEC-01 ("No se pudo guardar. Tus datos anteriores están intactos."). Los cuatro mensajes del SPEC se emiten con el texto exacto desde `backupErrorMessages`. |
| T-069 | Sección mínima **Acerca de** en `Configuracion.tsx` (versión + enlace `#privacidad`); la versión llega por `define` (`__APP_VERSION__` desde `package.json`) en `vite.config.ts` | SPEC-02 la listaba pero nunca se implementó, y SPEC-07 pide "enlace desde Acerca de". El enlace es un ancla en la misma página: funciona sin red y sin ruta nueva. |
| T-070 | Privacidad es JSX estático en el bundle, sin `fetch` ni Markdown externo | Criterio 6. `respaldo.spec.ts` navega a Configuración con `context.setOffline(true)` y comprueba que no sale ninguna petición. |
| T-071 | Los E2E de restauración usan el archivo real descargado (`download.path()` → `setInputFiles`) y comparan las tres tablas de datos leídas de IndexedDB antes y después | Criterio 1 con archivo real y no con un objeto en memoria. "Vaciar" se hace directo en IndexedDB porque el borrado total es del bloque B. |

### Hallazgo: `requestPersistence` no se llama desde ningún lado

- `requestPersistence()` (SPEC-01) existe en `src/data/storage.ts` pero **nadie la invoca**: ni tras el primer movimiento (`Captura.tsx`), ni en el arranque (`main.tsx`). `settings.persistenceRequested` nunca pasa a `true`. El criterio 5 de SPEC-07 ("se solicita la persistencia tras el primer movimiento") no se cumple hoy.
- `getPersistenceStatus()` nunca devuelve `'denied'`: sólo distingue si `navigator.storage.persist` existe.
- No se corrigió en este bloque (instrucción expresa de consultar antes). Pendiente de decisión: dónde llamarla (tras guardar el primer movimiento, según el SPEC) y si `persistenceRequested` debe registrar el intento o el resultado.

### Anotado, sin corregir

- `Configuracion.tsx` muestra "Cargando..." hasta que resuelven categorías y presupuestos; las secciones de respaldo y privacidad heredan esa espera. Es el comportamiento previo de la página.

## Pendientes por validar

| ID | Pregunta | Cuándo |
|---|---|---|
| P-001 | ¿Sugerir concepto y categoría a partir de capturas anteriores? | Tras usar el MVP |
| P-002 | ¿Comparativo entre meses en Visualización? | Tras usar el MVP |
| P-003 | Diseño de gastos fijos y suscripciones (estatus, frecuencia, registro automático o con un toque) | Inicio de fase 2 |
| P-004 | ¿Bloqueo con Face ID y cifrado local en la app nativa? | Fase 2 (SPEC-09) |
| P-005 | Cuenta de Apple Developer, bundle ID e ícono final | Fase 2 |
| P-006 | ¿Repositorio público o privado en GitHub? | Antes del primer push |
