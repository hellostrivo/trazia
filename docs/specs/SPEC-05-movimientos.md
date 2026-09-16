# SPEC-05 — Movimientos

## Objetivo
Consultar y corregir los gastos registrados para que el resumen siempre refleje la realidad.

## Alcance (ruta `/movimientos?mes=YYYY-MM&categoria=ID`)
- Selector de mes, filtro por categoría (incluye las archivadas con movimientos) y búsqueda por concepto (normalizada, sin acentos).
- Lista agrupada por día (más reciente primero), con el subtotal de cada día. Cada fila muestra concepto, categoría (punto de color + nombre) y monto.
- Pie de lista: total del filtro actual, por ejemplo “12 movimientos · $4,380.00”.
- Tocar una fila abre un diálogo de **edición** con los mismos campos y validaciones de SPEC-03. Se puede elegir una categoría archivada solo si ya era la del movimiento.
- **Eliminar** desde el diálogo, con confirmación (“¿Eliminar este gasto de $X?”) y toast con **Deshacer** (T-011).
- Si un filtro o una fecha editada saca el movimiento del mes visible, se informa: “Movido a {mes}”.

## Fuera de alcance
Selección múltiple, duplicar movimientos y adjuntos.

## Estados
- **Sin movimientos en el mes:** “Aún no hay movimientos en {mes}” con enlace a Captura.
- **Sin resultados de búsqueda o filtro:** “No encontramos movimientos con esos filtros” con el botón “Limpiar filtros”.
- **Error:** toast neutral.

## Criterios de aceptación
1. Editar el monto, la categoría o la fecha actualiza los totales de todas las vistas.
2. Deshacer una eliminación restaura el movimiento con su mismo `id` y `createdAt`.
3. Con 500 movimientos en un mes, la lista responde con fluidez. Si hay más de 200 filas se renderiza en bloques (paginación incremental con “Mostrar más”).
4. La búsqueda “cafe” encuentra “Café”.
5. Diálogo accesible: foco inicial, trampa de foco y cierre con Esc que devuelve el foco a la fila.

## Pruebas
- Componentes: edición, validaciones, eliminar y deshacer, filtros y búsqueda.
- E2E: editar la categoría de un gasto → la Visualización refleja el cambio.

## Riesgos
- Eliminación accidental: se mitiga con confirmación y la opción de deshacer.
