import { formatMXN } from '../../domain/money';
import { Button } from '../../components/Button';
import type { ChartColorKey, Cents } from '../../domain/types';

interface CategoriaRowProps {
  id: string;
  name: string;
  colorKey: ChartColorKey;
  budgetCents: Cents;
  percentage: number | null;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}

const colorMap: Record<ChartColorKey, string> = {
  slate: 'var(--color-chart-slate)',
  sage: 'var(--color-chart-sage)',
  ochre: 'var(--color-chart-ochre)',
  clay: 'var(--color-chart-clay)',
  plum: 'var(--color-chart-plum)',
  teal: 'var(--color-chart-teal)',
  olive: 'var(--color-chart-olive)',
  stone: 'var(--color-chart-stone)',
  denim: 'var(--color-chart-denim)',
  rose: 'var(--color-chart-rose)',
};

export function CategoriaRow({
  id,
  name,
  colorKey,
  budgetCents,
  percentage,
  isFirst,
  isLast,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: CategoriaRowProps) {
  return (
    // <li> y no role="row": la fila no es tabular (sin columnas ni encabezados);
    // con role="row" los botones necesitarían una celda y Lighthouse lo marcaba.
    <li className="categoria-row">
      <div
        className="categoria-row-color"
        style={{ backgroundColor: colorMap[colorKey] }}
        aria-hidden="true"
      ></div>
      <div className="categoria-row-content">
        <span className="categoria-row-name">{name}</span>
        <span className="categoria-row-details">
          {formatMXN(budgetCents)} {percentage !== null && `(${Math.round(percentage)}%)`}
        </span>
      </div>
      <div className="categoria-row-actions">
        <Button variant="ghost" onClick={() => onEdit(id)} aria-label={`Editar ${name}`}>
          Editar
        </Button>
        <Button
          variant="ghost"
          onClick={() => onMoveUp(id)}
          disabled={isFirst}
          aria-label={`Subir ${name}`}
          title={isFirst ? 'No se puede subir más' : undefined}
        >
          ↑
        </Button>
        <Button
          variant="ghost"
          onClick={() => onMoveDown(id)}
          disabled={isLast}
          aria-label={`Bajar ${name}`}
          title={isLast ? 'No se puede bajar más' : undefined}
        >
          ↓
        </Button>
        <Button variant="ghost" onClick={() => onDelete(id)} aria-label={`Eliminar ${name}`}>
          Eliminar
        </Button>
      </div>
    </li>
  );
}
