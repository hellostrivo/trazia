import { formatMXN } from '../../domain/money';
import type { MonthSummary, MonthSummaryRow } from '../../domain/types';
import { OrdenSelector } from './OrdenSelector';

function compareRows(a: MonthSummaryRow, b: MonthSummaryRow) {
  return b.spentCents - a.spentCents;
}

export function TablaDetalle({
  summary,
  order,
  onOrderChange,
}: {
  summary: MonthSummary;
  monthKey: string;
  order: 'mayor-gasto' | 'configurado';
  onOrderChange: (next: 'mayor-gasto' | 'configurado') => void;
}) {
  const rows = order === 'mayor-gasto' ? [...summary.rows].sort(compareRows) : [...summary.rows].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section aria-label="Detalle del mes" style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Detalle por categoría</h2>
        <OrdenSelector value={order} onChange={onOrderChange} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--color-ink-600)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Categoría</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Presupuesto</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Gastado</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Disponible / Por encima</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tone = row.availableCents >= 0 ? 'var(--color-ink-900)' : 'var(--color-attention)';
              return (
                <tr key={row.categoryId} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '999px', background: 'var(--color-graph-slate)', display: 'inline-block' }} />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(row.budgetCents)}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(row.spentCents)}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: tone, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {row.availableCents >= 0 ? formatMXN(row.availableCents) : `-${formatMXN(Math.abs(row.availableCents))}`}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
              <td style={{ padding: '0.75rem 0.5rem' }}>Total</td>
              <td style={{ padding: '0.75rem 0.5rem', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(summary.totalBudgetCents)}</td>
              <td style={{ padding: '0.75rem 0.5rem', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(summary.totalSpentCents)}</td>
              <td style={{ padding: '0.75rem 0.5rem', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(summary.totalAvailableCents)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gap: '0.75rem', paddingTop: '0.5rem' }}>
        {rows.map((row) => (
          <div key={row.categoryId} style={{ display: 'grid', gap: '0.25rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.75rem', background: 'var(--color-surface-alt)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <strong>{row.name}</strong>
              <span style={{ color: row.availableCents >= 0 ? 'var(--color-ink-900)' : 'var(--color-attention)' }}>
                {row.availableCents >= 0 ? formatMXN(row.availableCents) : `-${formatMXN(Math.abs(row.availableCents))}`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', color: 'var(--color-ink-600)' }}>
              <span>Presupuesto</span>
              <span>{formatMXN(row.budgetCents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', color: 'var(--color-ink-600)' }}>
              <span>Gastado</span>
              <span>{formatMXN(row.spentCents)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
