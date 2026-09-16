import type { Category } from '../../domain/types';

interface FiltroCategoriaProps {
  categories: Category[];
  /** Categorías con al menos un movimiento en el mes visible. */
  categoryIdsWithMovements: string[];
  value: string | null;
  onChange: (next: string | null) => void;
}

export const TODAS_LAS_CATEGORIAS = 'todas';

/**
 * Muestra las categorías activas y, además, las archivadas que tienen
 * movimientos en el mes visible (para poder filtrarlas sin resucitarlas).
 */
export function visibleFilterCategories(
  categories: Category[],
  categoryIdsWithMovements: string[],
  selectedId: string | null,
): Category[] {
  const withMovements = new Set(categoryIdsWithMovements);
  return categories.filter(
    (category) =>
      !category.archivedAt || withMovements.has(category.id) || category.id === selectedId,
  );
}

export function FiltroCategoria({
  categories,
  categoryIdsWithMovements,
  value,
  onChange,
}: FiltroCategoriaProps) {
  const options = visibleFilterCategories(categories, categoryIdsWithMovements, value);

  return (
    <div className="field">
      <label htmlFor="movimientos-filtro-categoria">Categoría</label>
      <select
        id="movimientos-filtro-categoria"
        name="categoria"
        value={value ?? TODAS_LAS_CATEGORIAS}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === TODAS_LAS_CATEGORIAS ? null : next);
        }}
      >
        <option value={TODAS_LAS_CATEGORIAS}>Todas las categorías</option>
        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.archivedAt ? `${category.name} (archivada)` : category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
