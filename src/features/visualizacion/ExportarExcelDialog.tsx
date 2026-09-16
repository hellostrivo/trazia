import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { useLiveQuery } from '../../data/hooks/useLiveQuery';
import { listTransactions } from '../../data/repositories/transactions';
import { formatMonthLabel, today } from '../../domain/dates';
import type { Category, MonthKey, Transaction } from '../../domain/types';

type Scope = 'month' | 'history';
type Status = 'idle' | 'generating' | 'error';

interface ExportarExcelDialogProps {
  open: boolean;
  onClose: () => void;
  monthKey: MonthKey;
  monthTransactions: readonly Transaction[];
  categories: readonly Category[];
}

/**
 * Diálogo "Exportar a Excel". La generación vive en `services/export/transactionsXlsx`
 * y se carga con `import()` para que ExcelJS no entre al bundle inicial (SPEC-06, criterio 6).
 */
export function ExportarExcelDialog({
  open,
  onClose,
  monthKey,
  monthTransactions,
  categories,
}: ExportarExcelDialogProps) {
  const [scope, setScope] = useState<Scope>('month');
  const [status, setStatus] = useState<Status>('idle');

  // Todo el historial se consulta sólo mientras el diálogo está abierto.
  const historyQuery = useLiveQuery(
    () => (open ? listTransactions() : Promise.resolve([] as Transaction[])),
    [open],
  );

  useEffect(() => {
    if (open) {
      setScope('month');
      setStatus('idle');
    }
  }, [open]);

  const selected = scope === 'month' ? monthTransactions : (historyQuery.data ?? []);
  const loadingHistory = scope === 'history' && historyQuery.loading;
  const isEmpty = !loadingHistory && selected.length === 0;
  const disabled = isEmpty || loadingHistory || status === 'generating';

  const handleExport = async () => {
    setStatus('generating');
    try {
      const [{ buildTransactionsXlsx, transactionsXlsxFilename, XLSX_MIME }, { deliverFile }] =
        await Promise.all([
          import('../../services/export/transactionsXlsx'),
          import('../../services/files/deliverFile'),
        ]);
      const blob = await buildTransactionsXlsx({ transactions: selected, categories });
      const filename = transactionsXlsxFilename(
        scope === 'month' ? { kind: 'month', monthKey } : { kind: 'history', generatedOn: today() },
      );
      await deliverFile(blob, filename, XLSX_MIME);
      setStatus('idle');
      onClose();
    } catch {
      setStatus('error');
    }
  };

  return (
    <Dialog open={open} title="Exportar a Excel" onClose={onClose}>
      <div className="dialog-body stack">
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 'var(--space-2)' }}>Alcance</legend>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="radio"
                name="alcance-excel"
                value="month"
                checked={scope === 'month'}
                onChange={() => {
                  setScope('month');
                  setStatus('idle');
                }}
              />
              {formatMonthLabel(monthKey)}
            </label>
            <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="radio"
                name="alcance-excel"
                value="history"
                checked={scope === 'history'}
                onChange={() => {
                  setScope('history');
                  setStatus('idle');
                }}
              />
              Todo el historial
            </label>
          </div>
        </fieldset>

        {isEmpty && <p className="muted">No hay movimientos para exportar</p>}
        {status === 'error' && <p role="alert">No se pudo generar el archivo. Intenta de nuevo.</p>}

        <div className="dialog-footer row" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={disabled} aria-busy={status === 'generating'}>
            {status === 'generating' ? 'Generando…' : 'Descargar Excel'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
