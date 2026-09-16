import { ProgressBar } from '../../components/ProgressBar';
import { StatusBadge } from '../../components/StatusBadge';
import { formatMXN } from '../../domain/money';
import { monthKeyOf, today } from '../../domain/dates';
import type { MonthSummary } from '../../domain/types';
import { ContextoDia } from './ContextoDia';

export function TarjetaPrincipal({ summary, monthKey }: { summary: MonthSummary; monthKey: string }) {
  const totalSpent = summary.totalSpentCents;
  const totalBudget = summary.totalBudgetCents;
  const totalAvailable = summary.totalAvailableCents;
  const progress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const isCurrentMonth = monthKeyOf(today()) === monthKey;
  const isAbove = totalAvailable < 0;
  const displayBudget = totalBudget === 0 ? 'Sin presupuesto' : formatMXN(totalBudget);

  return (
    <section
      aria-label="Tarjeta principal del mes"
      style={{
        display: 'grid',
        gap: '1rem',
        padding: '1.5rem',
        border: '1px solid var(--color-border)',
        borderRadius: '1rem',
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--color-ink-600)', fontWeight: 600 }}>Gastado</div>
          <div style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {formatMXN(totalSpent)}
          </div>
        </div>
        {isCurrentMonth ? <ContextoDia monthKey={monthKey} /> : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.875rem 1rem', background: 'var(--color-surface-alt)' }}>
          <div style={{ color: 'var(--color-ink-600)', fontSize: '0.875rem' }}>Planeado</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{displayBudget}</div>
        </div>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.875rem 1rem', background: 'var(--color-surface-alt)' }}>
          <div style={{ color: 'var(--color-ink-600)', fontSize: '0.875rem' }}>{isAbove ? 'Por encima de lo planeado' : 'Disponible'}</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
            {isAbove ? `-${formatMXN(Math.abs(totalAvailable))}` : formatMXN(totalAvailable)}
          </div>
        </div>
      </div>

      <div>
        <ProgressBar value={progress} max={100} label="Avance del presupuesto" />
      </div>

      {isAbove ? (
        <StatusBadge tone="warning">{`Por encima de lo planeado: ${formatMXN(Math.abs(totalAvailable))}`}</StatusBadge>
      ) : totalBudget === 0 && totalSpent > 0 ? (
        <div style={{ color: 'var(--color-ink-600)' }}>Asigna presupuestos en Configuración para comparar con tu plan.</div>
      ) : totalBudget > 0 && totalSpent === 0 ? (
        <div style={{ color: 'var(--color-ink-600)' }}>Disponible {formatMXN(totalAvailable)}</div>
      ) : null}
    </section>
  );
}
