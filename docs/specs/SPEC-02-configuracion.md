# SPEC-02 — Configuración: categorías y presupuestos

## Objetivo
Permitir que la persona defina sus propias categorías y cuánto planea gastar en cada una al mes, y entender de un vistazo cómo se distribuye ese plan.

## Historias de usuario
- Como usuaria, quiero crear, renombrar, recolorear y reordenar categorías para que reflejen mi vida.
- Como usuaria, quiero asignar un presupuesto mensual a cada categoría y que el cambio aplique desde un mes en adelante sin alterar los meses anteriores.
- Como usuaria, quiero archivar una categoría que ya no uso sin perder los movimientos que tiene registrados.
- Como usuaria, quiero ver en una gráfica en qué categorías se concentra mi plan mensual.

## Alcance
- Ruta `/configuracion`, con las subsecciones:
  - **Categorías y presupuestos** (este SPEC);
  - **Plan en PDF** (SPEC-06);
  - **Datos y respaldo** y **Privacidad** (SPEC-07);
  - **Acerca de** (versión).
- Selector de mes “Presupuesto de: [septiembre 2026 ▾]”, con valor predeterminado en el mes actual y posibilidad de elegir hasta 12 meses atrás o 12 adelante.
- Lista ordenable de categorías activas con: color, nombre, monto presupuestado en el mes elegido y porcentaje del total.
  - Reordenar con botones “Subir” y “Bajar” (accesibles) y, además, arrastrar en escritorio.
- Hoja o diálogo para **crear o editar** una categoría: nombre, color (paleta fija) y monto.
  - Leyenda: “Aplica desde {mes} en adelante”.
  - Si existe una versión posterior, se agrega: “hasta {mes-1}; a partir de {mes} aplica {monto}”.
- Acciones: **Archivar** o **Eliminar**. Eliminar solo se permite si la categoría no tiene movimientos ni presupuestos mayores a 0; si no, se ofrece archivar.
- Sección “Archivadas” colapsable, con opción **Restaurar**.
- Tarjeta de totales: “Plan mensual: $X” y número de categorías con presupuesto.
- Gráficas:
  - dona de distribución del presupuesto (6 categorías principales + “Otras”);
  - barras horizontales ordenadas por monto;
  - ambas con tabla alternativa (`ChartDataTable`) accesible por un botón “Ver como tabla”.

## Fuera de alcance
Gastos fijos y suscripciones (fase 2), ingresos, íconos por categoría y subcategorías.

## Validaciones
| Campo | Regla | Mensaje |
|---|---|---|
| Nombre | 1–40 caracteres tras recortar espacios | “Escribe un nombre de hasta 40 caracteres.” |
| Nombre | Único normalizado (incluye archivadas) | “Ya tienes una categoría llamada “{nombre}”.” (Si está archivada: “…está archivada. ¿Quieres restaurarla?”) |
| Monto | 0 a 9,999,999.99, máximo 2 decimales | “Ingresa un monto válido, por ejemplo 1500 o 1,500.50.” |
| Cantidad | Máximo 50 categorías activas | “Puedes tener hasta 50 categorías activas.” |

## Estados
- **Vacío** (sin categorías): “Crea tu primera categoría para empezar a organizar tus gastos” con botón “Agregar categoría”.
- **Sin presupuestos** (todas en 0): gráficas reemplazadas por “Asigna un monto a tus categorías para ver cómo se distribuye tu plan”.
- **Guardado**: toast “Cambios guardados”.
- **Error**: toast neutral; el formulario conserva lo escrito.

## Criterios de aceptación
1. En el primer arranque aparecen las 8 categorías genéricas con presupuesto $0.
2. Asignar $1,500 a Hogar en septiembre y $2,000 en noviembre hace que septiembre y octubre muestren $1,500, y noviembre en adelante $2,000.
3. Crear “hogar ” o “HÓGAR” cuando existe “Hogar” muestra el error de duplicado.
4. No se puede eliminar una categoría con movimientos; archivarla la oculta de Captura y la mantiene en la Visualización de los meses con gasto.
5. El orden elegido se respeta en Captura, en Configuración y en las exportaciones.
6. El total y los porcentajes suman correctamente (el redondeo de los porcentajes puede dar 99–101 %; se aclara con “Los porcentajes están redondeados”).
7. Todo el flujo funciona solo con teclado y con VoiceOver (los controles tienen etiquetas).

## Pruebas
- Componentes: formulario (validaciones y leyenda de vigencia), bloqueo de eliminación, reordenamiento.
- E2E: crear una categoría con presupuesto → aparece en Captura; archivar → desaparece de Captura.

## Riesgos
- Confusión con la vigencia mensual. Se mitiga con una leyenda explícita y el selector de mes visible.
- Demasiadas categorías vuelven ilegible la dona. Se mitiga agrupando en “Otras”.
