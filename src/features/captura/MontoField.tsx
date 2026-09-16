import React from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
}

export const MontoField = React.forwardRef<HTMLInputElement, Props>(({ value, onChange, error }, ref) => {
  return (
    <div className="field">
      <label htmlFor="monto-field">Monto</label>
      <input
        id="monto-field"
        ref={ref}
        name="monto"
        inputMode="decimal"
        aria-invalid={!!error}
        aria-describedby={error ? 'monto-error' : undefined}
        placeholder="$0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontSize: '16px' }}
      />
      {error && (
        <div id="monto-error" role="alert" className="field-error">
          {error}
        </div>
      )}
    </div>
  );
});

MontoField.displayName = 'MontoField';
