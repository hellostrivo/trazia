# Despliegue — GitHub y Netlify

> Ningún paso de esta guía se ejecuta automáticamente. El push y el despliegue solo se hacen con instrucción expresa de la persona usuaria. SPEC-08 dejó la configuración lista; desplegar es una decisión posterior.

## 0. Requisitos

- Node.js 24 LTS y Git instalados.
- Proyecto validado localmente: `npm run validate` sin errores (incluye los E2E contra `npm run build && npm run preview`, es decir, contra el mismo artefacto que se publica).
- Acceso a la cuenta de GitHub `hellostrivo` y a una cuenta de Netlify.

## 1. Qué se despliega

`npm run build` genera `dist/` con:

| Archivo | Qué es |
|---|---|
| `index.html`, `assets/*` | La app (JS y CSS con hash en el nombre) |
| `manifest.webmanifest` | Manifest de la PWA (nombre, colores, íconos, `display: standalone`) |
| `sw.js` | Service worker (Workbox, `generateSW`, runtime incluido en el mismo archivo) |
| `icons/*` | Ícono provisional (monograma "T"; el definitivo es P-005) |
| `robots.txt` | `Disallow: /` |

El service worker **precachea todo `dist/`** (≈2.6 MB, incluidos los chunks de ExcelJS y react-pdf) para que en modo avión la app abra, capture, muestre Visualización y exporte. La lista exacta se verifica en `src/__tests__/e2e/offline.spec.ts` ("sw.js precachea todo dist").

`netlify.toml` define:

- build: `npm run build`, publicación de `dist`, `NODE_VERSION = "24"`;
- redirección SPA `/* → /index.html 200`;
- encabezados de seguridad de `docs/architecture.md` §7 (CSP, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, `X-Robots-Tag`);
- `Cache-Control: public, max-age=31536000, immutable` para `/assets/*` y `no-cache` para `/`, `/index.html`, `/sw.js` y `/manifest.webmanifest`.

`vite preview` envía los mismos encabezados de seguridad (los lee de `netlify.toml`), así que lo que pasan los E2E es lo que verá producción.

## 2. Repositorio local

```bash
cd ~/Desktop/TRAZIA/repo_trazia
pwd                         # debe terminar en /TRAZIA/repo_trazia
git status                  # árbol limpio, en main
```

`git status` no debe mostrar `node_modules/`, `dist/`, `.env*` (excepto `.env.example`) ni archivos `.xlsx`.

## 3. Crear el repositorio en GitHub (manual)

1. Entra a https://github.com/new con la cuenta `hellostrivo`.
2. Nombre del repositorio: `trazia`. Visibilidad: la que se decida (P-006 de `decisions.md`; se recomienda **privado**).
3. **No** marques "Add README", `.gitignore` ni licencia, porque el repositorio debe crearse vacío.
4. Crea el repositorio.

## 4. Conectar y subir (solo con autorización)

```bash
git remote add origin https://github.com/hellostrivo/trazia.git
git remote -v               # verificar la URL
git push -u origin main
```

La autenticación se realiza con tus propias credenciales (GitHub Desktop, Git Credential Manager o `gh auth login`). No se guardan tokens en el repositorio.

## 5. Crear el sitio en Netlify (manual)

1. Netlify › **Add new project** › **Import an existing project** › **GitHub**.
2. Autoriza a Netlify solo sobre el repositorio `hellostrivo/trazia`.
3. Configuración de build (ya viene definida en `netlify.toml`; verifícala):

   | Campo | Valor |
   |---|---|
   | Branch | `main` |
   | Build command | `npm run build` |
   | Publish directory | `dist` |
   | Node | `24` (variable `NODE_VERSION` en `netlify.toml`) |

4. Despliega. Opcional: cambia el nombre del sitio en **Site configuration › Change site name** (por ejemplo `trazia`), lo que da la URL `https://trazia.netlify.app` si el nombre está disponible.

Alternativa sin conectar GitHub: **Deploys › Drag and drop** con la carpeta `dist/` generada localmente. `netlify.toml` no se lee en ese modo (los encabezados y la redirección se pierden), así que sólo sirve para una prueba rápida, no para producción.

Opcional, y sólo con autorización expresa: `npx netlify-cli build` reproduce el build de Netlify en local. Requiere iniciar sesión en Netlify, por eso no forma parte de `validate`.

## 6. Variables de entorno

El MVP **no usa secretos ni variables de entorno**. La versión que se muestra en Configuración › Acerca de sale de `package.json` en tiempo de build.

