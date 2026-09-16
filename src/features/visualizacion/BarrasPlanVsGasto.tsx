import { formatMXN } from '../../domain/money';
import type { MonthSummaryRow, SummaryStatus } from '../../domain/types';
import { StatusBadge } from '../../components/StatusBadge';

function statusText(status: SummaryStatus): string {
  switch (status) {
    case 'en-plan':
      return 'En plan';
    case 'cerca':
      return 'Cerca del límite';
    case 'por-encima':
      return 'Por encima';
    case 'sin-presupuesto':
      return 'Sin presupuesto';
    default:
      return 'Sin actividad';
  }
}

function statusTone(status: SummaryStatus): 'success' | 'warning' {
  return status === 'por-encima' ? 'warning' : 'success';
}

export function BarrasPlanVsGasto({ rows }: { rows: MonthSummaryRow[] }) {
  const visibleRows = [...rows]
    .filter((row) => row.spentCents > 0 || row.budgetCents > 0)
    .sort((a, b) => b.spentCents - a.spentCents);

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <div role="img" aria-label="Plan versus gasto por categoría" style={{ display: 'grid', gap: '1rem' }}>
      {visibleRows.map((row) => {
        const ratio = row.budgetCents > 0 ? Math.min((row.spentCents / row.budgetCents) * 100, 100) : 0;
        const width = row.budgetCents > 0 ? Math.max(ratio, 6) : row.spentCents > 0 ? 100 : 0;
        const barColor = row.status === 'por-encima' ? 'var(--color-attention)' : 'var(--color-accent)';

        return (
          <div key={row.categoryId} style={{ display: 'grid', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{row.name}</span>
                {row.status === 'sin-presupuesto' ? <span style={{ color: 'var(--color-ink-600)' }}>(sin presupuesto)</span> : null}
              </div>
              <StatusBadge tone={statusTone(row.status)}>{statusText(row.status)}</StatusBadge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 8rem', gap: '0.75rem', alignItems: 'center' }}>
              <div
                aria-label={`${row.name}: gasto ${formatMXN(row.spentCents)} de ${formatMXN(row.budgetCents)}`}
                style={{
                  position: 'relative',
                  height: '0.75rem',
                  borderRadius: '999px',
                  background: 'var(--color-surface-alt)',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: '0 auto 0 0',
                    width: `${width}%`,
                    background: barColor,
                    borderRadius: 'inherit',
                  }}
                />
              </div>

              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-ink-600)' }}>
                {formatMXN(row.spentCents)} / {formatMXN(row.budgetCents || 0)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
