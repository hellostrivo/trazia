import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TotalesCard } from '../../features/configuracion/TotalesCard';

describe('TotalesCard', () => {
  it('renders total budget and count', () => {
    render(<TotalesCard totalBudgetCents={300000} categoriesWithBudgetCount={5} />);

    expect(screen.getByText('Plan mensual')).toBeInTheDocument();
    expect(screen.getByText(/\$3,000.00/)).toBeInTheDocument();
    expect(screen.getByText('Categorías con presupuesto')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders zero values correctly', () => {
    render(<TotalesCard totalBudgetCents={0} categoriesWithBudgetCount={0} />);

    expect(screen.getByText(/\$0.00/)).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
