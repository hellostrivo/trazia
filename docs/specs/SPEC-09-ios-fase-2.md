# SPEC-09 — App iOS con Capacitor (fase 2, borrador)

> Borrador para orientar las decisiones del MVP. Requiere aprobación y decisiones P-003, P-004 y P-005 antes de implementarse.

## Objetivo
Publicar TRAZIA en la App Store reutilizando la base web, con una experiencia que se sienta nativa y datos persistentes en el contenedor de la app.

## Alcance previsto
- Capacitor (iOS) dentro del mismo repositorio, en la carpeta `ios/`.
- **Entrega de archivos:** implementación nativa de `deliverFile` con `@capacitor/filesystem` y `@capacitor/share` (hoja de compartir).
- **Almacenamiento:** evaluar si se mantiene IndexedDB en WKWebView o se migra a SQLite (`@capacitor-community/sqlite`) detrás de los repositorios.
- **Bloqueo opcional con Face ID** (P-004), con `NSFaceIDUsageDescription`.
- Háptica ligera al guardar, barra de estado, pantalla de arranque e ícono final.
- Gastos fijos y suscripciones (P-003), en un SPEC propio.

## Checklist para la App Store
- Cuenta de Apple Developer, bundle ID e identidad de firma (P-005).
- **Guideline 4.2 (funcionalidad mínima):** navegación nativa fluida, sin apariencia de sitio web, funcionamiento sin conexión y exportación nativa.
- **Etiqueta de privacidad:** “Datos no recopilados”.
- `PrivacyInfo.xcprivacy` con las APIs de razón requerida que se usen (por ejemplo, UserDefaults) y sin *tracking domains*.
- Sin cuentas, por lo que no aplica el requisito de eliminación de cuenta (5.1.1(v)). La función “Borrar todos los datos” sigue disponible.
- URL de política de privacidad pública (página estática en el mismo sitio de Netlify).
- Capturas de pantalla, descripción, categoría Finanzas y clasificación de edad.
- Sin enlaces a pagos externos ni publicidad.

## Riesgos
- Rechazo por 4.2 si la app se percibe como una web envuelta.
- Migración de datos si se cambia el motor de almacenamiento: se requiere una ruta de migración probada con respaldo previo.
