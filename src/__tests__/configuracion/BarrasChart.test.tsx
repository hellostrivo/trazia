import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarrasChart } from '../../features/configuracion/BarrasChart';

describe('BarrasChart', () => {
  const mockData = [
    { id: '1', name: 'Hogar', colorKey: 'slate' as const, amountCents: 100000 },
    { id: '2', name: 'Supermercado', colorKey: 'sage' as const, amountCents: 50000 },
    { id: '3', name: 'Transporte', colorKey: 'ochre' as const, amountCents: 50000 },
  ];

  it('renders bars sorted by amount', () => {
    render(<BarrasChart data={mockData} totalCents={200000} />);

    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(3);
    expect(bars[0]).toHaveAttribute('aria-valuenow', '50');
    expect(bars[1]).toHaveAttribute('aria-valuenow', '25');
  });

  it('does not render when total is zero', () => {
    render(<BarrasChart data={mockData} totalCents={0} />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('does not render when data is empty', () => {
    render(<BarrasChart data={[]} totalCents={200000} />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows percentages and rounding note', () => {
    render(<BarrasChart data={mockData} totalCents={200000} />);

    expect(screen.getByText('Los porcentajes están redondeados')).toBeInTheDocument();
  });
});
