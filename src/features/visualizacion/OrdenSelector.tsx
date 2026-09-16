type OrderValue = 'mayor-gasto' | 'configurado';

interface OrdenSelectorProps {
  value: OrderValue;
  onChange: (next: OrderValue) => void;
}

export function OrdenSelector({ value, onChange }: OrdenSelectorProps) {
  const options: { label: string; value: OrderValue }[] = [
    { label: 'Mayor gasto', value: 'mayor-gasto' },
    { label: 'Orden configurado', value: 'configurado' },
  ];

  return (
    <div
      role="group"
      aria-label="Orden del detalle"
      style={{
        display: 'inline-flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        padding: '0.375rem',
        border: '1px solid var(--color-border)',
        borderRadius: '0.75rem',
        background: 'var(--color-surface-alt)',
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            style={{
              minHeight: '2.5rem',
              border: 'none',
              borderRadius: '0.625rem',
              padding: '0.5rem 0.85rem',
              background: selected ? 'var(--color-surface)' : 'transparent',
              color: selected ? 'var(--color-ink-900)' : 'var(--color-ink-600)',
              fontWeight: selected ? 700 : 600,
              boxShadow: selected ? '0 0 0 1px var(--color-border)' : 'none',
              cursor: 'pointer',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
