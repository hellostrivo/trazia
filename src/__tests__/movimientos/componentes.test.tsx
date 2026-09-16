import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BusquedaConcepto, matchesConcept } from '../../features/movimientos/BusquedaConcepto';
import {
  FiltroCategoria,
  visibleFilterCategories,
} from '../../features/movimientos/FiltroCategoria';
import { GrupoDia } from '../../features/movimientos/GrupoDia';
import { MovimientoFila, movimientoFilaId } from '../../features/movimientos/MovimientoFila';
import { PieTotales } from '../../features/movimientos/PieTotales';
import {
  EditarDialog,
  movimientoErrorMessages,
  selectableCategories,
  validateMovimiento,
} from '../../features/movimientos/EditarDialog';
import { today } from '../../domain/dates';
import type { Category, Transaction } from '../../domain/types';

function makeCategory(overrides: Partial<Category> & Pick<Category, 'id' | 'name'>): Category {
  return {
    colorKey: 'slate',
    order: 0,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction {
  return {
    concept: 'Café',
    amountCents: 5000,
    categoryId: 'cat-1',
    date: '2026-09-10',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
    ...overrides,
  };
}

const hogar = makeCategory({ id: 'cat-1', name: 'Hogar', colorKey: 'slate' });
const viajes = makeCategory({
  id: 'cat-2',
  name: 'Viajes',
  colorKey: 'teal',
  archivedAt: '2026-08-01T00:00:00.000Z',
});
const cursos = makeCategory({
  id: 'cat-3',
  name: 'Cursos',
  colorKey: 'plum',
  archivedAt: '2026-08-01T00:00:00.000Z',
});

describe('BusquedaConcepto', () => {
  it('normaliza acentos y mayúsculas: "cafe" encuentra "Café"', () => {
    expect(matchesConcept('Café', 'cafe')).toBe(true);
    expect(matchesConcept('CAFÉ de olla', 'cafe')).toBe(true);
    expect(matchesConcept('Café', 'CAFÉ')).toBe(true);
    expect(matchesConcept('Mercado', 'cafe')).toBe(false);
  });

  it('con búsqueda vacía no filtra nada', () => {
    expect(matchesConcept('Mercado', '   ')).toBe(true);
  });

  it('reporta lo que se escribe', async () => {
    const onChange = vi.fn();
    render(<BusquedaConcepto value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Buscar por concepto'), 'c');
    expect(onChange).toHaveBeenCalledWith('c');
  });
});

describe('FiltroCategoria', () => {
  it('incluye archivadas sólo si tienen movimientos en el mes visible', () => {
    const options = visibleFilterCategories([hogar, viajes, cursos], ['cat-2'], null);
    expect(options.map((category) => category.id)).toEqual(['cat-1', 'cat-2']);
  });

  it('muestra la archivada con movimientos marcada como archivada', () => {
    render(
      <FiltroCategoria
        categories={[hogar, viajes, cursos]}
        categoryIdsWithMovements={['cat-2']}
        value={null}
        onChange={() => undefined}
      />,
    );

    const select = screen.getByLabelText('Categoría');
    expect(
      within(select).getByRole('option', { name: 'Todas las categorías' }),
    ).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Viajes (archivada)' })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: /Cursos/ })).not.toBeInTheDocument();
  });

  it('devuelve null al elegir todas las categorías', async () => {
    const onChange = vi.fn();
    render(
      <FiltroCategoria
        categories={[hogar]}
        categoryIdsWithMovements={[]}
        value="cat-1"
        onChange={onChange}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'todas');
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('GrupoDia', () => {
  it('muestra el subtotal del día y cada fila con punto de color, categoría y monto', () => {
    const categoriesById = new Map([
      [hogar.id, hogar],
      [viajes.id, viajes],
    ]);

    render(
      <GrupoDia
        date="2026-09-10"
        transactions={[
          makeTransaction({ id: 't1', concept: 'Café', amountCents: 5000 }),
          makeTransaction({ id: 't2', concept: 'Tren', amountCents: 2500, categoryId: 'cat-2' }),
        ]}
        categoriesById={categoriesById}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByText('Subtotal $75.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Café, Hogar, $50.00' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Editar Tren, Viajes (archivada), $25.00' }),
    ).toBeInTheDocument();
  });
});

describe('MovimientoFila', () => {
  it('usa un id estable y avisa al seleccionarse', async () => {
    const onSelect = vi.fn();
    const transaction = makeTransaction({ id: 't9' });

    render(
      <ul>
        <MovimientoFila
          transaction={transaction}
          categoryName="Hogar"
          colorKey="slate"
          archived={false}
          onSelect={onSelect}
        />
      </ul>,
    );

    const button = screen.getByRole('button');
    expect(button.id).toBe(movimientoFilaId('t9'));
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(transaction);
  });
});

describe('PieTotales', () => {
  it('resume el filtro actual', () => {
    render(<PieTotales count={12} totalCents={438000} />);
    expect(screen.getByText('12 movimientos · $4,380.00')).toBeInTheDocument();
  });

  it('usa el singular con un solo movimiento', () => {
    render(<PieTotales count={1} totalCents={5000} />);
    expect(screen.getByText('1 movimiento · $50.00')).toBeInTheDocument();
  });
});

describe('validateMovimiento', () => {
  const base = { amount: '250', concept: 'Mercado', categoryId: 'cat-1', date: '2026-09-10' };

  it('acepta un movimiento válido y devuelve centavos enteros', () => {
    const result = validateMovimiento({ ...base, amount: '250.50' });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({
      concept: 'Mercado',
      amountCents: 25050,
      categoryId: 'cat-1',
      date: '2026-09-10',
    });
  });

  it('rechaza monto inválido, concepto vacío, categoría ausente y fecha futura', () => {
    expect(validateMovimiento({ ...base, amount: '0' }).errors.amount).toBe(
      movimientoErrorMessages.amount,
    );
    expect(validateMovimiento({ ...base, amount: '-5' }).errors.amount).toBe(
      movimientoErrorMessages.amount,
    );
    expect(validateMovimiento({ ...base, concept: '   ' }).errors.concept).toBe(
      movimientoErrorMessages.concept,
    );
    expect(validateMovimiento({ ...base, concept: 'x'.repeat(81) }).errors.concept).toBe(
      movimientoErrorMessages.concept,
    );
    expect(validateMovimiento({ ...base, categoryId: null }).errors.category).toBe(
      movimientoErrorMessages.category,
    );
    expect(validateMovimiento({ ...base, date: '2999-01-01' }).errors.date).toBe(
      movimientoErrorMessages.date,
    );
  });

  it('acepta la fecha de hoy', () => {
    expect(validateMovimiento({ ...base, date: today() }).values).not.toBeNull();
  });
});

describe('EditarDialog', () => {
  const transaction = makeTransaction({ id: 't1', concept: 'Café', amountCents: 5000 });

  it('sólo ofrece una categoría archivada si ya era la del movimiento', () => {
    expect(selectableCategories([hogar, viajes, cursos], 'cat-2').map((c) => c.id)).toEqual([
      'cat-1',
      'cat-2',
    ]);
    expect(selectableCategories([hogar, viajes, cursos], 'cat-1').map((c) => c.id)).toEqual([
      'cat-1',
    ]);
  });

  it('pone el foco inicial en el monto y precarga los valores', async () => {
    render(
      <EditarDialog
        open
        transaction={transaction}
        categories={[hogar, viajes]}
        onSave={async () => undefined}
        onDelete={async () => undefined}
        onClose={() => undefined}
      />,
    );

    const monto = screen.getByLabelText('Monto');
    expect(monto).toHaveFocus();
    expect(monto).toHaveValue('50.00');
    expect(screen.getByLabelText('Concepto')).toHaveValue('Café');
    expect(screen.getByLabelText('Categoría')).toHaveValue('cat-1');
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-09-10');
  });

  it('muestra los errores de validación sin guardar', async () => {
    const onSave = vi.fn();
    render(
      <EditarDialog
        open
        transaction={transaction}
        categories={[hogar]}
        onSave={onSave}
        onDelete={async () => undefined}
        onClose={() => undefined}
      />,
    );

    await userEvent.clear(screen.getByLabelText('Monto'));
    await userEvent.type(screen.getByLabelText('Monto'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(movimientoErrorMessages.amount);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('pide confirmación con el monto antes de eliminar', async () => {
    const onDelete = vi.fn();
    render(
      <EditarDialog
        open
        transaction={transaction}
        categories={[hogar]}
        onSave={async () => undefined}
        onDelete={onDelete}
        onClose={() => undefined}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('¿Eliminar este gasto de $50.00?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(
      within(screen.getByRole('group', { name: 'Confirmar eliminación' })).getByRole('button', {
        name: 'Eliminar',
      }),
    );
    expect(onDelete).toHaveBeenCalledWith(transaction);
  });

  it('mantiene el foco dentro del diálogo al tabular', async () => {
    render(
      <EditarDialog
        open
        transaction={transaction}
        categories={[hogar]}
        onSave={async () => undefined}
        onDelete={async () => undefined}
        onClose={() => undefined}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('button, input, select, textarea'),
    );
    const last = focusables[focusables.length - 1];
    expect(last).toBeDefined();

    last?.focus();
    await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(focusables[0]);

    focusables[0]?.focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });
});
