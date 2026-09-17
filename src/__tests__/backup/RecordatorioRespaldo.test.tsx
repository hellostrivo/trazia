import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { db } from '../../data/db';
import {
  REMINDER_NEVER_TEXT,
  REMINDER_OLD_TEXT,
} from '../../features/configuracion/RecordatorioRespaldo';
import * as deliverFileModule from '../../services/files/deliverFile';
import { makeValidBackup } from './fixtures';

/**
 * SPEC-07, punto 4 (T-019). Parte del punto de arranque real (`App` con sus
 * rutas y el shell de navegación), según T-072: así se verifica a la vez el
 * aviso en Configuración y el punto en la pestaña, no sólo la regla.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

async function seed(options: {
  transactions: boolean;
  lastBackupAt: string | null;
  dismissedAt?: string | null;
}) {
  const backup = makeValidBackup();
  await db.categories.bulkPut(backup.data.categories);
  if (options.transactions) await db.transactions.bulkPut(backup.data.transactions);
  await db.settings.put({
    key: 'app',
    seededAt: '2026-01-01T00:00:00.000Z',
    lastBackupAt: options.lastBackupAt,
    persistenceRequested: false,
    backupReminderDismissedAt: options.dismissedAt ?? null,
  });
}

async function renderConfiguracion() {
  render(
    <MemoryRouter initialEntries={['/configuracion']}>
      <App />
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Configuración', level: 1 });
  // La página deja de decir "Cargando..." cuando resuelven categorías y presupuestos.
  await screen.findByRole('region', { name: 'Datos y respaldo' });
}

const reminder = () => screen.queryByRole('complementary', { name: 'Recordatorio de respaldo' });

/** Negativo con espera: la consulta viva resuelve después del primer render. */
async function expectNoReminder() {
  await expect(
    screen.findByRole('complementary', { name: 'Recordatorio de respaldo' }, { timeout: 400 }),
  ).rejects.toThrow();
  expect(tabsHaveDot()).toBe(false);
}

/** Enlaces "Configuración" del shell (riel lateral y barra inferior). */
function configTabs() {
  return screen.getAllByRole('link', { name: /^Configuración/ });
}

function tabsHaveDot(): boolean {
  const tabs = configTabs();
  const withDot = tabs.filter((tab) => tab.querySelector('.nav-dot') !== null);
  if (withDot.length !== 0 && withDot.length !== tabs.length) {
    throw new Error('Las dos barras de navegación no coinciden');
  }
  return withDot.length === tabs.length;
}

describe('Recordatorio de respaldo (SPEC-07, punto 4)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sin movimientos no aparece, aunque nunca se haya respaldado', async () => {
    await seed({ transactions: false, lastBackupAt: null });
    await renderConfiguracion();

    await expectNoReminder();
  });

  it('con movimientos y sin respaldo previo: aviso neutro y punto en la pestaña', async () => {
    await seed({ transactions: true, lastBackupAt: null });
    await renderConfiguracion();

    const aside = await screen.findByRole('complementary', { name: 'Recordatorio de respaldo' });
    expect(aside).toHaveTextContent(REMINDER_NEVER_TEXT);
    expect(aside.textContent).not.toMatch(/cuidado|perder|¡/i);
    expect(within(aside).getByRole('button', { name: 'Descargar respaldo' })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: 'Cerrar por 30 días' })).toBeInTheDocument();
    await waitFor(() => expect(tabsHaveDot()).toBe(true));
    expect(configTabs()[0]).toHaveAccessibleName('Configuración (respaldo pendiente)');
  });

  it('aparece a los 31 días del último respaldo, no a los 29', async () => {
    await seed({ transactions: true, lastBackupAt: daysAgo(29) });
    await renderConfiguracion();
    await expectNoReminder();
  });

  it('a los 31 días muestra el texto de respaldo antiguo', async () => {
    await seed({ transactions: true, lastBackupAt: daysAgo(31) });
    await renderConfiguracion();

    const aside = await screen.findByRole('complementary', { name: 'Recordatorio de respaldo' });
    expect(aside).toHaveTextContent(REMINDER_OLD_TEXT);
    await waitFor(() => expect(tabsHaveDot()).toBe(true));
  });

  it('se oculta al descargar el respaldo desde el propio aviso', async () => {
    vi.spyOn(deliverFileModule, 'deliverFile').mockResolvedValue(undefined);
    await seed({ transactions: true, lastBackupAt: daysAgo(31) });
    await renderConfiguracion();
    const aside = await screen.findByRole('complementary', { name: 'Recordatorio de respaldo' });

    await userEvent.click(within(aside).getByRole('button', { name: 'Descargar respaldo' }));

    await waitFor(() => expect(reminder()).not.toBeInTheDocument());
    await waitFor(() => expect(tabsHaveDot()).toBe(false));
    expect((await db.settings.get('app'))?.lastBackupAt).not.toBeNull();
  });

  it('se oculta al descargar desde "Datos y respaldo"', async () => {
    vi.spyOn(deliverFileModule, 'deliverFile').mockResolvedValue(undefined);
    await seed({ transactions: true, lastBackupAt: null });
    await renderConfiguracion();
    await screen.findByRole('complementary', { name: 'Recordatorio de respaldo' });

    const section = screen.getByRole('region', { name: 'Datos y respaldo' });
    await userEvent.click(within(section).getByRole('button', { name: 'Descargar respaldo' }));

    await waitFor(() => expect(reminder()).not.toBeInTheDocument());
  });

  it('cerrar lo oculta por 30 días y guarda la fecha de descarte', async () => {
    await seed({ transactions: true, lastBackupAt: null });
    await renderConfiguracion();
    const aside = await screen.findByRole('complementary', { name: 'Recordatorio de respaldo' });

    await userEvent.click(within(aside).getByRole('button', { name: 'Cerrar por 30 días' }));

    await waitFor(() => expect(reminder()).not.toBeInTheDocument());
    await waitFor(() => expect(tabsHaveDot()).toBe(false));
    const dismissedAt = (await db.settings.get('app'))?.backupReminderDismissedAt;
    expect(dismissedAt).not.toBeNull();
    expect(Date.now() - Date.parse(dismissedAt!)).toBeLessThan(60_000);
    // No cuenta como respaldo.
    expect((await db.settings.get('app'))?.lastBackupAt).toBeNull();
  });

  it('un descarte de hace 29 días sigue vigente; uno de hace 31 ya no', async () => {
    await seed({ transactions: true, lastBackupAt: null, dismissedAt: daysAgo(29) });
    await renderConfiguracion();
    await expectNoReminder();
  });

  it('un descarte de hace 31 días ya no oculta el aviso', async () => {
    await seed({ transactions: true, lastBackupAt: null, dismissedAt: daysAgo(31) });
    await renderConfiguracion();
    expect(
      await screen.findByRole('complementary', { name: 'Recordatorio de respaldo' }),
    ).toBeInTheDocument();
  });
});
