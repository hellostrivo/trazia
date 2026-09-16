import React from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
}

export const ConceptoField = React.forwardRef<HTMLInputElement, Props>(({ value, onChange, error }, ref) => {
  return (
    <div className="field">
      <label>Concepto</label>
      <input
        ref={ref}
        name="concepto"
        maxLength={80}
        enterKeyHint="next"
        aria-invalid={!!error}
        aria-describedby={error ? 'concepto-error' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <div id="concepto-error" role="alert" className="field-error">
          {error}
        </div>
      )}
    </div>
  );
});

ConceptoField.displayName = 'ConceptoField';
