import { useState } from 'react';
import { Button } from '../../components/Button';
import { MonthBudgetSelector } from './MonthBudgetSelector';
import { buildMonthSummary } from '../../domain/summary';
import { monthKeyOf, today } from '../../domain/dates';
import type { BudgetVersion, Category, MonthKey } from '../../domain/types';

type Status = 'idle' | 'generating' | 'error';

interface PlanPdfSectionProps {
  categories: readonly Category[];
  versions: readonly BudgetVersion[];
}

/**
 * Configuración › Plan en PDF. Sólo el plan: el resumen se construye sin
 * movimientos (T-012). La generación vive en `services/export/budgetPdf` y
 * se carga con `import()` para que react-pdf no entre al bundle inicial.
 */
export function PlanPdfSection({ categories, versions }: PlanPdfSectionProps) {
  const [monthKey, setMonthKey] = useState<MonthKey>(monthKeyOf(today()));
  const [status, setStatus] = useState<Status>('idle');

  const summary = buildMonthSummary({ categories, versions, transactions: [], monthKey });
  const hasBudget = summary.rows.some((row) => row.budgetCents > 0);
  const disabled = !hasBudget || status === 'generating';

  const handleDownload = async () => {
    setStatus('generating');
    try {
      const [
        { buildBudgetPdfData, budgetPdfFilename },
        { buildBudgetPdf, PDF_MIME },
        { deliverFile },
      ] = await Promise.all([
        import('../../services/export/budgetPdfData'),
        import('../../services/export/budgetPdf'),
        import('../../services/files/deliverFile'),
      ]);
      const blob = await buildBudgetPdf(buildBudgetPdfData(summary, new Date()));
      await deliverFile(blob, budgetPdfFilename(monthKey), PDF_MIME);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="card" style={{ padding: '1.5rem' }} aria-labelledby="plan-pdf-title">
      <h2 id="plan-pdf-title" style={{ marginBottom: '0.5rem' }}>
        Plan en PDF
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Un resumen de tu plan de gastos por categoría, listo para guardar o compartir. No incluye
        movimientos.
      </p>
      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        <MonthBudgetSelector
          value={monthKey}
          onChange={(next) => {
            setMonthKey(next);
            setStatus('idle');
          }}
          label="Plan de"
        />
        {!hasBudget && <p className="muted">Asigna al menos un presupuesto para generar tu plan</p>}
        {status === 'error' && <p role="alert">No se pudo generar el archivo. Intenta de nuevo.</p>}
        <div>
          <Button onClick={handleDownload} disabled={disabled} aria-busy={status === 'generating'}>
            {status === 'generating' ? 'Generando…' : 'Descargar plan en PDF'}
          </Button>
        </div>
      </div>
    </section>
  );
}
