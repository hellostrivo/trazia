import { normalizeName } from '../../domain/categories';

interface BusquedaConceptoProps {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Compara concepto y búsqueda con la misma normalización de SPEC-01
 * (sin acentos, sin mayúsculas, espacios colapsados) para que "cafe" encuentre "Café".
 */
export function matchesConcept(concept: string, query: string): boolean {
  const normalizedQuery = normalizeName(query);
  if (!normalizedQuery) return true;
  return normalizeName(concept).includes(normalizedQuery);
}

export function BusquedaConcepto({ value, onChange }: BusquedaConceptoProps) {
  return (
    <div className="field">
      <label htmlFor="movimientos-busqueda">Buscar por concepto</label>
      <input
        id="movimientos-busqueda"
        name="busqueda"
        type="search"
        autoComplete="off"
        placeholder="Ej. café"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
