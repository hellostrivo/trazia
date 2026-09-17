import { parseLocalDate } from '../../domain/dates';
import { formatMXN } from '../../domain/money';
import type { Transaction } from '../../domain/types';

export function ResumenBrieve({ monthKey, transactions }: { monthKey: string; transactions: Transaction[] }) {
  const spent = transactions.reduce((s, t) => s + t.amountCents, 0);

  // `new Date('2026-09-01')` se interpreta en UTC y en husos negativos cae al mes anterior.
  const monthLabel = parseLocalDate(`${monthKey}-01`).toLocaleString('es-MX', { month: 'long' });

  return (
    <div className="resumen-brieve">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {/* h2: sigue al h1 "Captura" sin saltar nivel; el tamaño de h3 se conserva en CSS. */}
          <h2>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}:</h2>
          <p className="muted">{formatMXN(spent)} gastado</p>
        </div>
      </div>
    </div>
  );
}
