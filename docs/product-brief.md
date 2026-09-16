# Product brief — TRAZIA

## Visión

Dar claridad sobre el dinero sin que su gestión se sienta pesada. TRAZIA convierte el registro de gastos y el presupuesto mensual en un hábito ligero, visual y privado.

## Problema

El control actual vive en dos hojas de Excel: “Control mensual” (Transacciones + Summary) y “Límite de gastos por mes”. Al revisarlas aparecieron estos problemas:

- **Fragilidad.** Los totales dependen de `SUMIF` sobre texto. Una categoría escrita distinto, o una fila sin fórmula, deja gasto fuera del resumen sin avisar.
- **Sin fechas.** Las transacciones no tienen fecha y cada mes requiere un archivo o una limpieza manual.
- **Totales poco confiables.** Algunos totales incluyen elementos pausados, y la frecuencia de un gasto no afecta su costo mensual.
- **Poco práctico en el celular.** Capturar desde el teléfono es lento y responder “¿cómo voy este mes?” exige leer tablas.

## Usuario principal

Una persona adulta que administra sus finanzas personales, registra gastos desde el iPhone al momento y revisa su avance en celular o escritorio. Es un solo usuario por dispositivo, sin cuentas compartidas.

## Propuesta de valor

- Registrar un gasto en segundos.
- Ver al instante en qué se va el dinero y cómo vas frente a lo planeado.
- Datos solo en tu dispositivo, sin bancos, publicidad ni rastreo.

## Principios de experiencia

1. **Sobria, cálida y adulta.** Paleta azul-pizarra, neutros cálidos y un acento verde salvia.
2. **Sin culpa.** Rebasar un presupuesto se comunica como un dato (“$X por encima de lo planeado”), nunca como un regaño.
3. **Mínimos pasos.** La captura es la pantalla de inicio.
4. **Confiable.** Los números cuadran siempre; los cálculos están centralizados y probados.
5. **Privada y bajo control.** Exportar, respaldar y borrar todo está al alcance de la persona usuaria.

## Alcance del MVP

| Prioridad | Funcionalidad | SPEC |
|---|---|---|
| P0 | Base técnica, diseño y accesibilidad | SPEC-00 |
| P0 | Modelo de datos local y reglas de cálculo | SPEC-01 |
| P0 | Configuración de categorías y presupuestos, con plantilla genérica inicial | SPEC-02 |
| P0 | Captura rápida con fecha editable | SPEC-03 |
| P0 | Visualización mensual con gráficas | SPEC-04 |
| P0 | Movimientos: editar y eliminar | SPEC-05 |
| P0 | Exportar transacciones (.xlsx) y plan de gastos (PDF) | SPEC-06 |
| P0 | Respaldo y restauración en JSON, borrado total, privacidad | SPEC-07 |
| P0 | PWA instalable, sin conexión, despliegue en Netlify | SPEC-08 |

**Parámetros del MVP:**
- Moneda: solo MXN.
- Periodo: mes calendario.
- Idioma: español (México).
- Sin ingresos, sin cuentas y sin nube.

## Fuera del MVP (fases posteriores)

- **Fase 2:**
  - gastos fijos y suscripciones (Activo/Pausado, frecuencia);
  - app iOS con Capacitor (SPEC-09);
  - bloqueo con Face ID.
- **Por evaluar:**
  - sugerencias de concepto y categoría al capturar;
  - comparativo entre meses;
  - importación desde Excel;
  - ingresos;
  - otras monedas;
  - Android;
  - sincronización entre dispositivos.

## Indicadores de éxito (uso personal)

- Registrar un gasto toma menos de 10 segundos y 3 interacciones o menos después de escribir el monto y el concepto.
- El resumen del mes coincide exactamente con la suma de los movimientos, verificado por pruebas.
- Ningún flujo principal requiere conexión a internet.
- Cero solicitudes de red a terceros, verificado en las pruebas E2E.
