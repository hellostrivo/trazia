import type { ChartColorKey, MonthKey, MonthSummary } from '../../domain/types';

/** Colores de las gráficas: `--color-graph-*` en `src/styles/tokens.css` (tema claro). */
export const CHART_COLORS: Record<ChartColorKey, string> = {
  slate: '#3e5c76',
  sage: '#6b9080',
  ochre: '#c08a3e',
  clay: '#b5654a',
  plum: '#7a5c7e',
  teal: '#3f7f83',
  olive: '#8a8b4f',
  stone: '#8c8279',
  denim: '#5b7db1',
  rose: '#a86a7b',
};

/** `--color-graph-otros`. */
export const OTHERS_COLOR = '#b8b1a6';

/** Máximo de rebanadas propias en la dona; el resto se agrupa en "Otras". */
export const DONUT_MAX_SLICES = 6;

export interface BudgetPdfRow {
  name: string;
  color: string;
  budgetCents: number;
  /** Porcentaje entero del plan (misma regla que la tabla de Configuración). */
  sharePercent: number;
}

export interface BudgetPdfData {
  monthKey: MonthKey;
  /** "Septiembre 2026" */
  monthLabel: string;
  /** "16 de septiembre de 2026" */
  generatedOn: string;
  totalBudgetCents: number;
  categoriesWithBudget: number;
  /** Categorías con presupuesto en el orden configurado. */
  table: BudgetPdfRow[];
  /** Hasta seis categorías principales (mayor a menor) más "Otras". */
  donut: BudgetPdfRow[];
  /** Todas las categorías con presupuesto, de mayor a menor. */
  bars: BudgetPdfRow[];
  /** Nombres de categorías activas sin presupuesto en el mes. */
  unbudgeted: string[];
}

export function budgetPdfFilename(monthKey: MonthKey): string {
  return `trazia-plan-${monthKey}.pdf`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatPdfMonthLabel(monthKey: MonthKey): string {
  const [yearText, monthText] = monthKey.split('-');
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  const month = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(date);
  return `${capitalize(month)} ${yearText}`;
}

export function formatGeneratedOn(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function sharePercentOf(cents: number, totalCents: number): number {
  return totalCents === 0 ? 0 : Math.round((cents / totalCents) * 100);
}

/**
 * Estructura de datos del PDF del plan. Función pura: solo usa `budgetCents`
 * del resumen; los gastos reales nunca entran al documento (T-012).
 */
export function buildBudgetPdfData(summary: MonthSummary, generatedAt: Date): BudgetPdfData {
  const totalBudgetCents = summary.totalBudgetCents;

  const table: BudgetPdfRow[] = summary.rows
    .filter((row) => row.budgetCents > 0)
    .map((row) => ({
      name: row.name,
      color: CHART_COLORS[row.colorKey],
      budgetCents: row.budgetCents,
      sharePercent: sharePercentOf(row.budgetCents, totalBudgetCents),
    }));

  const bars = [...table].sort((left, right) => right.budgetCents - left.budgetCents);

  const main = bars.slice(0, DONUT_MAX_SLICES);
  const rest = bars.slice(DONUT_MAX_SLICES);
  const restCents = rest.reduce((sum, row) => sum + row.budgetCents, 0);
  const donut: BudgetPdfRow[] =
    restCents > 0
      ? [
          ...main,
          {
            name: 'Otras',
            color: OTHERS_COLOR,
            budgetCents: restCents,
            sharePercent: sharePercentOf(restCents, totalBudgetCents),
          },
        ]
      : main;

  const unbudgeted = summary.rows.filter((row) => row.budgetCents === 0).map((row) => row.name);

  return {
    monthKey: summary.monthKey,
    monthLabel: formatPdfMonthLabel(summary.monthKey),
    generatedOn: formatGeneratedOn(generatedAt),
    totalBudgetCents,
    categoriesWithBudget: table.length,
    table,
    donut,
    bars,
    unbudgeted,
  };
}
