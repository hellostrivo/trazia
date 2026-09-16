import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Movimientos from '../../pages/Movimientos';
import { db } from '../../data/db';
import { movimientoFilaId } from '../../features/movimientos/MovimientoFila';
import type { Category, Transaction } from '../../domain/types';

const MONTH = '2026-09';

const hogar: Category = {
  id: 'cat-1',
  name: 'Hogar',
  colorKey: 'slate',
  order: 0,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const supermercado: Category = {
  ...hogar,
  id: 'cat-2',
  name: 'Supermercado',
  colorKey: 'sage',
  order: 1,
};

const viajes: Category = {
  ...hogar,
  id: 'cat-3',
  name: 'Viajes',
  colorKey: 'teal',
  order: 2,
  archivedAt: '2026-08-01T00:00:00.000Z',
};

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

async function seed(categories: Category[], transactions: Transaction[]) {
  await db.categories.bulkPut(categories);
  await db.transactions.bulkPut(transactions);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/movimientos?mes=${MONTH}`]}>
      <Movimientos />
    </MemoryRouter>,
  );
}

const cafe = makeTransaction({ id: 't1', concept: 'Café', amountCents: 5000, date: '2026-09-10' });
const mercado = makeTransaction({
  id: 't2',
  concept: 'Mercado',
  amountCents: 20000,
  categoryId: 'cat-2',
  date: '2026-09-12',
  createdAt: '2026-09-12T09:00:00.000Z',
});
const tren = makeTransaction({
  id: 't3',
  concept: 'Tren a Puebla',
  amountCents: 30000,
  categoryId: 'cat-3',
  date: '2026-09-12',
  createdAt: '2026-09-12T11:00:00.000Z',
});

describe('página Movimientos', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('agrupa por día con subtotal, ordena de más reciente a más antiguo y resume el total', async () => {
    await seed([hogar, supermercado, viajes], [cafe, mercado, tren]);
    renderPage();

    expect(await screen.findByText('3 movimientos · $550.00')).toBeInTheDocument();

    const lista = screen.getByRole('region', { name: 'Lista de movimientos' });
    const grupos = within(lista).getAllByRole('region');
    expect(grupos).toHaveLength(2);
    expect(within(grupos[0] as HTMLElement).getByText('Subtotal $500.00')).toBeInTheDocument();
    expect(within(grupos[1] as HTMLElement).getByText('Subtotal $50.00')).toBeInTheDocument();
  });

  it('muestra el estado vacío del mes con enlace a Captura', async () => {
    await seed([hogar], []);
    renderPage();

    expect(await screen.findByText(/Aún no hay movimientos en/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Captura' })).toHaveAttribute('href', '/');
  });

  it('busca sin acentos: "cafe" encuentra "Café"', async () => {
    await seed([hogar, supermercado], [cafe, mercado]);
    renderPage();
    await screen.findByText('2 movimientos · $250.00');

    await userEvent.type(screen.getByLabelText('Buscar por concepto'), 'cafe');

    await waitFor(() => expect(screen.getByText('1 movimiento · $50.00')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Editar Café/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar Mercado/ })).not.toBeInTheDocument();
  });

  it('filtra por categoría (incluida una archivada con movimientos) y limpia los filtros', async () => {
    await seed([hogar, supermercado, viajes], [cafe, mercado, tren]);
    renderPage();
    await screen.findByText('3 movimientos · $550.00');

    const filtro = screen.getByLabelText('Categoría');
    expect(within(filtro).getByRole('option', { name: 'Viajes (archivada)' })).toBeInTheDocument();

    await userEvent.selectOptions(filtro, 'cat-3');
    await waitFor(() => expect(screen.getByText('1 movimiento · $300.00')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText('Buscar por concepto'), 'zzz');
    expect(
      await screen.findByText('No encontramos movimientos con esos filtros'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() => expect(screen.getByText('3 movimientos · $550.00')).toBeInTheDocument());
  });

  it('el diálogo toma el foco inicial y Esc lo devuelve a la fila que lo abrió', async () => {
    await seed([hogar], [cafe]);
    renderPage();

    const fila = await screen.findByRole('button', { name: /Editar Café/ });
    expect(fila.id).toBe(movimientoFilaId('t1'));

    await userEvent.click(fila);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Monto')).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Editar Café/ })).toHaveFocus();
  });

  it('editar el monto actualiza los totales sin recargar', async () => {
    await seed([hogar, supermercado], [cafe, mercado]);
    renderPage();
    await screen.findByText('2 movimientos · $250.00');

    await userEvent.click(screen.getByRole('button', { name: /Editar Café/ }));
    const monto = await screen.findByLabelText('Monto');
    await userEvent.clear(monto);
    await userEvent.type(monto, '75.50');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByText('2 movimientos · $275.50')).toBeInTheDocument());
    expect(screen.getByText('Movimiento actualizado')).toBeInTheDocument();
    expect((await db.transactions.get('t1'))?.amountCents).toBe(7550);
  });

  it('editar la categoría reetiqueta la fila y conserva el id', async () => {
    await seed([hogar, supermercado], [cafe]);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Editar Café/ }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialogo).getByLabelText('Categoría'), 'cat-2');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Editar Café, Supermercado, $50.00' }),
      ).toBeInTheDocument(),
    );
    expect((await db.transactions.get('t1'))?.categoryId).toBe('cat-2');
  });

  it('avisa "Movido a" cuando la fecha editada sale del mes visible', async () => {
    await seed([hogar], [cafe]);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Editar Café/ }));
    const fecha = await screen.findByLabelText('Fecha');
    await userEvent.clear(fecha);
    await userEvent.type(fecha, '2026-08-20');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/^Movido a /)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Aún no hay movimientos en/)).toBeInTheDocument());
  });

  it('deshacer una eliminación restaura el movimiento con el mismo id y createdAt', async () => {
    await seed([hogar, supermercado], [cafe, mercado]);
    renderPage();
    await screen.findByText('2 movimientos · $250.00');

    const original = await db.transactions.get('t1');
    expect(original).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: /Editar Café/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('¿Eliminar este gasto de $50.00?')).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Confirmar eliminación' })).getByRole('button', {
        name: 'Eliminar',
      }),
    );

    await waitFor(() => expect(screen.getByText('1 movimiento · $200.00')).toBeInTheDocument());
    expect(await db.transactions.get('t1')).toBeUndefined();

    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));

    await waitFor(() => expect(screen.getByText('2 movimientos · $250.00')).toBeInTheDocument());
    const restored = await db.transactions.get('t1');
    expect(restored?.id).toBe(original?.id);
    expect(restored?.createdAt).toBe(original?.createdAt);
    expect(restored).toEqual(original);
  });

  it('pagina en bloques cuando hay más de 200 filas (500 movimientos en el mes)', async () => {
    const many: Transaction[] = Array.from({ length: 500 }, (_, index) =>
      makeTransaction({
        id: `bulk-${index}`,
        concept: `Gasto ${index}`,
        amountCents: 100,
        date: `2026-09-${String((index % 15) + 1).padStart(2, '0')}`,
        createdAt: `2026-09-10T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
      }),
    );
    await seed([hogar], many);
    renderPage();

    expect(await screen.findByText('500 movimientos · $500.00')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Editar Gasto/ })).toHaveLength(200);

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar más (300 restantes)' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^Editar Gasto/ })).toHaveLength(400),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar más (100 restantes)' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^Editar Gasto/ })).toHaveLength(500),
    );
    expect(screen.queryByRole('button', { name: /Mostrar más/ })).not.toBeInTheDocument();
  });

  it('cambiar de mes vuelve a consultar y trae los movimientos del mes nuevo', async () => {
    const agosto = makeTransaction({
      id: 't-ago',
      concept: 'Renta de agosto',
      amountCents: 90000,
      date: '2026-08-14',
      createdAt: '2026-08-14T10:00:00.000Z',
    });
    await seed([hogar, supermercado], [cafe, mercado, agosto]);
    renderPage();

    // Septiembre: sólo los dos del mes visible.
    expect(await screen.findByText('2 movimientos · $250.00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar Renta de agosto/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));

    // Agosto: la consulta se re-ejecutó con el mes nuevo.
    await waitFor(() => expect(screen.getByText('1 movimiento · $900.00')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Editar Renta de agosto/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar Café/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));

    await waitFor(() => expect(screen.getByText('2 movimientos · $250.00')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Editar Café/ })).toBeInTheDocument();
  });
});
