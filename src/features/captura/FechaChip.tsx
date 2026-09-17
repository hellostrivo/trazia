import React, { useRef, useState } from 'react';
import { today } from '../../domain/dates';

interface Props {
  value: string;
  onChange: (d: string) => void;
  error?: string | undefined;
}

export function FechaChip({ value, onChange, error }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showInput, setShowInput] = useState(false);

  const max = today();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (new Date(v) > new Date(max)) return;
    onChange(v);
  };

  // Una sola opción marcada a la vez: "Cambiar" mientras el selector está
  // abierto o la fecha no es hoy; "Hoy" en el resto de casos.
  const cambiarActivo = showInput || value !== max;
  const hoyActivo = !cambiarActivo;

  return (
    <div className="field">
      <label htmlFor={showInput ? 'fecha-chip-input' : undefined}>Fecha</label>
      <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => { setShowInput(false); onChange(today()); }}
          aria-label="Hoy"
          aria-pressed={hoyActivo}
          className={`chip${hoyActivo ? ' selected' : ''}`}
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => { setShowInput((s) => !s); setTimeout(() => inputRef.current?.focus(), 50); }}
          aria-label="Cambiar"
          aria-pressed={cambiarActivo}
          className={`chip${cambiarActivo ? ' selected' : ''}`}
        >
          Cambiar
        </button>
        {showInput && (
          <input id="fecha-chip-input" ref={inputRef} type="date" max={max} value={value} onChange={handleChange} aria-invalid={!!error} aria-describedby={error ? 'fecha-error' : undefined} />
        )}
      </div>
      {error && (
        <div id="fecha-error" role="alert" className="field-error">
          {error}
        </div>
      )}
    </div>
  );
}
