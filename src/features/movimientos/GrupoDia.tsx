import { parseLocalDate } from '../../domain/dates';
import { formatMXN, sumCents } from '../../domain/money';
import type { Category, LocalDate, Transaction } from '../../domain/types';
import { MovimientoFila } from './MovimientoFila';

const dayFormatter = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function formatDayLabel(date: LocalDate): string {
  return dayFormatter.format(parseLocalDate(date));
}

interface GrupoDiaProps {
  date: LocalDate;
  transactions: Transaction[];
  categoriesById: Map<string, Category>;
  onSelect: (transaction: Transaction) => void;
}

export function GrupoDia({ date, transactions, categoriesById, onSelect }: GrupoDiaProps) {
  const subtotal = sumCents(transactions.map((transaction) => transaction.amountCents));
  const label = formatDayLabel(date);

  return (
    <section aria-label={label} style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--font-size-14)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-ink-600)',
          }}
        >
          {label}
        </h3>
        <span
          style={{
            color: 'var(--color-ink-600)',
            fontSize: 'var(--font-size-14)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Subtotal {formatMXN(subtotal)}
        </span>
      </div>

      <ul
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-2)' }}
      >
        {transactions.map((transaction) => {
          const category = categoriesById.get(transaction.categoryId);
          return (
            <MovimientoFila
              key={transaction.id}
              transaction={transaction}
              categoryName={category?.name ?? 'Sin categoría'}
              colorKey={category?.colorKey ?? 'stone'}
              archived={Boolean(category?.archivedAt)}
              onSelect={onSelect}
            />
          );
        })}
      </ul>
    </section>
  );
}
