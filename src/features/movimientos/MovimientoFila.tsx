import { formatMXN } from '../../domain/money';
import type { ChartColorKey, Transaction } from '../../domain/types';

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

/** Id estable del botón de cada fila: permite devolverle el foco al cerrar el diálogo. */
export function movimientoFilaId(transactionId: string): string {
  return `movimiento-fila-${transactionId}`;
}

interface MovimientoFilaProps {
  transaction: Transaction;
  categoryName: string;
  colorKey: ChartColorKey;
  archived: boolean;
  onSelect: (transaction: Transaction) => void;
}

export function MovimientoFila({
  transaction,
  categoryName,
  colorKey,
  archived,
  onSelect,
}: MovimientoFilaProps) {
  const amount = formatMXN(transaction.amountCents);
  const categoryLabel = archived ? `${categoryName} (archivada)` : categoryName;

  return (
    <li>
      <button
        type="button"
        id={movimientoFilaId(transaction.id)}
        onClick={() => onSelect(transaction)}
        aria-label={`Editar ${transaction.concept}, ${categoryLabel}, ${amount}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 'var(--space-3)',
          width: '100%',
          padding: 'var(--space-3) var(--space-4)',
          textAlign: 'left',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          color: 'var(--color-ink-900)',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'grid', gap: 'var(--space-1)', minWidth: 0 }}>
          <span
            style={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {transaction.concept}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: 'var(--color-ink-600)',
              fontSize: 'var(--font-size-14)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '999px',
                background: colorMap[colorKey],
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>{categoryLabel}</span>
          </span>
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{amount}</span>
      </button>
    </li>
  );
}
