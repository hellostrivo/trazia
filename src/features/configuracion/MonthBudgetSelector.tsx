import { addMonths, formatMonthLabel, today, monthKeyOf } from '../../domain/dates';
import { Button } from '../../components/Button';
import type { MonthKey } from '../../domain/types';

interface MonthBudgetSelectorProps {
  value: MonthKey;
  onChange: (monthKey: MonthKey) => void;
  label?: string;
}

export function MonthBudgetSelector({
  value,
  onChange,
  label = 'Presupuesto de',
}: MonthBudgetSelectorProps) {
  const handlePrev = () => onChange(addMonths(value, -1));
  const handleNext = () => onChange(addMonths(value, 1));
  const handleToday = () => onChange(monthKeyOf(today()));

  return (
    <div className="month-selector" role="group" aria-label={label}>
      <label className="month-selector-label">{label}:</label>
      <div className="month-selector-controls">
        <Button variant="ghost" onClick={handlePrev} aria-label="Mes anterior">
          ←
        </Button>
        <button
          type="button"
          className="month-selector-value"
          onClick={handleToday}
          aria-current={value === monthKeyOf(today()) ? 'date' : undefined}
        >
          {formatMonthLabel(value)}
        </button>
        <Button variant="ghost" onClick={handleNext} aria-label="Mes siguiente">
          →
        </Button>
      </div>
    </div>
  );
}
