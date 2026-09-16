import { monthKeyOf, today } from '../../domain/dates';

export function ContextoDia({ monthKey }: { monthKey: string }) {
  const currentMonthKey = monthKeyOf(today());
  if (monthKey !== currentMonthKey) {
    return null;
  }

  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = new Date().getDate();
  const daysInMonth = new Date(year, month, 0).getDate();

  return (
    <div
      aria-live="polite"
      style={{
        color: 'var(--color-ink-600)',
        fontSize: '0.875rem',
        fontWeight: 600,
        marginTop: '0.5rem',
      }}
    >
      Día {day} de {daysInMonth}
    </div>
  );
}
