import React from 'react';
import type { Category } from '../../domain/types';

interface Props {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
  error?: string | undefined;
}

export function CategoriaChips({ categories, value, onChange, error }: Props) {
  const groupLabelId = 'categoria-chips-label';

  return (
    <div className="field">
      <span id={groupLabelId} style={{ fontWeight: 600 }}>Categoría</span>
      <div role="radiogroup" aria-labelledby={groupLabelId} aria-label="Categorías" className="categoria-chips" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            role="radio"
            aria-checked={value === cat.id}
            onClick={() => onChange(cat.id)}
            className={`chip${value === cat.id ? ' selected' : ''}`}
            aria-label={cat.name}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {error && (
        <div id="categoria-error" role="alert" className="field-error">
          {error}
        </div>
      )}
    </div>
  );
}
