# SPEC-06 — Exportaciones

## Objetivo
Sacar la información de la app en formatos útiles:
- un Excel equivalente a la pestaña **Transacciones**;
- un **PDF** atractivo equivalente a “Límite de gastos por mes” (plan de gastos por categoría).

## A. Excel de transacciones (desde Visualización)

**Interacción:** botón “Exportar a Excel” que abre un diálogo con el alcance: **{mes seleccionado}** (predeterminado) o **Todo el historial**.

**Archivo:** `trazia-transacciones-2026-09.xlsx`, o `trazia-transacciones-historial-2026-09-16.xlsx` para todo el historial.

- **Hoja “Transacciones”** con columnas, en este orden:

  | Columna | Tipo en Excel | Formato |
  |---|---|---|
  | Concepto | texto | — |
  | Fecha | fecha real | `dd/mm/yyyy` |
  | Categoría | texto (nombre vigente) | — |
  | Monto | número | `"$"#,##0.00` |

- Orden: fecha ascendente, luego `createdAt`.
- Encabezado con estilo (fondo azul-pizarra, texto blanco, negritas), fila congelada, autofiltro y anchos de columna ajustados.
- Fila final **Total** con `=SUM()` sobre la columna Monto.
- Metadatos: título del libro “TRAZIA — Transacciones”. No se incluye nombre de autor ni ningún otro dato personal.

**Protección contra fórmulas:** un concepto que empiece con `=`, `+`, `-` o `@` se exporta como texto con apóstrofo inicial, para evitar la inyección de fórmulas.

**Estados:**
- Sin movimientos en el alcance: el botón se deshabilita con la nota “No hay movimientos para exportar”.
- Mientras se genera: botón con indicador “Generando…”.
- Error: “No se pudo generar el archivo. Intenta de nuevo.”

## B. PDF del plan de gastos (desde Configuración › Plan en PDF)

**Interacción:** elegir el mes (predeterminado: el actual) y pulsar “Descargar plan en PDF”.

**Archivo:** `trazia-plan-2026-09.pdf`, tamaño carta, vertical, 1–2 páginas.

**Contenido:**
1. Encabezado: “TRAZIA”, “Plan de gastos · Septiembre 2026” y la fecha de generación.
2. Tarjeta: “Plan mensual total: $X” y el número de categorías.
3. Dona vectorial de distribución (6 principales + “Otras”) con leyenda.
4. Tabla: Categoría (punto de color) · Presupuesto · % del plan, en el orden configurado, con fila de total.
5. Barras horizontales por categoría, ordenadas de mayor a menor.
6. Si aplica, una sección “Sin presupuesto asignado” con la lista de nombres.
7. Pie: “Generado en tu dispositivo con TRAZIA” y número de página.

**Estilo:**
- Colores de los tokens, tipografía Helvetica integrada y montos alineados a la derecha.
- Respeta el tema claro aunque el sistema esté en modo oscuro.
- No incluye movimientos ni gastos reales; solo el plan (T-012).

**Estados:**
- Sin categorías con presupuesto: botón deshabilitado con “Asigna al menos un presupuesto para generar tu plan”.
- Generando y error: igual que en el Excel.

## Técnica
- `services/export/transactionsXlsx.ts` (ExcelJS) y `services/export/budgetPdf.tsx` (@react-pdf/renderer) se cargan con `import()` dinámico.
- Ambos reciben datos del dominio (`buildMonthSummary` o una lista de movimientos) y devuelven un `Blob`. No acceden a la DB directamente.
- `services/files/deliverFile(blob, filename, mime)` entrega el archivo; en web usa `URL.createObjectURL` y un enlace de descarga, y libera la URL después.

## Fuera de alcance
CSV, envío por correo e impresión directa.

## Criterios de aceptación
1. El `.xlsx` abre sin advertencias en Excel (Mac) y Numbers. Las fechas se filtran como fechas y los montos suman como números.
2. El total del Excel coincide con el “Gastado” de Visualización para ese mes.
3. Un concepto `=HYPERLINK(...)` se ve como texto literal.
4. El PDF abre en Vista Previa y en Safari iOS; las gráficas son vectoriales (se ven nítidas al hacer zoom) y los acentos y la ñ se ven correctamente.
5. Los totales y porcentajes del PDF coinciden con la sección de Configuración.
6. El bundle inicial no incluye ExcelJS ni react-pdf (verificado con el análisis del build).
7. Sin solicitudes de red durante la exportación.

## Pruebas
- Unitarias:
  - el Excel generado se vuelve a leer con ExcelJS para comprobar encabezados, tipos, formato, total y escape de fórmulas;
  - la estructura de datos del PDF (tabla y porcentajes) se prueba como función pura;
  - la generación del PDF produce un `Blob` que comienza con `%PDF`.
- E2E: descarga de ambos archivos (evento `download` de Playwright) y verificación del nombre y tamaño mayor a 0.

## Riesgos
- El peso de ExcelJS y react-pdf se mitiga con carga diferida.
- ExcelJS tiene mantenimiento lento. La alternativa documentada es `xlsx-js-style`; la interfaz de `transactionsXlsx` aísla el cambio.
- Las descargas en la PWA de iOS pueden abrir una vista previa en lugar de descargar; se documenta “Compartir › Guardar en Archivos”.
