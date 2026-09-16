import { useState, useEffect } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { formatMonthLabel, addMonths } from '../../domain/dates';
import { formatMoneyInput, parseMoneyInput } from '../../domain/money';
import { isSameCategoryName } from '../../domain/categories';
import type { Category, ChartColorKey, MonthKey } from '../../domain/types';

interface CategoriaFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  monthKey: MonthKey;
  existingCategory?: Category;
  allCategories: Category[];
  onSave: (data: {
    name: string;
    colorKey: ChartColorKey;
    id?: string;
    budgetCents?: number;
  }) => Promise<void>;
  onClose: () => void;
  error?: string;
  nextVersionMonth?: MonthKey;
  nextVersionAmount?: number;
}

const colorOptions: ChartColorKey[] = [
  'slate',
  'sage',
  'ochre',
  'clay',
  'plum',
  'teal',
  'olive',
  'stone',
  'denim',
  'rose',
];

const colorLabels: Record<ChartColorKey, string> = {
  slate: 'Pizarra',
  sage: 'Salvia',
  ochre: 'Ocre',
  clay: 'Arcilla',
  plum: 'Ciruela',
  teal: 'Verde azulado',
  olive: 'Oliva',
  stone: 'Piedra',
  denim: 'Mezclilla',
  rose: 'Rosa',
};

export function CategoriaForm({
  open,
  mode,
  monthKey,
  existingCategory,
  allCategories,
  onSave,
  onClose,
  error,
  nextVersionMonth,
  nextVersionAmount,
}: CategoriaFormProps) {
  const [name, setName] = useState('');
  const [colorKey, setColorKey] = useState<ChartColorKey>('slate');
  const [budget, setBudget] = useState('');
  const [nameError, setNameError] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && existingCategory) {
        setName(existingCategory.name);
        setColorKey(existingCategory.colorKey);
        setBudget('');
        setNameError('');
        setBudgetError('');
      } else {
        setName('');
        setColorKey('slate');
        setBudget('');
        setNameError('');
        setBudgetError('');
      }
    }
  }, [open, mode, existingCategory]);

  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 1) {
      return 'Escribe un nombre de hasta 40 caracteres.';
    }
    if (trimmed.length > 40) {
      return 'Escribe un nombre de hasta 40 caracteres.';
    }

    const isDuplicate = allCategories.some(
      (cat) => cat.id !== existingCategory?.id && isSameCategoryName(cat.name, trimmed),
    );

    if (isDuplicate) {
      return `Ya tienes una categoría llamada "${trimmed}".`;
    }

    return '';
  };

  const validateBudget = (value: string) => {
    if (!value) return '';
    try {
      parseMoneyInput(value);
      return '';
    } catch {
      return 'Ingresa un monto válido, por ejemplo 1500 o 1,500.50.';
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameError('');
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBudget(e.target.value);
    setBudgetError('');
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    const nameErr = validateName(trimmed);
    const budgetErr = validateBudget(budget);

    if (nameErr) {
      setNameError(nameErr);
      return;
    }

    if (budgetErr) {
      setBudgetError(budgetErr);
      return;
    }

    setIsSaving(true);
    try {
      const budgetCents = budget ? parseMoneyInput(budget) : undefined;
      await onSave({
        name: trimmed,
        colorKey,
        id: mode === 'edit' ? existingCategory?.id : undefined,
        budgetCents,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} title={mode === 'create' ? 'Agregar categoría' : 'Editar categoría'} onClose={onClose}>
      <div className="dialog-body stack">
        <div>
          <label htmlFor="categoria-name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Nombre *
          </label>
          <input
            id="categoria-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Ej. Hogar"
            maxLength={40}
            aria-invalid={!!nameError}
            aria-describedby={nameError || error ? 'error-message' : undefined}
          />
          {(nameError || error) && (
            <small id="error-message" style={{ color: 'var(--color-attention)', display: 'block', marginTop: '0.5rem' }}>
              {nameError || error}
            </small>
          )}
        </div>

        <div>
          <label htmlFor="categoria-color" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Color
          </label>
          <select
            id="categoria-color"
            value={colorKey}
            onChange={(e) => setColorKey(e.target.value as ChartColorKey)}
            aria-label="Seleccionar color"
          >
            {colorOptions.map((color) => (
              <option key={color} value={color}>
                {colorLabels[color]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="categoria-budget" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Presupuesto (opcional)
          </label>
          <input
            id="categoria-budget"
            type="text"
            value={budget}
            onChange={handleBudgetChange}
            placeholder="Ej. 1500 o 1,500.50"
            aria-invalid={!!budgetError}
            aria-describedby={budgetError ? 'budget-error' : undefined}
          />
          {budgetError && (
            <small id="budget-error" style={{ color: 'var(--color-attention)', display: 'block', marginTop: '0.5rem' }}>
              {budgetError}
            </small>
          )}
        </div>

        <div className="form-note">
          <p>Aplica desde <strong>{formatMonthLabel(monthKey)}</strong> en adelante.</p>
          {nextVersionMonth && nextVersionAmount !== undefined && (
            <p>Hasta <strong>{formatMonthLabel(addMonths(monthKey, -1))}</strong>; a partir de <strong>{formatMonthLabel(nextVersionMonth)}</strong> aplica <strong>${formatMoneyInput(nextVersionAmount)}</strong>.</p>
          )}
        </div>

        <div className="dialog-footer row" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
