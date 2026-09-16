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

## Supuestos

- La persona usuaria trabaja en macOS (Escritorio = `~/Desktop`). En Windows, la ruta equivalente es `%USERPROFILE%\Desktop\TRAZIA\repo_trazia`.
- La zona horaria es la del dispositivo.
- La cuenta `hellostrivo` de GitHub se usa por decisión de la persona usuaria. El repositorio `trazia` es independiente de Strivo.

## Pendientes por validar

| ID | Pregunta | Cuándo |
|---|---|---|
| P-001 | ¿Sugerir concepto y categoría a partir de capturas anteriores? | Tras usar el MVP |
| P-002 | ¿Comparativo entre meses en Visualización? | Tras usar el MVP |
| P-003 | Diseño de gastos fijos y suscripciones (estatus, frecuencia, registro automático o con un toque) | Inicio de fase 2 |
| P-004 | ¿Bloqueo con Face ID y cifrado local en la app nativa? | Fase 2 (SPEC-09) |
| P-005 | Cuenta de Apple Developer, bundle ID e ícono final | Fase 2 |
| P-006 | ¿Repositorio público o privado en GitHub? | Antes del primer push |
