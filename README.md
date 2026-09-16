# TRAZIA

Aplicación web personal para registrar gastos, definir presupuestos mensuales por categoría y ver con claridad cómo va el mes frente a lo planeado. Es privada por diseño: toda la información vive en el dispositivo de la persona usuaria.

> Estado: **documentación y SPECS en revisión.** Los comandos de abajo estarán disponibles al completar el SPEC-00.

## Secciones

| Sección | Qué hace |
|---|---|
| **Captura** | Registrar un gasto en segundos: monto, concepto, categoría y fecha (hoy por defecto) |
| **Visualización** | Total del mes, presupuesto contra gasto por categoría, gráficas y exportación a Excel |
| **Movimientos** | Consultar, editar y eliminar gastos del mes |
| **Configuración** | Categorías, presupuestos mensuales, plan en PDF, respaldo y privacidad |

## Requisitos previos

- Node.js 24 LTS (ver `.nvmrc`) y npm, que se incluye con Node.
- Git.
- Navegador actual: Safari en iOS, Chrome, Edge o Firefox.

## Instalación

```bash
cd ~/Desktop/TRAZIA/repo_trazia
npm install
```

No se requieren variables de entorno para ejecutar la app. Consulta `.env.example`.

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor local en `http://localhost:5173` |
| `npm run dev -- --host` | Igual, accesible desde el iPhone en la misma red Wi-Fi |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Sirve la compilación de producción localmente |
| `npm run typecheck` | Verificación de TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Pruebas unitarias y de componentes (Vitest) |
| `npm run test:e2e` | Pruebas de extremo a extremo (Playwright: Chromium y WebKit) |
| `npm run validate` | typecheck, lint, test y build en secuencia |

## Despliegue

Sitio estático en Netlify con la configuración de `netlify.toml`. Los pasos están en [`docs/deployment.md`](docs/deployment.md).

## Documentación

- [Product brief](docs/product-brief.md)
- [Arquitectura](docs/architecture.md)
- [SPECS](docs/specs/README.md)
- [Decisiones](docs/decisions.md)
- [Despliegue](docs/deployment.md)
- [Reglas para agentes](CLAUDE.md)

## Privacidad

TRAZIA no tiene servidor, cuentas, analítica ni publicidad. Los datos se guardan en IndexedDB del navegador. Si borras los datos del sitio o dejas de usarlo por un tiempo en Safari sin haberlo instalado, podrías perderlos. Por eso conviene instalar la app en la pantalla de inicio y descargar respaldos periódicos desde **Configuración › Datos y respaldo**.
