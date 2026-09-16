import { useEffect, useRef, useState } from 'react';
import { today, monthKeyOf } from '../domain/dates';
import { useLiveQuery } from '../data/hooks/useLiveQuery';
import { listCategories } from '../data/repositories/categories';
import { listTransactionsByMonth, upsertTransaction, deleteTransaction } from '../data/repositories/transactions';
import { parseMoneyInput, formatMXN } from '../domain/money';
import { Button } from '../components/Button';
import { Toast } from '../components/Toast';
import { ResumenBrieve } from '../features/captura/ResumenBrieve';
import { MontoField } from '../features/captura/MontoField';
import { ConceptoField } from '../features/captura/ConceptoField';
import { CategoriaChips } from '../features/captura/CategoriaChips';
import { FechaChip } from '../features/captura/FechaChip';
import { UltimosMovimientos } from '../features/captura/UltimosMovimientos';

export default function Captura() {
  const monthKey = monthKeyOf(today());
  const categoriesQuery = useLiveQuery(() => listCategories());
  const transactionsQuery = useLiveQuery(() => listTransactionsByMonth(monthKey));

  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(today());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; undoId?: string }>({ open: false, message: '' });

  const amountRef = useRef<HTMLInputElement | null>(null);
  const conceptRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  if (categoriesQuery.loading) {
    return <div className="page-shell"><p>Loading captura...</p></div>;
  }

  const activeCategories = (categoriesQuery.data ?? []).filter((c) => !c.archivedAt);

  if (activeCategories.length === 0) {
    return (
      <div className="page-shell">
        <div className="card">
          <p>Para registrar gastos, primero crea una categoría</p>
          <Button onClick={() => (window.location.href = '/configuracion')}>Ir a Configuración</Button>
        </div>
      </div>
    );
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    try {
      const cents = parseMoneyInput(amount);
      if (cents <= 0) next.amount = 'Ingresa un monto mayor a $0, por ejemplo 250 o 250.50.';
    } catch {
      next.amount = 'Ingresa un monto mayor a $0, por ejemplo 250 o 250.50.';
    }

    if (!concept.trim() || concept.trim().length > 80) next.concept = 'Describe el gasto en pocas palabras.';
    if (!categoryId) next.category = 'Elige una categoría.';
    if (!date || new Date(date) > new Date(today())) next.date = 'La fecha no puede ser posterior a hoy.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (processing) return;
    if (!validate()) {
      const first = ['amount', 'concept', 'category', 'date'].find((k) => errors[k]);
      if (first === 'amount') amountRef.current?.focus();
      else if (first === 'concept') conceptRef.current?.focus();
      return;
    }

    setProcessing(true);
    try {
      const amountCents = parseMoneyInput(amount);
      const record = await upsertTransaction({ concept: concept.trim(), amountCents, categoryId: categoryId!, date });
      setToast({ open: true, message: `Guardado: ${formatMXN(record.amountCents)} en ${activeCategories.find((c) => c.id === record.categoryId)?.name ?? ''}`, undoId: record.id });

      // Clear fields except date
      setAmount('');
      setConcept('');
      setCategoryId(null);
      amountRef.current?.focus();
    } catch (error) {
      console.error('No se pudo guardar el gasto', error);
      setToast({ open: true, message: 'No se pudo guardar el gasto. Intenta de nuevo.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleUndo = async () => {
    if (!toast.undoId) return;
    try {
      await deleteTransaction(toast.undoId);
    } finally {
      setToast({ open: false, message: '' });
    }
  };

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Captura</h1>
      </header>

      <div className="stack">
        <section className="card" style={{ padding: '1rem' }}>
          <ResumenBrieve monthKey={monthKey} transactions={transactionsQuery.data ?? []} />

          <div className="stack" style={{ marginTop: '1rem' }}>
            <MontoField ref={amountRef} value={amount} onChange={(v) => setAmount(v)} error={errors.amount} />
            <ConceptoField ref={conceptRef} value={concept} onChange={(v) => setConcept(v)} error={errors.concept} />
            <CategoriaChips value={categoryId} onChange={(id) => setCategoryId(id)} categories={activeCategories} error={errors.category} />
            <FechaChip value={date} onChange={(d) => setDate(d)} error={errors.date} />

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={handleSave} disabled={processing} aria-disabled={processing}>
                Guardar
              </Button>
            </div>
          </div>
        </section>

        <UltimosMovimientos transactions={(transactionsQuery.data ?? [])} />
      </div>

      <Toast message={toast.message} open={toast.open} onClose={() => setToast({ open: false, message: '' })} />
      {toast.open && (
        <div style={{ position: 'fixed', right: 16, bottom: 16 }}>
          <Button variant="ghost" onClick={handleUndo}>Deshacer</Button>
        </div>
      )}
    </div>
  );
}
