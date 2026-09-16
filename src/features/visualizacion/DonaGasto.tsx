import { formatMXN } from '../../domain/money';
import type { MonthSummaryRow } from '../../domain/types';

const colorMap = {
  slate: 'var(--color-graph-slate)',
  sage: 'var(--color-graph-sage)',
  ochre: 'var(--color-graph-ochre)',
  clay: 'var(--color-graph-clay)',
  plum: 'var(--color-graph-plum)',
  teal: 'var(--color-graph-teal)',
  olive: 'var(--color-graph-olive)',
  stone: 'var(--color-graph-stone)',
  denim: 'var(--color-graph-denim)',
  rose: 'var(--color-graph-rose)',
} as const;

export function DonaGasto({ rows }: { rows: MonthSummaryRow[] }) {
  const categories = [...rows].filter((row) => row.spentCents > 0).sort((a, b) => b.spentCents - a.spentCents);

  if (categories.length === 0) {
    return <div style={{ color: 'var(--color-ink-600)' }}>Sin gastos en este mes.</div>;
  }

  const top = categories.slice(0, 5);
  const others = categories.slice(5);
  const chartEntries = others.length > 0
    ? [...top, { categoryId: 'otros', name: 'Otras', spentCents: others.reduce((sum, item) => sum + item.spentCents, 0), colorKey: 'stone' as const, budgetCents: 0, availableCents: 0, ratio: null, status: 'sin-actividad', shareOfSpent: 0 }]
    : top;

  const totalSpent = chartEntries.reduce((sum, item) => sum + item.spentCents, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  let strokeOffset = 0;
  const label = chartEntries
    .map((item) => `${item.name} ${Math.round((item.spentCents / totalSpent) * 100)} %`)
    .join(', ');

  return (
    <figure role="img" aria-label={`Gasto del mes: ${label}`} style={{ margin: 0, display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', justifyItems: 'center' }}>
        <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true" style={{ maxWidth: '100%' }}>
          <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--color-surface-alt)" strokeWidth="18" />
          {chartEntries.map((entry) => {
            const length = (entry.spentCents / totalSpent) * circumference;
            const dash = `${length} ${circumference - length}`;
            const circle = (
              <circle
                key={entry.categoryId}
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={colorMap[entry.colorKey] ?? 'var(--color-graph-otros)'}
                strokeWidth="18"
                strokeDasharray={dash}
                strokeDashoffset={-strokeOffset}
                strokeLinecap="round"
                transform="rotate(-90 110 110)"
              />
            );
            strokeOffset += length;
            return circle;
          })}
          <text x="110" y="105" textAnchor="middle" fill="var(--color-ink-900)" fontSize="22" fontWeight="700">
            {formatMXN(totalSpent)}
          </text>
          <text x="110" y="128" textAnchor="middle" fill="var(--color-ink-600)" fontSize="12">
            Total
          </text>
        </svg>
      </div>

      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {chartEntries.map((entry) => {
          const pct = totalSpent === 0 ? 0 : Math.round((entry.spentCents / totalSpent) * 100);
          return (
            <div key={entry.categoryId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '999px', background: colorMap[entry.colorKey] ?? 'var(--color-graph-otros)', display: 'inline-block' }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--color-ink-600)', fontVariantNumeric: 'tabular-nums' }}>
                <span>{formatMXN(entry.spentCents)}</span>
                <span>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
