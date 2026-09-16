import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DonaChart } from '../../features/configuracion/DonaChart';

describe('DonaChart', () => {
  const mockData = [
    { id: '1', name: 'Hogar', colorKey: 'slate' as const, amountCents: 100000 },
    { id: '2', name: 'Supermercado', colorKey: 'sage' as const, amountCents: 50000 },
    { id: '3', name: 'Transporte', colorKey: 'ochre' as const, amountCents: 50000 },
  ];

  it('renders chart with data', () => {
    render(<DonaChart data={mockData} totalCents={200000} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Hogar')).toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
  });

  it('does not render when total is zero', () => {
    render(<DonaChart data={mockData} totalCents={0} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not render when data is empty', () => {
    render(<DonaChart data={[]} totalCents={200000} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('groups more than 6 categories into Otros', () => {
    const manyCategories = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      name: `Category ${i}`,
      colorKey: 'slate' as const,
      amountCents: 10000,
    }));

    const { container } = render(<DonaChart data={manyCategories} totalCents={80000} />);

    expect(screen.getByText('Otras categorías')).toBeInTheDocument();
    // El agregado usa su propio token, no el color de ninguna categoría (todas son stone aquí).
    const items = Array.from(container.querySelectorAll('.dona-legend-item'));
    const others = items.find((item) => item.textContent?.includes('Otras categorías'));
    const swatch = others?.querySelector<HTMLElement>('.dona-legend-color');
    expect(swatch?.style.backgroundColor).toBe('var(--color-graph-otros)');
  });

  it('shows percentage and rounding note', () => {
    render(<DonaChart data={mockData} totalCents={200000} />);

    expect(screen.getByText('Los porcentajes están redondeados')).toBeInTheDocument();
  });
});
