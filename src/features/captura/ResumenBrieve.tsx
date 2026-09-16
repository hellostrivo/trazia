import { formatMXN } from '../../domain/money';
import type { Transaction } from '../../domain/types';

export function ResumenBrieve({ monthKey, transactions }: { monthKey: string; transactions: Transaction[] }) {
  const spent = transactions.reduce((s, t) => s + t.amountCents, 0);

  const monthLabel = new Date(monthKey + '-01').toLocaleString('es-MX', { month: 'long' });

  return (
    <div className="resumen-brieve">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}:</h3>
          <p className="muted">{formatMXN(spent)} gastado</p>
        </div>
      </div>
    </div>
  );
}
