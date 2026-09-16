import { formatMXN } from '../../domain/money';

interface PieTotalesProps {
  count: number;
  totalCents: number;
}

export function PieTotales({ count, totalCents }: PieTotalesProps) {
  const countLabel = count === 1 ? '1 movimiento' : `${count} movimientos`;

  return (
    <p
      role="status"
      aria-live="polite"
      className="muted"
      style={{
        margin: 0,
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--color-border)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {`${countLabel} · ${formatMXN(totalCents)}`}
    </p>
  );
}
