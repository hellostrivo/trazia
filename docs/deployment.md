# Despliegue — GitHub y Netlify

> Ningún paso de esta guía se ejecuta automáticamente. El push y el despliegue solo se hacen con instrucción expresa de la persona usuaria.

## 0. Requisitos

- Node.js 24 LTS y Git instalados.
- Proyecto validado localmente: `npm run validate` sin errores.
- Acceso a la cuenta de GitHub `hellostrivo` y a una cuenta de Netlify.

## 1. Repositorio local

```bash
cd ~/Desktop/TRAZIA/repo_trazia
pwd                         # debe terminar en /TRAZIA/repo_trazia
git init -b main
git add .
git commit -m "chore: estructura inicial de TRAZIA"
```

Antes del primer commit, `git status` no debe mostrar `node_modules/`, `dist/`, `.env*` (excepto `.env.example`) ni archivos `.xlsx`.

## 2. Crear el repositorio en GitHub (manual)

1. Entra a https://github.com/new con la cuenta `hellostrivo`.
2. Nombre del repositorio: `trazia`. Visibilidad: la que se decida (P-006 de `decisions.md`; se recomienda **privado**).
3. **No** marques “Add README”, `.gitignore` ni licencia, porque el repositorio debe crearse vacío.
4. Crea el repositorio.

## 3. Conectar y subir (solo con autorización)

```bash
git remote add origin https://github.com/hellostrivo/trazia.git
git remote -v               # verificar la URL
git push -u origin main
```

La autenticación se realiza con tus propias credenciales (GitHub Desktop, Git Credential Manager o `gh auth login`). No se guardan tokens en el repositorio.

## 4. Crear el sitio en Netlify (manual)

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

## 5. Variables de entorno

| Variable | ¿Obligatoria? | Dónde |
|---|---|---|
| `VITE_APP_VERSION` | No (si falta, se usa la versión de `package.json`) | Netlify › Environment variables, opcional |

El MVP **no usa secretos**. Nunca se deben incluir en el repositorio:
- archivos `.env`, `.env.local` o `.env.production`;
- tokens de GitHub o Netlify;
- llaves o certificados de Apple;
- exportaciones y respaldos con datos personales (`*.xlsx`, `*.pdf`, `trazia-respaldo-*.json`).

Cualquier variable con prefijo `VITE_` se incrusta en el JavaScript público, así que nunca debe contener secretos.

## 6. Verificación después del despliegue

1. Abre la URL de producción en Safari (iPhone) y en un navegador de escritorio.
2. Revisa los encabezados en DevTools › Network › documento: deben aparecer CSP, `Referrer-Policy` y `X-Robots-Tag`.
3. Recarga una ruta interna (por ejemplo `/visualizacion`). No debe dar 404, gracias a la redirección SPA.
4. Instala la app desde Safari: Compartir › **Agregar a pantalla de inicio**.
5. Activa el modo avión y confirma que la app abre y permite capturar.
6. En DevTools › Network confirma que no hay solicitudes a dominios externos.

## 7. Actualizaciones y reversión

- Cada push a `main` genera un despliegue automático.
- Para revertir: Netlify › **Deploys** › elige un despliegue anterior › **Publish deploy**.
- Los datos de las personas usuarias no se ven afectados por despliegues ni reversiones, porque viven en su dispositivo.
