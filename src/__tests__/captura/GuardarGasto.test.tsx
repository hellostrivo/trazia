import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Captura from '../../pages/Captura';
import { db } from '../../data/db';
import type { Category } from '../../domain/types';

const hogar: Category = {
  id: 'cat-1',
  name: 'Hogar',
  colorKey: 'slate',
  order: 0,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

async function renderCaptura() {
  await db.categories.bulkPut([hogar]);
  render(
    <MemoryRouter>
      <Captura />
    </MemoryRouter>,
  );
  return screen.findByRole('button', { name: 'Guardar' });
}

function estado() {
  return document.getElementById('guardar-gasto-estado');
}

describe('Captura · estado visual del botón Guardar', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('arranca en reposo y no se deshabilita aunque el formulario esté incompleto', async () => {
    const boton = await renderCaptura();

    expect(boton).toHaveClass('guardar-gasto');
    expect(boton).not.toHaveClass('guardar-gasto--listo');
    expect(boton).toBeEnabled();
    expect(boton).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('pasa al color de acción principal cuando los cuatro campos son válidos', async () => {
    const boton = await renderCaptura();
    expect(boton).not.toHaveClass('guardar-gasto--listo');

    await userEvent.type(screen.getByLabelText('Monto'), '250.50');
    expect(boton).not.toHaveClass('guardar-gasto--listo');

    await userEvent.type(screen.getByLabelText('Concepto'), 'Mercado');
    expect(boton).not.toHaveClass('guardar-gasto--listo');

    // La fecha ya viene con hoy; falta solo la categoría.
    await userEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Categoría' })).getByRole('radio', { name: 'Hogar' }),
    );

    await waitFor(() => expect(boton).toHaveClass('guardar-gasto--listo'));
    expect(boton).toHaveClass('guardar-gasto');
  });

  it('vuelve a reposo si un campo deja de ser válido', async () => {
    const boton = await renderCaptura();

    await userEvent.type(screen.getByLabelText('Monto'), '250');
    await userEvent.type(screen.getByLabelText('Concepto'), 'Mercado');
    await userEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Categoría' })).getByRole('radio', { name: 'Hogar' }),
    );
    await waitFor(() => expect(boton).toHaveClass('guardar-gasto--listo'));

    await userEvent.clear(screen.getByLabelText('Monto'));
    await waitFor(() => expect(boton).not.toHaveClass('guardar-gasto--listo'));

    await userEvent.type(screen.getByLabelText('Monto'), '0');
    expect(boton).not.toHaveClass('guardar-gasto--listo');
  });

  it('el estado no se comunica solo con color: hay texto asociado al botón', async () => {
    const boton = await renderCaptura();

    expect(boton).toHaveAttribute('aria-describedby', 'guardar-gasto-estado');
    expect(estado()).toHaveTextContent('Completa los datos para guardar');

    await userEvent.type(screen.getByLabelText('Monto'), '250');
    await userEvent.type(screen.getByLabelText('Concepto'), 'Mercado');
    await userEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Categoría' })).getByRole('radio', { name: 'Hogar' }),
    );

    await waitFor(() => expect(estado()).toHaveTextContent('Listo para guardar'));
    // Se anuncia en una región viva, para que el cambio no dependa de la vista.
    expect(estado()).toHaveAttribute('role', 'status');
  });

  it('pulsarlo en reposo sigue mostrando los errores y moviendo el foco (SPEC-03)', async () => {
    const boton = await renderCaptura();

    await userEvent.click(boton);

    expect(await screen.findByText('Ingresa un monto mayor a $0, por ejemplo 250 o 250.50.')).toBeInTheDocument();
    expect(screen.getByText('Describe el gasto en pocas palabras.')).toBeInTheDocument();
    expect(screen.getByText('Elige una categoría.')).toBeInTheDocument();
    expect(await db.transactions.count()).toBe(0);
  });
});
