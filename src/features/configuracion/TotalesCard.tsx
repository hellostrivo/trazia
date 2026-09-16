import { formatMXN } from '../../domain/money';
import type { Cents } from '../../domain/types';

interface TotalesCardProps {
  totalBudgetCents: Cents;
  categoriesWithBudgetCount: number;
}

export function TotalesCard({ totalBudgetCents, categoriesWithBudgetCount }: TotalesCardProps) {
  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div className="totales-card">
        <div className="totales-card-item">
          <span className="totales-card-label">Plan mensual</span>
          <span className="totales-card-value">{formatMXN(totalBudgetCents)}</span>
        </div>
        <div className="totales-card-divider"></div>
        <div className="totales-card-item">
          <span className="totales-card-label">Categorías con presupuesto</span>
          <span className="totales-card-value">{categoriesWithBudgetCount}</span>
        </div>
      </div>
    </div>
  );
}
