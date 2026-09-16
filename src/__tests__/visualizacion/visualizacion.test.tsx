import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TarjetaPrincipal } from '../../features/visualizacion/TarjetaPrincipal';
import { TablaDetalle, formatDisponible } from '../../features/visualizacion/TablaDetalle';
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

  const summaryPorEncima: MonthSummary = {
    monthKey: '2026-09',
    totalBudgetCents: 10000,
    totalSpentCents: 42500,
    totalAvailableCents: -32500,
    rows: [
      {
        categoryId: 'c1',
        name: 'Hogar',
        colorKey: 'slate',
        budgetCents: 10000,
        spentCents: 42500,
        availableCents: -32500,
        ratio: 4.25,
        status: 'por-encima',
        shareOfSpent: 100,
      },
    ],
  };

  describe('gasto total por encima del presupuesto total', () => {
    it('formatDisponible devuelve el texto de SPEC-04 sin romper con negativos', () => {
      expect(formatDisponible(5500)).toEqual({ text: '$55.00', isOver: false });
      expect(formatDisponible(0)).toEqual({ text: '$0.00', isOver: false });
      expect(formatDisponible(-32500)).toEqual({
        text: 'Por encima de lo planeado: $325.00',
        isOver: true,
      });
    });

    it('TablaDetalle pinta la fila de totales en ocre y no lanza', () => {
      expect(() =>
        render(
          <TablaDetalle
            summary={summaryPorEncima}
            monthKey="2026-09"
            order="mayor-gasto"
            onOrderChange={() => undefined}
          />,
        ),
      ).not.toThrow();

      const celdas = screen.getAllByText('Por encima de lo planeado: $325.00');
      expect(celdas.length).toBeGreaterThan(0);
      celdas.forEach((celda) => {
        expect(celda).toHaveStyle({ color: 'var(--color-attention)' });
      });

      const filaTotal = screen.getByText('Total').closest('tr');
      expect(filaTotal).not.toBeNull();
      expect(filaTotal).toHaveTextContent('Por encima de lo planeado: $325.00');
    });

    it('TarjetaPrincipal anuncia el estado sin lenguaje de alarma', () => {
      expect(() => render(<TarjetaPrincipal summary={summaryPorEncima} monthKey="2026-09" />)).not.toThrow();

      expect(screen.getAllByText(/Por encima de lo planeado/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/¡Cuidado!|¡Atención!|Te pasaste|⚠/)).not.toBeInTheDocument();
    });
  });
});
