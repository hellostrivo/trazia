/** Máximo de rebanadas propias en una dona de distribución; el resto va al grupo agregado. */
export const DONUT_MAX_SLICES = 6;

/**
 * Nombre del grupo agregado en todas las donas (Configuración, Visualización y PDF).
 * "Otras" a secas se confundía con la categoría "Otros" de la semilla.
 */
export const OTHERS_LABEL = 'Otras categorías';

export interface DonutGrouping<T> {
  /** Las categorías principales (mayor a menor presupuesto), sin las de $0. */
  main: T[];
  /** Suma de las que no caben; 0 significa que no hay rebanada agregada. */
  othersCents: number;
}

/**
 * Regla única de la dona de distribución del plan (SPEC-02 y SPEC-06):
 * las `max` categorías **de mayor monto** son las principales y el resto se
 * agrupa en "Otras". Una categoría con $0 no aporta nada a la distribución,
 * así que no ocupa lugar ni en las principales ni en "Otras".
 *
 * El orden es estable: a igual monto se conserva el orden de entrada
 * (el configurado).
 */
export function groupDonutSlices<T extends { amountCents: number }>(
  items: readonly T[],
  max: number = DONUT_MAX_SLICES,
): DonutGrouping<T> {
  const sorted = items
    .filter((item) => item.amountCents > 0)
    .sort((left, right) => right.amountCents - left.amountCents);
  const main = sorted.slice(0, max);
  const othersCents = sorted.slice(max).reduce((sum, item) => sum + item.amountCents, 0);
  return { main, othersCents };
}
