import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TarjetaPrincipal } from '../../features/visualizacion/TarjetaPrincipal';
import { TablaDetalle } from '../../features/visualizacion/TablaDetalle';
import { OrdenSelector } from '../../features/visualizacion/OrdenSelector';
import type { MonthSummary } from '../../domain/types';

describe('visualización', () => {
  const summary: MonthSummary = {
    monthKey: '2026-09',
    totalBudgetCents: 15000,
    totalSpentCents: 9500,
    totalAvailableCents: 5500,
    rows: [
      {
        categoryId: 'c1',
        name: 'Hogar',
        colorKey: 'slate',
        budgetCents: 15000,
        spentCents: 8000,
        availableCents: 7000,
        ratio: 0.533,
        status: 'en-plan',
        shareOfSpent: 84,
      },
      {
        categoryId: 'c2',
        name: 'Supermercado',
        colorKey: 'sage',
        budgetCents: 0,
        spentCents: 1500,
        availableCents: -1500,
        ratio: null,
        status: 'sin-presupuesto',
        shareOfSpent: 16,
      },
    ],
  };

  it('muestra los totales del mes y la barra de avance', () => {
    render(<TarjetaPrincipal summary={summary} monthKey="2026-09" />);

    expect(screen.getByText('Gastado')).toBeInTheDocument();
    expect(screen.getByText('$95.00')).toBeInTheDocument();
    expect(screen.getByText('Planeado')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /avance del presupuesto/i })).toBeInTheDocument();
  });

  it('muestra un selector de orden y la suma del total', () => {
    render(
      <>
        <OrdenSelector value="mayor-gasto" onChange={() => undefined} />
        <TablaDetalle summary={summary} monthKey="2026-09" order="mayor-gasto" onOrderChange={() => undefined} />
      </>
    );

    expect(screen.getAllByRole('button', { name: /mayor gasto/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText('$95.00').length).toBeGreaterThan(0);
  });
});
