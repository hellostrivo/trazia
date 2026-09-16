# SPEC-08 — PWA, funcionamiento sin conexión y Netlify

## Objetivo
Que TRAZIA se instale en el iPhone, funcione sin conexión y se despliegue en Netlify de forma segura y repetible.

## Alcance
- **vite-plugin-pwa:**
  - manifest: nombre “TRAZIA”, `short_name` “TRAZIA”, `lang` es-MX, `display` standalone, `theme_color` y `background_color` desde los tokens, `start_url` “/”;
  - íconos de 192, 512 y 512 *maskable*, más `apple-touch-icon` de 180;
  - `registerType: 'prompt'`, con un aviso “Hay una nueva versión disponible · Actualizar”;
  - precache de todos los recursos del build, incluidos los chunks de exportación, para que funcionen sin conexión.
- **Metaetiquetas iOS:** `apple-mobile-web-app-capable`, `status-bar-style` y `viewport-fit=cover`, con áreas seguras en CSS.
- **Invitación a instalar** (solo en Safari iOS sin modo standalone): tarjeta discreta en Configuración con instrucciones (“Compartir › Agregar a pantalla de inicio”). Se puede cerrar.
- **Ícono provisional de TRAZIA:** monograma “T” en azul-pizarra con trazo salvia, en SVG propio. El ícono final queda pendiente (P-005).
- **`netlify.toml`:**
  - build (`npm run build`, `dist`) y `NODE_VERSION = "24"`;
  - redirección SPA `/* → /index.html 200`;
  - encabezados de seguridad (`architecture.md` §7);
  - `Cache-Control` inmutable para `/assets/*` y `no-cache` para `index.html` y `sw.js`.
- **`public/robots.txt`:** `Disallow: /`.
- **Documentación:** `docs/deployment.md`.

## Criterios de aceptación
1. Lighthouse (móvil) muestra la PWA como instalable y obtiene Accesibilidad ≥ 95, Buenas prácticas ≥ 95 y Rendimiento ≥ 90.
2. En modo avión, la app abre, captura, muestra Visualización y exporta Excel y PDF.
3. Una nueva versión desplegada muestra el aviso de actualización sin perder datos.
4. La CSP no bloquea ninguna función (sin errores en la consola, verificado en E2E) y no hay solicitudes a terceros.
5. `netlify build` local (opcional, vía `npx netlify-cli`, solo con autorización) o `npm run build` + `npm run preview` reproducen el comportamiento de producción.

## Pruebas
- E2E con `context.setOffline(true)` después de la primera carga.
- E2E que falla si hay solicitudes a un origen distinto de `localhost`.
- Revisión manual en iPhone real: instalación, áreas seguras, teclado y exportaciones.

## Riesgos
- Service worker con caché antiguo: se mitiga con el aviso de actualización y `no-cache` en `sw.js`.
- El límite de 7 días de Safari sin interacción se mitiga con la instalación, la persistencia y los respaldos (SPEC-07).
