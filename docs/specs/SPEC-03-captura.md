# SPEC-03 — Captura de gastos

## Objetivo
Registrar un gasto en segundos desde la pantalla de inicio.

## Historias de usuario
- Como usuaria, quiero escribir monto y concepto y elegir la categoría con un toque.
- Como usuaria, quiero que la fecha sea hoy sin hacer nada, pero poder cambiarla si registro un gasto de otro día.
- Como usuaria, quiero confirmar que se guardó y poder deshacerlo si me equivoqué.

## Alcance (ruta `/`)
1. **Resumen breve** del mes en curso: “Septiembre: $X de $Y planeado” con barra de progreso, enlazado a Visualización.
2. **Formulario** (orden de foco):
   - **Monto**: campo grande, `inputmode="decimal"`, prefijo `$`, 16 px o más.
   - **Concepto**: texto, 80 caracteres como máximo, `autocomplete="off"`, `enterkeyhint="next"`.
   - **Categoría**: grupo de chips (`role="radiogroup"`) con las categorías activas en el orden configurado, con desplazamiento si hay muchas.
   - **Fecha**: chip “Hoy” con botón “Cambiar” que abre un `input type="date"` nativo con `max=hoy`. Si la fecha no es hoy, el chip muestra la fecha (“lun 14 sep”) y un botón “Volver a hoy”.
   - **Botón “Guardar gasto”** (acción principal, ancho completo en móvil). También se envía con Enter.
3. **Tras guardar:**
   - toast “Guardado: $X en {categoría}” con botón **Deshacer** (6 s);
   - se limpian monto, concepto y categoría, y el foco vuelve a Monto;
   - la fecha elegida se conserva mientras la persona siga en la pantalla (T-010).
4. **Últimos movimientos**: los 5 más recientes del mes, con enlace “Ver todos” a Movimientos.

## Fuera de alcance
Sugerencias automáticas (P-001), gastos recurrentes, notas, fotos de tickets e ingresos.

## Validaciones (al enviar y luego en vivo en los campos tocados)
| Campo | Regla | Mensaje |
|---|---|---|
| Monto | Mayor que 0 y hasta 9,999,999.99, máximo 2 decimales | “Ingresa un monto mayor a $0, por ejemplo 250 o 250.50.” |
| Concepto | 1–80 caracteres tras recortar espacios | “Describe el gasto en pocas palabras.” |
| Categoría | Obligatoria y activa | “Elige una categoría.” |
| Fecha | Válida y no posterior a hoy | “La fecha no puede ser posterior a hoy.” |

**Comportamiento de los errores:**
- Los errores se asocian al campo con `aria-describedby`, y el foco va al primer campo con error.
- El botón se deshabilita mientras se guarda, para evitar envíos dobles.

## Estados
- **Sin categorías activas:** el formulario se reemplaza por “Para registrar gastos, primero crea una categoría” con el botón “Ir a Configuración”.
- **Mes sin presupuesto:** el resumen dice “Septiembre: $X gastado” y no muestra barra.
- **Error al guardar:** toast “No se pudo guardar el gasto. Intenta de nuevo.” Los datos del formulario se conservan.
- **Carga inicial:** estructura de espera (*skeleton*) de 300 ms como máximo, sin saltos de diseño.

## Criterios de aceptación
1. Con el teclado abierto en el iPhone, Monto, Concepto, las categorías y Guardar son alcanzables sin que se rompa el diseño.
2. Guardar actualiza de inmediato el resumen breve, los últimos movimientos, Visualización y Movimientos (reactividad).
3. “Deshacer” elimina el movimiento y restaura los totales.
4. No es posible elegir una fecha futura, ni con el selector ni manipulando el valor.
5. Un monto como `1,250.5` se guarda como 125050 centavos y se muestra como “$1,250.50”.
6. Las categorías archivadas no aparecen.
7. Las pruebas E2E en WebKit (iPhone) completan una captura con solo teclado y toques.

## Pruebas
- Componentes: validaciones, envío con Enter, prevención de doble envío, deshacer, cambiar y restaurar fecha.
- E2E: captura → verificación en Visualización → deshacer.

## Riesgos
- El teclado decimal de iOS no muestra coma de miles; el parser acepta ambas formas.
- El selector de fecha nativo varía entre navegadores; se usa el nativo por accesibilidad.
