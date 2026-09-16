interface MonthSwitcherProps {
  label: string;
  value: string;
  onChange: (next: 'prev' | 'next') => void;
  disablePrev?: boolean;
  disableNext?: boolean;
}

export function MonthSwitcher({
  label,
  value,
  onChange,
  disablePrev = false,
  disableNext = false,
}: MonthSwitcherProps) {
  return (
    <div className="month-switcher" aria-label={label}>
      <button type="button" aria-label="Mes anterior" onClick={() => onChange('prev')} disabled={disablePrev} aria-disabled={disablePrev}>
        ←
      </button>
      <span>{value}</span>
      <button type="button" aria-label="Mes siguiente" onClick={() => onChange('next')} disabled={disableNext} aria-disabled={disableNext}>
        →
      </button>
    </div>
  );
}
