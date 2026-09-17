import { z } from 'zod';

/**
 * SPEC-08: Zod v4 sondea `new Function('')` al definir cada esquema de objeto
 * para decidir si compila validadores (JIT). Bajo la CSP (`script-src` sin
 * 'unsafe-eval') el error se captura, pero el navegador emite igualmente una
 * violación de CSP. Sin JIT valida igual, sólo interpretado.
 *
 * Debe evaluarse antes que cualquier módulo con esquemas: por eso es el primer
 * `import` de main.tsx (los imports se evalúan en orden, en profundidad).
 */
z.config({ jitless: true });
