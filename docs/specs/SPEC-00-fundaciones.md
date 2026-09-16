# SPEC-00 — Fundaciones

## Objetivo
Crear una base ejecutable, ordenada y verificable sobre la que se construyen todos los demás SPECS: herramientas, sistema visual, estructura de navegación y accesibilidad.

## Alcance
- Proyecto Vite + React + TypeScript (`strict`, `noUncheckedIndexedAccess`).
- Scripts npm: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:e2e`, `validate`.
- ESLint (typescript-eslint, react-hooks, jsx-a11y, `no-restricted-imports` para las capas), Prettier y `.editorconfig`.
- Vitest + Testing Library + fake-indexeddb; Playwright con proyectos Chromium y WebKit (iPhone).
- `.gitignore`, `.nvmrc` (24), `.env.example`.
- `tokens.css` y `global.css`: color, tipografía, espaciado, radios, sombras; tema claro y oscuro.
- Layout: barra de pestañas inferior en móvil (< 768 px) y riel lateral en escritorio; rutas vacías para las cuatro secciones más `*` (página no encontrada).
- Componentes base: `Button`, `Field`, `Dialog`, `Toast` (región `aria-live`), `EmptyState`, `ProgressBar`, `StatusBadge`, `MonthSwitcher`, `ErrorBoundary`.
- `src/copy/strings.ts` con la guía de tono.

## Fuera de alcance
Lógica de datos, pantallas funcionales, PWA y `netlify.toml` (SPEC-08; aquí solo queda el archivo base con build y redirección).

## Requisitos visuales (tokens)

**Tema claro:**

| Token | Valor | Uso |
|---|---|---|
| `--color-ink-900` | `#1B2533` | Texto principal, encabezados |
| `--color-ink-600` | `#4A5668` | Texto secundario |
| `--color-bg` | `#FAF7F2` | Fondo |
| `--color-surface` | `#FFFFFF` | Tarjetas |
| `--color-surface-alt` | `#F2EDE4` | Secciones |
| `--color-border` | `#E3DCD0` | Bordes |
| `--color-accent` | `#4F7A65` | Verde salvia: acción principal y progreso (contraste 4.8:1 sobre blanco) |
| `--color-accent-soft` | `#E3ECE6` | Fondos de progreso |
| `--color-attention` | `#94662C` | Ocre: “cerca” y “por encima” (siempre con texto) |
| `--color-focus` | `#2F5D8A` | Anillo de foco de 2 px |

**Tema oscuro:** fondo `#12181F`, superficie `#1B232D`, texto `#ECE7DF`, acento `#8DB39E`, atención `#D6A15E`.

**Paleta de gráficas** (`colorKey`): `slate #3E5C76`, `sage #6B9080`, `ochre #C08A3E`, `clay #B5654A`, `plum #7A5C7E`, `teal #3F7F83`, `olive #8A8B4F`, `stone #8C8279`, `denim #5B7DB1`, `rose #A86A7B`. El gris “Otras” es `#B8B1A6`.

**Tipografía y espaciado:**
- Fuente: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Montos con `font-variant-numeric: tabular-nums`.
- Escala: 14 / 16 / 20 / 28 / 40 px. Espaciado en base 4 px. Radios de 10 y 16 px.

## Accesibilidad
- Contraste AA en texto y 3:1 en elementos gráficos.
- Foco visible en todos los elementos interactivos.
- Objetivos táctiles de 44 × 44 px como mínimo.
- `prefers-reduced-motion` respetado.
- `lang="es-MX"`.
- Enlace “Saltar al contenido”.
- Pestaña activa con `aria-current="page"`.

## Guía de tono (strings.ts)
- **Sí:** “Disponible”, “Por encima de lo planeado”, “Aún no hay movimientos este mes”.
- **No:** “¡Cuidado!”, “Gastaste de más”, “Te pasaste”, signos de exclamación de alarma, emojis de advertencia.

## Criterios de aceptación
1. `npm install && npm run validate` termina sin errores en un clon limpio.
2. `npm run dev` muestra las 4 secciones navegables en móvil (375 px) y escritorio (1280 px).
3. Sin scroll horizontal en 320 px.
4. Todos los tokens se usan vía variables; no hay colores fijos en los componentes (regla de lint o revisión).
5. El tema oscuro se activa con la preferencia del sistema.
6. Se puede recorrer la navegación completa solo con teclado.
7. Una ruta inexistente muestra una página amable con enlace a Captura.

## Pruebas
- Unitarias: render de `Button`, `Dialog` (trampa de foco y cierre con Esc) y `Toast` (anuncio en `aria-live`).
- E2E: navegación entre secciones en Chromium y WebKit móvil; verificación de ausencia de scroll horizontal.
- Revisión manual de contraste de cada token.

## Riesgos
- Dependencias con cambios mayores: se fijan con lockfile y se revisan las notas de versión al instalar.
