# CLAUDE.md — Reglas de trabajo para agentes en TRAZIA

Este archivo lo lee Claude Code al abrir el repositorio. Sus reglas son obligatorias.

## Raíz autorizada

- Raíz local: `~/Desktop/TRAZIA/repo_trazia` (en Finder aparece como Escritorio › TRAZIA › repo_trazia).
- Repositorio remoto previsto: `https://github.com/hellostrivo/trazia`.
- Antes de modificar cualquier archivo, confirma con `pwd` que estás en esta raíz.

## Límites estrictos

- Trabaja solo dentro de esta carpeta. No uses `../`, rutas absolutas externas, directorios globales ni comandos recursivos fuera de la raíz.
- No leas, copies ni reutilices nada de Strivo ni de otros proyectos: código, assets, textos, tokens, nombres, configuraciones o datos.
- No modifiques configuraciones globales (`git config --global`, npm global, SSH, credenciales, sistema).
- Instala dependencias solo localmente con `npm install <paquete>`. Nunca uses `-g`. Conserva `package.json` y `package-lock.json`.
- No hagas `git push`, despliegues, cambios en GitHub ni en Netlify sin instrucción expresa de la persona usuaria.
- No ejecutes acciones destructivas o de alcance incierto, como `rm -rf` amplios, `git clean -fdx` o `git reset --hard`.
- Si una tarea requiere salir del proyecto, detente, explica qué recurso afectaría y espera autorización.
- Los Excel de referencia (“Control mensual”, “Límite de gastos por mes”) son de solo lectura. No se incluyen en el repositorio.

## Forma de trabajo

1. Implementa solo el SPEC aprobado (ver `docs/specs/`). Nada de refactors generales ni funciones no solicitadas.
2. Al terminar cada bloque:
   - ejecuta `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` (y `npm run test:e2e` cuando exista);
   - reporta los archivos creados o modificados, qué cambió y por qué, el resultado de las validaciones y los pendientes;
   - registra en `docs/decisions.md` cualquier decisión nueva.
3. Las decisiones que afecten arquitectura, modelo de datos, privacidad, costos o UX se consultan antes de implementarse.

## Principios del producto

- Privado por diseño: datos solo en el dispositivo; sin analítica, publicidad, rastreo ni servicios externos.
- Lenguaje neutral y no juzgante: nada de mensajes alarmistas, moralizantes o culpabilizantes.
- Dinero siempre en centavos enteros (MXN). Los cálculos viven en `src/domain/` y tienen pruebas.
