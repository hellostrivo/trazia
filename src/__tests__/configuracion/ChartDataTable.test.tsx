import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartDataTable } from '../../features/configuracion/ChartDataTable';

describe('ChartDataTable', () => {
  const mockData = [
    { id: '1', name: 'Hogar', colorKey: 'slate' as const, amountCents: 100000 },
    { id: '2', name: 'Supermercado', colorKey: 'sage' as const, amountCents: 50000 },
    { id: '3', name: 'Transporte', colorKey: 'ochre' as const, amountCents: 50000 },
  ];

  it('renders table with data', () => {
    render(<ChartDataTable data={mockData} totalCents={200000} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Hogar')).toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
  });

  it('displays correct amounts and percentages', () => {
    render(<ChartDataTable data={mockData} totalCents={200000} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Check for formatted amounts
    expect(screen.getByText(/\$1,000.00/)).toBeInTheDocument();
    expect(screen.getAllByText(/\$500.00/)).toHaveLength(2);
  });

  it('does not render when total is zero', () => {
    render(<ChartDataTable data={mockData} totalCents={0} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('does not render when data is empty', () => {
    render(<ChartDataTable data={[]} totalCents={200000} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('includes footer with total', () => {
    render(<ChartDataTable data={mockData} totalCents={200000} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