Nunca se deben incluir en el repositorio:
- archivos `.env`, `.env.local` o `.env.production`;
- tokens de GitHub o Netlify;
- llaves o certificados de Apple;
- exportaciones y respaldos con datos personales (`*.xlsx`, `*.pdf`, `trazia-respaldo-*.json`).

Cualquier variable con prefijo `VITE_` se incrusta en el JavaScript público, así que nunca debe contener secretos.

## 7. Verificación después del despliegue

1. Abre la URL de producción en Safari (iPhone) y en un navegador de escritorio.
2. Revisa los encabezados en DevTools › Network › documento: deben aparecer `Content-Security-Policy`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` y `X-Robots-Tag: noindex`. En `/sw.js` e `index.html`, `Cache-Control: no-cache`; en `/assets/*`, `immutable`.
3. Recarga una ruta interna (por ejemplo `/visualizacion`). No debe dar 404, gracias a la redirección SPA.
4. En Chrome de escritorio: DevTools › Application › Manifest debe decir que la app es instalable, y Service workers debe mostrar `sw.js` activado.
5. Instala la app desde Safari: Compartir › **Agregar a pantalla de inicio**. En Configuración aparece una tarjeta con esa instrucción mientras no esté instalada; desaparece en modo standalone.
6. Abre la app instalada, activa el modo avión y confirma que abre, permite capturar, muestra Visualización y exporta Excel y PDF.
7. En DevTools › Network confirma que no hay solicitudes a dominios externos.
8. Revisa el área segura en el iPhone: la barra inferior no queda detrás del indicador de inicio y el contenido no se mete bajo el notch en horizontal.

### Descargas en la PWA de iOS (nota de SPEC-06)

En la app instalada (standalone), Safari no muestra el gestor de descargas: al exportar Excel, PDF o el respaldo JSON, iOS abre una **vista previa** del archivo o la hoja de compartir. Para conservarlo: **Compartir › Guardar en Archivos**. Si la vista previa no aparece, abre la misma URL en Safari (sin instalar) y descarga desde ahí. La entrega nativa (Filesystem + Share) llega con SPEC-09.

## 8. Actualizaciones y reversión

- Cada push a `main` genera un despliegue automático.
- Al abrir la app con una versión nueva publicada, el service worker la descarga en segundo plano y muestra "Hay una nueva versión disponible · Actualizar". Al pulsar **Actualizar**, la app se recarga con la versión nueva. "Después" pospone el aviso hasta la próxima apertura. Los datos viven en IndexedDB y no cambian con la actualización.
- `sw.js` e `index.html` se sirven con `no-cache` para que la versión nueva se detecte en la primera apertura, sin esperar a que caduque una caché.
- Para revertir: Netlify › **Deploys** › elige un despliegue anterior › **Publish deploy**. La reversión se propaga igual que una versión nueva (mismo aviso).
- Los datos de las personas usuarias no se ven afectados por despliegues ni reversiones, porque viven en su dispositivo.

## 9. Lighthouse en local (criterio 1 de SPEC-08)

Lighthouse no está en `package.json`; se ejecuta con una instalación temporal, contra `npm run preview`:

```bash
npm run build
npm run preview -- --host 127.0.0.1 &          # http://127.0.0.1:4173
npm install --no-save lighthouse               # temporal; no toca package.json ni el lock
npx lighthouse http://127.0.0.1:4173/ \
  --only-categories=performance,accessibility,best-practices \
  --form-factor=mobile --screenEmulation.mobile \
  --chrome-flags="--headless=new" --output=html --output-path=./lighthouse.html
npm prune                                      # retira lighthouse de node_modules
```

Umbrales: Accesibilidad ≥ 95, Buenas prácticas ≥ 95, Rendimiento ≥ 90. Lighthouse 12+ ya no trae la categoría PWA; la instalabilidad la verifica Chrome mismo (DevTools › Application › Manifest) y el E2E "Chrome considera la app instalable" (`Page.getInstallabilityErrors` por CDP).

Resultados del 16 de septiembre de 2026 (Lighthouse 13.4.1, Chrome 152, móvil): `/` P 98 · A 98 · BP 100; `/configuracion` P 98 · A 95 · BP 100; instalable sin errores.

## 10. Ícono provisional

`public/icons/trazia.svg` es la fuente (monograma "T" en azul-pizarra `#3e5c76` con trazo salvia `#6b9080` sobre `#faf7f2`). Los PNG (`icon-192`, `icon-512`, `icon-512-maskable`, `apple-touch-icon-180`) se rasterizaron desde ese SVG con el Chromium de Playwright. Cuando llegue el ícono definitivo (P-005) basta con reemplazar los cinco archivos manteniendo nombres y tamaños; el manifest y `index.html` no cambian.
