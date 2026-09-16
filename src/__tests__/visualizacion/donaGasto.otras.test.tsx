import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DonaGasto } from '../../features/visualizacion/DonaGasto';
import type { MonthSummaryRow } from '../../domain/types';

const row = (i: number): MonthSummaryRow => ({
  categoryId: `c${i}`,
  name: `Cat ${i}`,
  colorKey: 'stone',
  budgetCents: 0,
  spentCents: 1000 * (i + 1),
  availableCents: 0,
  ratio: null,
  status: 'sin-presupuesto',
  shareOfSpent: 0,
});

describe('DonaGasto: grupo agregado', () => {
  it('se llama "Otras categorías" y usa el token --color-graph-otros', () => {
    render(<DonaGasto rows={Array.from({ length: 7 }, (_, i) => row(i))} />);
    const label = screen.getByText('Otras categorías');
    const swatch = label.previousElementSibling as HTMLElement;
    expect(swatch.style.background).toBe('var(--color-graph-otros)');
  });
});
