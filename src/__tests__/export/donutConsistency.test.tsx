import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { DonaChart } from '../../features/configuracion/DonaChart';
import { buildBudgetPdfData } from '../../services/export/budgetPdfData';
import { buildMonthSummary } from '../../domain/summary';
import { resolveBudget } from '../../domain/budget';
import type { BudgetVersion, Category, ChartColorKey } from '../../domain/types';

/**
 * Criterio 5 de SPEC-06: la dona del PDF agrupa "Otras categorías" exactamente igual que
 * la de Configuración. El caso cubre más de seis categorías, una con $0 en el
 * primer lugar del orden configurado y montos desordenados respecto a la lista.
 */

const iso = '2026-09-01T00:00:00.000Z';
const monthKey = '2026-09';
const colors: ChartColorKey[] = [
  'slate',
  'sage',
  'ochre',
  'clay',
  'plum',
  'teal',
  'olive',
  'stone',
  'denim',
];

const plan: Array<[string, number]> = [
  ['Hogar', 0], // $0 en el primer lugar del orden configurado
  ['Supermercado', 120000],
  ['Transporte', 450000],
  ['Salud', 30000],
  ['Cuidado personal', 20000],
  ['Comidas fuera', 80000],
  ['Entretenimiento', 200000],
  ['Educación', 60000],
  ['Mascotas', 40000],
];

const categories: Category[] = plan.map(([name], index) => ({
  id: `cat-${index}`,
  name,
  colorKey: colors[index] ?? 'slate',
  order: index,
  archivedAt: null,
  createdAt: iso,
  updatedAt: iso,
}));

const versions: BudgetVersion[] = plan.flatMap(([, cents], index) =>
  cents > 0
    ? [
        {
          id: `v-${index}`,
          categoryId: `cat-${index}`,
          effectiveFrom: monthKey,
          amountCents: cents,
          createdAt: iso,
          updatedAt: iso,
        },
      ]
    : [],
);

/** Leyenda de la dona de Configuración como [nombre, porcentaje]. */
function legendOf(container: HTMLElement): Array<[string, string]> {
  return Array.from(container.querySelectorAll('.dona-legend-item')).map((item) => [
    item.querySelector('.dona-legend-label')?.textContent ?? '',
    item.querySelector('.dona-legend-percentage')?.textContent ?? '',
  ]);
}

describe('Dona: Configuración y PDF agrupan "Otras categorías" igual', () => {
  // Datos tal como los arma la página de Configuración.
  const chartData = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    colorKey: cat.colorKey,
    amountCents: resolveBudget(versions, cat.id, monthKey),
  }));
  const totalCents = chartData.reduce((sum, item) => sum + item.amountCents, 0);

  // Datos tal como los arma PlanPdfSection.
  const summary = buildMonthSummary({ categories, versions, transactions: [], monthKey });
  const pdf = buildBudgetPdfData(summary, new Date(2026, 8, 16));

  it('los totales coinciden', () => {
    expect(pdf.totalBudgetCents).toBe(totalCents);
    expect(pdf.totalBudgetCents).toBe(1_000_000);
  });

  it('las seis principales y "Otras categorías" son las mismas, con los mismos porcentajes', () => {
    const { container } = render(<DonaChart data={chartData} totalCents={totalCents} />);
    const legend = legendOf(container);
    const pdfLegend = pdf.donut.map((row) => [row.name, `${row.sharePercent}%`]);

    expect(legend).toEqual(pdfLegend);
    expect(legend).toEqual([
      ['Transporte', '45%'],
      ['Entretenimiento', '20%'],
      ['Supermercado', '12%'],
      ['Comidas fuera', '8%'],
      ['Educación', '6%'],
      ['Mascotas', '4%'],
      ['Otras categorías', '5%'], // Salud + Cuidado personal
    ]);
  });

  it('la categoría con $0 no aparece en ninguna de las dos donas', () => {
    const { container } = render(<DonaChart data={chartData} totalCents={totalCents} />);
    expect(legendOf(container).map(([name]) => name)).not.toContain('Hogar');
    expect(pdf.donut.map((row) => row.name)).not.toContain('Hogar');
    // Sí aparece en la sección "Sin presupuesto asignado" del PDF.
    expect(pdf.unbudgeted).toEqual(['Hogar']);
  });

  it('"Otras categorías" suma exactamente las categorías que quedaron fuera en ambos sitios', () => {
    const others = pdf.donut.find((row) => row.name === 'Otras categorías');
    expect(others?.budgetCents).toBe(30000 + 20000);
    const shown = pdf.donut
      .filter((row) => row.name !== 'Otras categorías')
      .reduce((sum, row) => sum + row.budgetCents, 0);
    expect(shown + (others?.budgetCents ?? 0)).toBe(totalCents);
  });
});
