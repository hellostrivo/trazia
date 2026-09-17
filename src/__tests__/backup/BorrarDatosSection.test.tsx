import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../data/db';
import {
  BorrarDatosSection,
  DELETE_DONE_TEXT,
} from '../../features/configuracion/BorrarDatosSection';
import { seedCategories } from '../../domain/seed';
import * as deliverFileModule from '../../services/files/deliverFile';
import { makeValidBackup } from './fixtures';

async function seedCurrentData() {
  const backup = makeValidBackup();
  await db.categories.bulkPut(backup.data.categories);
  await db.budgetVersions.bulkPut(backup.data.budgetVersions);
  await db.transactions.bulkPut(backup.data.transactions);
  await db.settings.put({
    key: 'app',
    seededAt: '2026-01-01T00:00:00.000Z',
    lastBackupAt: null,
    persistenceRequested: false,
    backupReminderDismissedAt: null,
  });
}

async function openDialog() {
  await userEvent.click(screen.getByRole('button', { name: 'Borrar todos los datos' }));
  return screen.findByRole('dialog', { name: 'Borrar todos los datos' });
}

async function goToTypingStep() {
  const dialog = await openDialog();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }));
  const input = within(dialog).getByLabelText('Escribe BORRAR para confirmar');
  const confirm = within(dialog).getByRole('button', { name: 'Borrar todo' });
  return { dialog, input, confirm };
}

describe('BorrarDatosSection (SPEC-07, punto 5)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedCurrentData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('criterio 4: el botón sólo se activa con BORRAR exacto; "borrar", "BORRA" o vacío no proceden', async () => {
    render(<BorrarDatosSection />);
    const { input, confirm } = await goToTypingStep();

    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    expect(await db.transactions.count()).toBe(3);

    for (const wrong of ['borrar', 'BORRA', 'Borrar', 'BORRAR ']) {
      await userEvent.clear(input);
      await userEvent.type(input, wrong);
      expect(confirm, wrong).toBeDisabled();
    }
    expect(await db.transactions.count()).toBe(3);

    await userEvent.clear(input);
    await userEvent.type(input, 'BORRAR');
    expect(confirm).toBeEnabled();
    // Sigue sin borrar nada hasta pulsar.
    expect(await db.transactions.count()).toBe(3);
  });

  it('con BORRAR deja las 8 categorías genéricas, cero movimientos y seededAt no nulo', async () => {
    render(<BorrarDatosSection />);
    const { input, confirm } = await goToTypingStep();

    await userEvent.type(input, 'BORRAR');
    await userEvent.click(confirm);

    expect(await screen.findByRole('status')).toHaveTextContent(DELETE_DONE_TEXT);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const categories = await db.categories.orderBy('order').toArray();
    expect(categories.map((c) => c.name)).toEqual([...seedCategories]);
    expect(await db.transactions.count()).toBe(0);
    expect(await db.budgetVersions.count()).toBe(0);
    const settings = await db.settings.get('app');
    expect(settings?.seededAt).not.toBeNull();
    expect(settings?.seededAt).not.toBe('2026-01-01T00:00:00.000Z');
    expect(settings?.lastBackupAt).toBeNull();
  });

  it('el primer diálogo no borra nada por sí solo; cancelar en cualquier paso deja todo igual', async () => {
    render(<BorrarDatosSection />);
    const dialog = await openDialog();
    expect(dialog).toHaveTextContent('Esta acción no se puede deshacer.');
    expect(within(dialog).queryByRole('button', { name: 'Borrar todo' })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const { input, dialog: second } = await goToTypingStep();
    await userEvent.type(input, 'BORRAR');
    await userEvent.click(within(second).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await db.transactions.count()).toBe(3);

    // Al reabrir, el campo vuelve vacío: no hereda el BORRAR anterior.
    const third = await goToTypingStep();
    expect(third.input).toHaveValue('');
    expect(third.confirm).toBeDisabled();
  });

  it('"Descargar respaldo actual primero" entrega los datos vigentes y mantiene el diálogo', async () => {
    const deliver = vi.spyOn(deliverFileModule, 'deliverFile').mockResolvedValue(undefined);
    render(<BorrarDatosSection />);
    const dialog = await openDialog();

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descargar respaldo actual primero' }),
    );
    await waitFor(() => expect(deliver).toHaveBeenCalledTimes(1));
    expect(deliver.mock.calls[0]![1]).toMatch(/^trazia-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
    expect(screen.getByRole('dialog', { name: 'Borrar todos los datos' })).toBeInTheDocument();
    expect(await db.transactions.count()).toBe(3);
    await waitFor(async () => {
      expect((await db.settings.get('app'))?.lastBackupAt).not.toBeNull();
    });
  });

  it('si la transacción falla, avisa que nada cambió y la base queda igual', async () => {
    vi.spyOn(db.categories, 'bulkAdd').mockRejectedValueOnce(new Error('fallo simulado'));
    render(<BorrarDatosSection />);
    const { input, confirm } = await goToTypingStep();

    await userEvent.type(input, 'BORRAR');
    await userEvent.click(confirm);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron borrar los datos. Tus datos actuales no se modificaron.',
    );
    expect((await db.transactions.toArray()).map((t) => t.id).sort()).toEqual([
      'tx-1',
      'tx-2',
      'tx-3',
    ]);
    expect((await db.categories.toArray()).map((c) => c.id).sort()).toEqual([
      'cat-hogar',
      'cat-super',
    ]);
  });
});
