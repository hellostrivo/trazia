# SPEC-01 — Modelo de datos, persistencia y reglas de cálculo

## Objetivo
Centralizar el dinero, las fechas y los cálculos en un dominio puro y probado, y persistir los datos localmente de forma reactiva. Esto elimina los errores del Excel: `SUMIF` sobre texto, filas sin fórmula y totales con rangos distintos.

## Alcance
- `domain/`: `types`, `money`, `dates`, `budget`, `summary`, `categories`, `seed`, `schemas`.
- `data/`: `db.ts` (Dexie v1), repositorios, hooks reactivos y `storage.ts`.
- La plantilla genérica se siembra en el primer arranque.

## Fuera de alcance
Pantallas (SPEC-02 en adelante) y respaldo (SPEC-07).

## Modelo
Ver `docs/architecture.md` §4. Los esquemas Zod son la fuente de los tipos (`z.infer`).

## Reglas

**Dinero (`money.ts`):**
- `parseMoneyInput(str)` acepta `"1234"`, `"1,234.5"`, `"1234.50"` y `"$1,234.50"`.
- Rechaza: negativos, más de 2 decimales, texto, vacío, 0 y valores mayores a `9,999,999.99`.
- Devuelve centavos enteros.
- `formatMXN(cents)` usa `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
- `sumCents` valida que la suma siga siendo un entero seguro.

**Fechas (`dates.ts`):**
- `today()` devuelve la fecha local como `LocalDate`.
- `monthKeyOf(date)`, `monthRange(key)` → `[primer día, último día]`, `addMonths(key, n)`.
- `formatMonthLabel(key)` → “septiembre 2026”.
- Nunca se usa `new Date("YYYY-MM-DD")`, porque interpreta la fecha en UTC.

**Categorías (`categories.ts`):**
- `normalizeName` aplica trim, colapsa espacios, pasa a minúsculas y quita diacríticos (NFD).
- Se usa para garantizar nombres únicos.

**Presupuesto (`budget.ts`):**
- `resolveBudget(versions, categoryId, monthKey)` devuelve el monto de la versión con el `effectiveFrom` más reciente que sea ≤ `monthKey`, o 0 si no hay ninguna.

**Resumen (`summary.ts`):**
- `buildMonthSummary({ categories, versions, transactions, monthKey })` devuelve:
  ```ts
  {
    monthKey,
    totalBudgetCents,
    totalSpentCents,
    totalAvailableCents,
    rows: Array<{
      categoryId, name, colorKey, budgetCents, spentCents,
      availableCents, ratio | null, status, shareOfSpent
    }>
  }
  ```
- Aplica las reglas 1–7 de `architecture.md` §5.
- `status` es uno de: `en-plan | cerca | por-encima | sin-presupuesto | sin-actividad`.

**Semilla (`seed.ts`):**
- Categorías: Hogar, Supermercado, Transporte, Salud, Cuidado personal, Comidas fuera, Entretenimiento, Otros.
- Colores asignados en orden y sin presupuesto.
- Se ejecuta en una transacción solo si `settings.seededAt` es `null`. Si la persona borra todas las categorías, no se vuelven a sembrar.

**Repositorios:**
- Toda escritura valida con Zod y actualiza `updatedAt`.
- Las operaciones compuestas usan `db.transaction('rw', …)`.
- `categories.remove(id)` falla con `CategoryInUseError` si la categoría tiene movimientos o versiones de presupuesto con monto mayor que 0. En ese caso la UI ofrece archivarla.
- `budgets.setFrom(categoryId, monthKey, cents)` hace un *upsert* por `[categoryId+effectiveFrom]`.
- `transactions.listByMonth(key)` usa `where('date').between(start, end, true, true)`.

**Persistencia (`storage.ts`):**
- `requestPersistence()` llama `navigator.storage.persist?.()` una sola vez y registra el resultado.
- `getPersistenceStatus()` alimenta la sección Datos (SPEC-07).

## Estados y errores
- DB no disponible (modo privado antiguo o cuota excedida): pantalla de error con explicación y botón “Reintentar”.
- Error de escritura: toast con “No se pudo guardar. Tus datos anteriores están intactos.”

## Criterios de aceptación
1. Cobertura ≥ 90 % en `src/domain`.
2. `buildMonthSummary` coincide con los casos de prueba tabulados, incluidos:
   - categoría sin presupuesto con gasto;
   - categoría archivada con gasto en el mes;
   - presupuesto cambiado en un mes posterior (el mes anterior conserva su monto);
   - movimiento el último día del mes a las 23:59 local;
   - mes de febrero bisiesto.
3. No hay aritmética con decimales en el código de dominio.
4. La semilla se crea exactamente una vez, incluso con dos pestañas abiertas (verificado con la bandera dentro de la transacción).
5. Guardar un movimiento dispara la actualización de un `useLiveQuery` suscrito (prueba con fake-indexeddb).

## Pruebas
- Unitarias:
  - `money`: 25+ casos de parseo y formato;
  - `dates`: cambios de mes y año, bisiestos, zona horaria;
  - `budget`, `summary` y `categories`.
- Integración con fake-indexeddb: repositorios, semilla, bloqueo de borrado y *upsert* de presupuestos.

## Riesgos
- Cambio de zona horaria mientras se viaja: la fecha es local y explícita, así que no se reinterpreta.
- Límite de cuota de IndexedDB: irrelevante a esta escala; se captura el error `QuotaExceededError`.
