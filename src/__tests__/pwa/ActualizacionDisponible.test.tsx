import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

/**
 * El módulo virtual de vite-plugin-pwa se sustituye por un doble controlable:
 * `needRefresh` arranca en el valor de `initialNeedRefresh` y
 * `updateServiceWorker` es un espía.
 */
const updateServiceWorker = vi.fn(async () => {});
let initialNeedRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => {
    const needRefresh = useState(initialNeedRefresh);
    const offlineReady = useState(false);
    return { needRefresh, offlineReady, updateServiceWorker };
  },
}));

const { ActualizacionDisponible, UPDATE_AVAILABLE_TEXT } = await import(
  '../../features/pwa/ActualizacionDisponible'
);

describe('ActualizacionDisponible (SPEC-08)', () => {
  beforeEach(() => {
    updateServiceWorker.mockClear();
  });

  it('no muestra nada mientras no hay una versión nueva en espera', () => {
    initialNeedRefresh = false;
    render(<ActualizacionDisponible />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('muestra "Hay una nueva versión disponible · Actualizar" y pide el cambio de service worker', async () => {
    initialNeedRefresh = true;
    render(<ActualizacionDisponible />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(`${UPDATE_AVAILABLE_TEXT} · Actualizar`);

    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Actualizando…' })).toBeDisabled();
  });

  it('"Después" oculta el aviso sin tocar el service worker', async () => {
    initialNeedRefresh = true;
    render(<ActualizacionDisponible />);

    await userEvent.click(screen.getByRole('button', { name: 'Después' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });
});
