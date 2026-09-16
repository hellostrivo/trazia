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

## Pendientes por validar

| ID | Pregunta | Cuándo |
|---|---|---|
| P-001 | ¿Sugerir concepto y categoría a partir de capturas anteriores? | Tras usar el MVP |
| P-002 | ¿Comparativo entre meses en Visualización? | Tras usar el MVP |
| P-003 | Diseño de gastos fijos y suscripciones (estatus, frecuencia, registro automático o con un toque) | Inicio de fase 2 |
| P-004 | ¿Bloqueo con Face ID y cifrado local en la app nativa? | Fase 2 (SPEC-09) |
| P-005 | Cuenta de Apple Developer, bundle ID e ícono final | Fase 2 |
| P-006 | ¿Repositorio público o privado en GitHub? | Antes del primer push |
