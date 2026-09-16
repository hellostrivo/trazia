interface MonthSwitcherProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
}

export function MonthSwitcher({ label, value, onChange }: MonthSwitcherProps) {
  return (
    <div className="month-switcher" aria-label={label}>
      <button type="button" aria-label="Mes anterior" onClick={() => onChange('prev')}>
        ←
      </button>
      <span>{value}</span>
      <button type="button" aria-label="Mes siguiente" onClick={() => onChange('next')}>
        →
      </button>
    </div>
  );
}
