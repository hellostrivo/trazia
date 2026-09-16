import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { today } from '../../domain/dates';
import { formatMXN, formatMoneyInput, parseMoneyInput } from '../../domain/money';
import { transactionInputSchema } from '../../data/repositories/transactions';
import type { Category, Transaction } from '../../domain/types';

export interface MovimientoValues {
  concept: string;
  amountCents: number;
  categoryId: string;
  date: string;
}

export interface MovimientoDraft {
  amount: string;
  concept: string;
  categoryId: string | null;
  date: string;
}

/** Mismos mensajes y reglas de captura (SPEC-03). */
export const movimientoErrorMessages = {
  amount: 'Ingresa un monto mayor a $0, por ejemplo 250 o 250.50.',
  concept: 'Describe el gasto en pocas palabras.',
  category: 'Elige una categoría.',
  date: 'La fecha no puede ser posterior a hoy.',
} as const;

/**
 * Valida con las mismas primitivas del dominio que usa Captura:
 * `parseMoneyInput`, `today()` y `transactionInputSchema`.
 */
export function validateMovimiento(draft: MovimientoDraft): {
  errors: Record<string, string>;
  values: MovimientoValues | null;
} {
  const errors: Record<string, string> = {};
  let amountCents = 0;

  try {
    amountCents = parseMoneyInput(draft.amount);
    if (amountCents <= 0) errors.amount = movimientoErrorMessages.amount;
  } catch {
    errors.amount = movimientoErrorMessages.amount;
  }

  const concept = draft.concept.trim();
  if (!concept || concept.length > 80) errors.concept = movimientoErrorMessages.concept;
  if (!draft.categoryId) errors.category = movimientoErrorMessages.category;
  if (!draft.date || draft.date > today()) errors.date = movimientoErrorMessages.date;

  if (Object.keys(errors).length > 0) {
    return { errors, values: null };
  }

  const candidate = {
    concept,
    amountCents,
    categoryId: draft.categoryId as string,
    date: draft.date,
  };

  const parsed = transactionInputSchema.safeParse(candidate);
  if (!parsed.success) {
    return { errors: { amount: movimientoErrorMessages.amount }, values: null };
  }

  return { errors: {}, values: candidate };
}

/**
 * Sólo se puede elegir una categoría archivada si ya era la del movimiento.
 */
export function selectableCategories(
  categories: Category[],
  currentCategoryId: string | null,
): Category[] {
  return categories.filter((category) => !category.archivedAt || category.id === currentCategoryId);
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface EditarDialogProps {
  open: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onSave: (values: MovimientoValues) => Promise<void>;
  onDelete: (transaction: Transaction) => Promise<void>;
  onClose: () => void;
}

export function EditarDialog({
  open,
  transaction,
  categories,
  onSave,
  onDelete,
  onClose,
}: EditarDialogProps) {
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [processing, setProcessing] = useState(false);

  const amountRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !transaction) return;
    setAmount(formatMoneyInput(transaction.amountCents));
    setConcept(transaction.concept);
    setCategoryId(transaction.categoryId);
    setDate(transaction.date);
    setErrors({});
    setConfirmingDelete(false);
    setProcessing(false);
  }, [open, transaction]);

  // Foco inicial en el primer campo.
  useEffect(() => {
    if (!open) return;
    amountRef.current?.focus();
  }, [open, transaction]);

  // Trampa de foco dentro del diálogo.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const dialogEl = rootRef.current?.closest('[role="dialog"]');
      if (!dialogEl) return;

      const focusables = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !dialogEl.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSave = useCallback(async () => {
    if (processing) return;
    const result = validateMovimiento({ amount, concept, categoryId, date });
    setErrors(result.errors);
    if (!result.values) {
      if (result.errors.amount) amountRef.current?.focus();
      return;
    }

    setProcessing(true);
    try {
      await onSave(result.values);
    } finally {
      setProcessing(false);
    }
  }, [amount, concept, categoryId, date, onSave, processing]);

  const handleDelete = useCallback(async () => {
    if (!transaction || processing) return;
    setProcessing(true);
    try {
      await onDelete(transaction);
    } finally {
      setProcessing(false);
    }
  }, [onDelete, processing, transaction]);

  if (!open || !transaction) return null;

  const options = selectableCategories(categories, transaction.categoryId);

  return (
    <Dialog open={open} title="Editar movimiento" onClose={onClose}>
      <div ref={rootRef} className="stack dialog-body">
        <div className="field">
          <label htmlFor="editar-monto">Monto</label>
          <input
            id="editar-monto"
            ref={amountRef}
            name="monto"
            inputMode="decimal"
            value={amount}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'editar-monto-error' : undefined}
            onChange={(event) => setAmount(event.target.value)}
          />
          {errors.amount ? (
            <div
              id="editar-monto-error"
              role="alert"
              className="field-error"
              style={{ color: 'var(--color-attention)', fontSize: 'var(--font-size-14)' }}
            >
              {errors.amount}
            </div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="editar-concepto">Concepto</label>
          <input
            id="editar-concepto"
            name="concepto"
            maxLength={80}
            value={concept}
            aria-invalid={Boolean(errors.concept)}
            aria-describedby={errors.concept ? 'editar-concepto-error' : undefined}
            onChange={(event) => setConcept(event.target.value)}
          />
          {errors.concept ? (
            <div
              id="editar-concepto-error"
              role="alert"
              className="field-error"
              style={{ color: 'var(--color-attention)', fontSize: 'var(--font-size-14)' }}
            >
              {errors.concept}
            </div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="editar-categoria">Categoría</label>
          <select
            id="editar-categoria"
            name="categoria"
            value={categoryId ?? ''}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? 'editar-categoria-error' : undefined}
            onChange={(event) => setCategoryId(event.target.value || null)}
          >
            {options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.archivedAt ? `${category.name} (archivada)` : category.name}
              </option>
            ))}
          </select>
          {errors.category ? (
            <div
              id="editar-categoria-error"
              role="alert"
              className="field-error"
              style={{ color: 'var(--color-attention)', fontSize: 'var(--font-size-14)' }}
            >
              {errors.category}
            </div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="editar-fecha">Fecha</label>
          <input
            id="editar-fecha"
            name="fecha"
            type="date"
            max={today()}
            value={date}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? 'editar-fecha-error' : undefined}
            onChange={(event) => setDate(event.target.value)}
          />
          {errors.date ? (
            <div
              id="editar-fecha-error"
              role="alert"
              className="field-error"
              style={{ color: 'var(--color-attention)', fontSize: 'var(--font-size-14)' }}
            >
              {errors.date}
            </div>
          ) : null}
        </div>

        {confirmingDelete ? (
          <div className="form-note" role="group" aria-label="Confirmar eliminación">
            <p>{`¿Eliminar este gasto de ${formatMXN(transaction.amountCents)}?`}</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
                Conservar
              </Button>
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={processing}
                aria-disabled={processing}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ) : null}

        <div className="dialog-footer">
          {confirmingDelete ? null : (
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
              Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={processing} aria-disabled={processing}>
            Guardar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
