# SPEC-04 — Visualización mensual

## Objetivo
Responder en segundos dos preguntas: “¿En qué se me está yendo el dinero?” y “¿Cómo voy frente a lo que planeé este mes?”. Es la versión visual y confiable de la pestaña Summary.

## Alcance (ruta `/visualizacion?mes=YYYY-MM`)
1. **Selector de mes** (`MonthSwitcher`): anterior, siguiente y etiqueta. No permite pasar del mes actual. El mes se refleja en la URL para poder compartir la vista entre pestañas.
2. **Tarjeta principal:**
   - “Gastado” (cifra grande);
   - “Planeado” y “Disponible”, o “Por encima de lo planeado” si el total es negativo;
   - barra de progreso global;
   - si es el mes en curso, contexto: “Día 16 de 30”.
3. **Distribución del gasto:** dona por categoría (6 principales + “Otras”), con la cifra total al centro y leyenda con monto y porcentaje.
4. **Plan contra gasto:** barras horizontales por categoría (gastado sobre presupuesto), con `StatusBadge` en texto: “En plan”, “Cerca del límite”, “Por encima” o “Sin presupuesto”.
5. **Detalle por categoría:**
   - tabla en escritorio y tarjetas en móvil, con columnas Categoría · Presupuesto · Gastado · Disponible / Por encima;
   - fila de totales;
   - orden “Mayor gasto” (predeterminado) u “Orden configurado”;
   - tocar una categoría lleva a Movimientos filtrados por esa categoría y mes.
6. **Exportar a Excel** (SPEC-06).

## Fuera de alcance
Comparativo entre meses (P-002), proyecciones, ingresos y rangos personalizados.

## Reglas
Las reglas de cálculo están en `architecture.md` §5 y se implementan con `buildMonthSummary`. La interfaz no calcula nada por su cuenta.

## Estados
- **Mes sin movimientos y sin presupuesto:** “Aún no hay movimientos en {mes}” con el botón “Registrar un gasto”.
- **Mes sin movimientos con presupuesto:** la tarjeta muestra “Gastado $0 · Disponible $Y”; en lugar de la dona aparece un mensaje vacío.
- **Sin presupuesto pero con gastos:** se muestra el gasto y la nota “Asigna presupuestos en Configuración para comparar con tu plan”.
- **Por encima:** texto ocre “Por encima de lo planeado: $X” (T-007). Sin iconos de alarma.

## Accesibilidad
- Cada gráfica tiene `role="img"` y un `aria-label` resumido (“Gasto de septiembre: Hogar 35 %, Transporte 20 %…”), además de “Ver como tabla”.
- El estado nunca se comunica solo con color.

## Criterios de aceptación
1. Con datos de prueba conocidos, todas las cifras coinciden con `buildMonthSummary` (pruebas de componente con datos fijos).
2. Cambiar de mes actualiza todo y la URL; al recargar se conserva el mes.
3. Un gasto nuevo desde otra pestaña aparece sin recargar (Dexie `liveQuery`).
4. Las gráficas se ajustan de 320 a 1440 px sin desbordar; las etiquetas largas se truncan con el nombre completo accesible.
5. Las categorías archivadas con gasto en el mes aparecen marcadas como “Archivada”.
6. Suma de filas = total gastado (prueba explícita).

## Pruebas
- Componentes: tarjeta principal en sus estados, tabla, orden y estados vacíos.
- E2E: capturar 3 gastos en 2 categorías → verificar las cifras y la navegación a Movimientos filtrados.

## Riesgos
- Recharts en pantallas pequeñas: se fijan alturas mínimas y leyendas fuera de la gráfica.
- Rendimiento con muchos movimientos: el resumen es O(n) por mes y se memoriza por `monthKey`.
