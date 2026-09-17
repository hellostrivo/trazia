import { useState } from 'react';
import { Button } from '../../components/Button';
import type { Category, ChartColorKey } from '../../domain/types';

interface ArchivadaSectionProps {
  archivedCategories: Category[];
  onRestore: (id: string, name: string, colorKey: ChartColorKey) => Promise<void>;
}

const colorMap: Record<ChartColorKey, string> = {
  slate: 'var(--color-chart-slate)',
  sage: 'var(--color-chart-sage)',
  ochre: 'var(--color-chart-ochre)',
  clay: 'var(--color-chart-clay)',
  plum: 'var(--color-chart-plum)',
  teal: 'var(--color-chart-teal)',
  olive: 'var(--color-chart-olive)',
  stone: 'var(--color-chart-stone)',
  denim: 'var(--color-chart-denim)',
  rose: 'var(--color-chart-rose)',
};

export function ArchivadaSection({ archivedCategories, onRestore }: ArchivadaSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (id: string, name: string, colorKey: ChartColorKey) => {
    setRestoringId(id);
    try {
      await onRestore(id, name, colorKey);
    } finally {
      setRestoringId(null);
    }
  };

  if (archivedCategories.length === 0) {
    return null;
  }

  return (
    <section className="archivada-section">
      <button
        type="button"
        className="archivada-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="archivada-list"
      >
        <span>Archivadas ({archivedCategories.length})</span>
        <span className="archivada-toggle-icon">{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div
          className="archivada-list"
          id="archivada-list"
          role="region"
          aria-label="Categorías archivadas"
        >
          {archivedCategories.map((category) => (
            <div key={category.id} className="archivada-item">
              <div
                className="archivada-color"
                style={{ backgroundColor: colorMap[category.colorKey] }}
                aria-hidden="true"
              ></div>
              <span className="archivada-name">{category.name}</span>
              <Button
                variant="secondary"
                onClick={() => handleRestore(category.id, category.name, category.colorKey)}
                disabled={restoringId === category.id}
                aria-label={`Restaurar ${category.name}`}
              >
                {restoringId === category.id ? 'Restaurando…' : 'Restaurar'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
