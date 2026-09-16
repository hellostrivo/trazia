# SPEC-07 — Respaldo, restauración, borrado y privacidad

## Objetivo
Garantizar que los datos locales estén bajo control total de la persona: que pueda respaldarlos, restaurarlos, borrarlos y entender cómo se protegen.

## Alcance (Configuración › Datos y respaldo, Configuración › Privacidad)

**1. Estado del almacenamiento**
- Número de categorías y de movimientos, y fecha del último respaldo.
- Estado de persistencia: “Protegido contra borrado automático” o “El navegador podría borrar los datos si no usas la app por un tiempo. Instálala en tu pantalla de inicio y haz respaldos.”

**2. Descargar respaldo**
- Archivo `trazia-respaldo-2026-09-16.json` con este formato:
  ```json
  { "app": "trazia", "formatVersion": 1, "schemaVersion": 1,
    "exportedAt": "…", "data": { "categories": [], "budgetVersions": [], "transactions": [], "settings": {} } }
  ```
- Aviso previo: “El respaldo no está cifrado. Guárdalo en un lugar seguro.”
- Al terminar, actualiza `lastBackupAt`.

**3. Restaurar respaldo**
1. Seleccionar un archivo `.json` de 20 MB como máximo.
2. Validar todo con Zod:
   - `app` y `formatVersion` compatibles;
   - integridad referencial: todo `categoryId` existe;
   - montos y fechas válidos;
   - IDs únicos.
3. Mostrar una vista previa: “Contiene N categorías y M movimientos (del {fecha} al {fecha})”.
4. Confirmar: “Esto reemplazará todos tus datos actuales.” con la opción **Descargar respaldo actual primero**.
5. Reemplazar dentro de una sola transacción Dexie. Si falla algo, no cambia nada.

**4. Recordatorio de respaldo (T-019)**
- Aviso discreto en Configuración (y un punto en la pestaña) si hay movimientos y el último respaldo tiene más de 30 días o nunca se ha hecho.
- Se puede cerrar por 30 días.

**5. Borrar todos los datos**
- Doble confirmación: diálogo y luego escribir “BORRAR”.
- Limpia todas las tablas y deja la app como recién instalada; vuelve a sembrar las categorías genéricas (el borrado reinicia `seededAt`).

**6. Privacidad**
Texto claro que explica:
- los datos se guardan solo en este dispositivo y navegador;
- no hay cuentas, analítica, publicidad, rastreo ni conexión con bancos;
- no hay sincronización entre dispositivos;
- cómo respaldar;
- qué pasa si se borran los datos del navegador;
- que los archivos exportados quedan bajo responsabilidad de la persona.

Enlace desde Acerca de.

## Fuera de alcance
Combinar respaldos, cifrado con contraseña, respaldo automático en la nube e importación desde Excel.

## Mensajes de error de importación
| Caso | Mensaje |
|---|---|
| No es JSON | “Este archivo no es un respaldo de TRAZIA.” |
| Otra app o formato | “Este archivo no es un respaldo de TRAZIA.” |
| Versión más nueva | “Este respaldo se creó con una versión más reciente de TRAZIA. Actualiza la app e inténtalo de nuevo.” |
| Datos inválidos | “El respaldo tiene datos incompletos o dañados. Tus datos actuales no se modificaron.” |
| Demasiado grande | “El archivo supera 20 MB.” |

## Criterios de aceptación
1. Respaldar → borrar todo → restaurar deja los datos idénticos (comparación profunda).
2. Un archivo con un movimiento que apunta a una categoría inexistente se rechaza sin modificar nada.
3. Un error simulado a la mitad de la importación no altera los datos.
4. El borrado total requiere escribir “BORRAR” y deja la app con las categorías genéricas.
5. Se solicita la persistencia tras el primer movimiento y su estado se muestra correctamente.
6. El texto de Privacidad es accesible sin conexión.

## Pruebas
- Unitarias: esquema de respaldo (válidos, inválidos, versiones, referencias).
- Integración: exportación → importación de ida y vuelta, y atomicidad.
- E2E: flujo completo de respaldo y restauración con archivo real.

## Riesgos y privacidad
- El respaldo sin cifrar es sensible; se advierte al usuario. El cifrado se evaluará en la fase 2 (P-004).
- Si la persona borra los datos de Safari, se pierde todo; la protección son el recordatorio y la instalación.
