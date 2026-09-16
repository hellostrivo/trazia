# SPECS — índice y dependencias

Cada SPEC se implementa solo después de ser aprobado. El orden refleja las dependencias.

| SPEC | Título | Depende de | Estado |
|---|---|---|---|
| [00](SPEC-00-fundaciones.md) | Fundaciones: repositorio, herramientas, diseño, accesibilidad | — | En revisión |
| [01](SPEC-01-modelo-y-persistencia.md) | Modelo de datos, persistencia y reglas de cálculo | 00 | En revisión |
| [02](SPEC-02-configuracion.md) | Configuración: categorías y presupuestos | 01 | En revisión |
| [03](SPEC-03-captura.md) | Captura de gastos | 01, 02 | En revisión |
| [04](SPEC-04-visualizacion.md) | Visualización mensual | 01, 02 | En revisión |
| [05](SPEC-05-movimientos.md) | Movimientos: consultar, editar, eliminar | 03 | En revisión |
| [06](SPEC-06-exportaciones.md) | Exportaciones: Excel de transacciones y PDF del plan | 02, 04 | En revisión |
| [07](SPEC-07-respaldo-y-privacidad.md) | Respaldo, restauración, borrado y privacidad | 01 | En revisión |
| [08](SPEC-08-pwa-y-despliegue.md) | PWA, funcionamiento sin conexión y Netlify | 00–07 | En revisión |
| [09](SPEC-09-ios-fase-2.md) | App iOS con Capacitor (fase 2, borrador) | 08 | Borrador |

**Definición de terminado (aplica a todos):**
- `npm run validate` en verde.
- Pruebas nuevas escritas y pasando.
- Sin scroll horizontal entre 320 y 1440 px.
- Flujo navegable con teclado y con etiquetas accesibles.
- Textos en `src/copy/strings.ts`.
- `docs/decisions.md` actualizado.
- Reporte de archivos creados y modificados.
