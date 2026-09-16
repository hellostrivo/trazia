import { formatMXN } from '../../domain/money';
import type { Transaction } from '../../domain/types';

export function UltimosMovimientos({ transactions }: { transactions: Transaction[] }) {
  const latest = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);

  return (
    <section className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Últimos movimientos</h2>
        <a href="/movimientos">Ver todos</a>
      </div>

      <ul>
        {latest.map((t) => (
          <li key={t.id} className="row" style={{ justifyContent: 'space-between' }}>
            <span>{t.concept}</span>
            <span className="muted">{formatMXN(t.amountCents)}</span>
          </li>
        ))}
        {latest.length === 0 && <li className="muted">No hay movimientos este mes</li>}
      </ul>
    </section>
  );
}
