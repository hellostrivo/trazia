import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Captura from '../../pages/Captura';
import { db } from '../../data/db';
import { requestPersistenceOnce } from '../../data/storage';
import type { Category } from '../../domain/types';

/**
 * SPEC-07, criterio 5. Se prueba desde la página real (no sólo la función):
 * `requestPersistence` existió desde SPEC-01 sin que nadie la llamara, y las
 * pruebas de la función en aislamiento no lo detectaban.
 */

const hogar: Category = {
  id: 'cat-1',
  name: 'Hogar',
  colorKey: 'slate',
  order: 0,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

let persist: ReturnType<typeof vi.fn>;

async function renderCaptura() {
  await db.categories.bulkPut([hogar]);
  render(
    <MemoryRouter>
      <Captura />
    </MemoryRouter>,
  );
  return screen.findByRole('button', { name: 'Guardar' });
}

async function guardarMovimiento(concepto: string) {
  await userEvent.clear(screen.getByLabelText('Monto'));
  await userEvent.type(screen.getByLabelText('Monto'), '250');
  await userEvent.clear(screen.getByLabelText('Concepto'));
  await userEvent.type(screen.getByLabelText('Concepto'), concepto);
  await userEvent.click(
    within(screen.getByRole('radiogroup', { name: 'Categoría' })).getByRole('radio', {
      name: 'Hogar',
    }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByText(new RegExp(`Guardado:`));
}

describe('Captura · solicitud de persistencia (SPEC-07, criterio 5)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    persist = vi.fn(async () => true);
    Object.defineProperty(navigator, 'storage', {
      value: { persist, persisted: vi.fn(async () => true) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    delete (navigator as { storage?: unknown }).storage;
    vi.restoreAllMocks();
  });

  it('pide la persistencia tras guardar el primer movimiento y no en los siguientes', async () => {
    await renderCaptura();
    expect(persist).not.toHaveBeenCalled();

    await guardarMovimiento('Primero');
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    await waitFor(async () => {
      expect((await db.settings.get('app'))?.persistenceRequested).toBe(true);
    });

    await guardarMovimiento('Segundo');
    await guardarMovimiento('Tercero');
    expect(await db.transactions.count()).toBe(3);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('no la vuelve a pedir si ya se intentó en otra sesión, aunque el navegador la haya negado', async () => {
    await db.settings.put({
      key: 'app',
      seededAt: null,
      lastBackupAt: null,
      persistenceRequested: true,
      backupReminderDismissedAt: null,
    });
    await renderCaptura();

    await guardarMovimiento('Único');
    expect(await db.transactions.count()).toBe(1);
    expect(persist).not.toHaveBeenCalled();
  });

  it('registra el intento aunque el navegador la niegue', async () => {
    persist.mockResolvedValue(false);
    await renderCaptura();

    await guardarMovimiento('Negado');
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    await waitFor(async () => {
      expect((await db.settings.get('app'))?.persistenceRequested).toBe(true);
    });
  });

  it('si la API no existe, el movimiento se guarda y el intento queda registrado', async () => {
    delete (navigator as { storage?: unknown }).storage;
    await renderCaptura();

    await guardarMovimiento('Sin API');
    expect(await db.transactions.count()).toBe(1);
    await waitFor(async () => {
      expect((await db.settings.get('app'))?.persistenceRequested).toBe(true);
    });
  });
});

describe('requestPersistenceOnce', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    persist = vi.fn(async () => true);
    Object.defineProperty(navigator, 'storage', {
      value: { persist, persisted: vi.fn(async () => true) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    delete (navigator as { storage?: unknown }).storage;
  });

  it('marca el intento y llama a persist() una sola vez, también con llamadas concurrentes', async () => {
    await Promise.all([requestPersistenceOnce(), requestPersistenceOnce()]);
    await requestPersistenceOnce();

    expect(persist).toHaveBeenCalledTimes(1);
    expect((await db.settings.get('app'))?.persistenceRequested).toBe(true);
  });

  it('conserva el resto de settings', async () => {
    await db.settings.put({
      key: 'app',
      seededAt: '2026-01-01T00:00:00.000Z',
      lastBackupAt: '2026-09-01T00:00:00.000Z',
      persistenceRequested: false,
      backupReminderDismissedAt: null,
    });
    await requestPersistenceOnce();
    expect(await db.settings.get('app')).toEqual({
      key: 'app',
      seededAt: '2026-01-01T00:00:00.000Z',
      lastBackupAt: '2026-09-01T00:00:00.000Z',
      persistenceRequested: true,
      backupReminderDismissedAt: null,
    });
  });
});
