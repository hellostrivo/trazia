// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildBudgetPdf, PDF_MIME } from '../../services/export/budgetPdf';
import { buildBudgetPdfData } from '../../services/export/budgetPdfData';
import type { MonthSummary } from '../../domain/types';

const summary: MonthSummary = {
  monthKey: '2026-09',
  totalBudgetCents: 1_250_000,
  totalSpentCents: 0,
  totalAvailableCents: 1_250_000,
  rows: [
    {
      categoryId: 'a',
      name: 'Hogar',
      colorKey: 'slate',
      budgetCents: 700000,
      spentCents: 0,
      availableCents: 700000,
      ratio: 0,
      status: 'en-plan',
      shareOfSpent: 0,
    },
    {
      categoryId: 'b',
      name: 'Comida y café',
      colorKey: 'sage',
      budgetCents: 350000,
      spentCents: 0,
      availableCents: 350000,
      ratio: 0,
      status: 'en-plan',
      shareOfSpent: 0,
    },
    {
      categoryId: 'c',
      name: 'Niños y niñas',
      colorKey: 'ochre',
      budgetCents: 200000,
      spentCents: 0,
      availableCents: 200000,
      ratio: 0,
      status: 'en-plan',
      shareOfSpent: 0,
    },
    {
      categoryId: 'd',
      name: 'Sin asignar',
      colorKey: 'rose',
      budgetCents: 0,
      spentCents: 0,
      availableCents: 0,
      ratio: null,
      status: 'sin-actividad',
      shareOfSpent: 0,
    },
  ],
};

describe('buildBudgetPdf', () => {
  it('produce un Blob PDF que comienza con %PDF', async () => {
    const data = buildBudgetPdfData(summary, new Date(2026, 8, 16));
    const blob = await buildBudgetPdf(data);

    expect(blob.type).toBe(PDF_MIME);
    expect(blob.size).toBeGreaterThan(1000);
    const head = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5));
    expect(head).toBe('%PDF-');
  }, 30_000);

  it('genera también con una sola categoría (rebanada completa de la dona)', async () => {
    const single: MonthSummary = {
      ...summary,
      rows: [summary.rows[0]!],
      totalBudgetCents: 700000,
      totalAvailableCents: 700000,
    };
    const blob = await buildBudgetPdf(buildBudgetPdfData(single, new Date(2026, 8, 16)));
    const head = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5));
    expect(head).toBe('%PDF-');
  }, 30_000);
});
