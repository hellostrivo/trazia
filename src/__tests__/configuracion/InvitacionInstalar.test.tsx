import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  INSTALL_DISMISSED_KEY,
  InvitacionInstalar,
  isSafariOnIOS,
  shouldShowInstallInvitation,
  type InstallEnvironment,
} from '../../features/configuracion/InvitacionInstalar';

const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CHROME_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1';
const FIREFOX_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/126.0 Mobile/15E148 Safari/605.1.15';
const WEBVIEW_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

function env(overrides: Partial<InstallEnvironment>): InstallEnvironment {
  return {
    userAgent: SAFARI_IPHONE,
    platform: 'iPhone',
    maxTouchPoints: 5,
    standalone: false,
    displayModeStandalone: false,
    ...overrides,
  };
}

describe('shouldShowInstallInvitation (SPEC-08)', () => {
  it('Safari en iPhone, en el navegador y sin descarte: se muestra', () => {
    expect(shouldShowInstallInvitation(env({}), false)).toBe(true);
  });

  it('iPad con agente de escritorio (Macintosh + pantalla táctil) cuenta como iOS', () => {
    expect(isSafariOnIOS({ userAgent: SAFARI_MAC, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
  });

  it('Safari en Mac (sin pantalla táctil) no es iOS', () => {
    expect(isSafariOnIOS({ userAgent: SAFARI_MAC, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
  });

  it.each([
    ['Chrome iOS', CHROME_IPHONE],
    ['Firefox iOS', FIREFOX_IPHONE],
    ['vista web de otra app', WEBVIEW_IPHONE],
    ['Chrome Android', CHROME_ANDROID],
  ])('%s: no se muestra', (_name, userAgent) => {
    expect(shouldShowInstallInvitation(env({ userAgent }), false)).toBe(false);
  });

  it('ya instalada (navigator.standalone) no se muestra', () => {
    expect(shouldShowInstallInvitation(env({ standalone: true }), false)).toBe(false);
  });

  it('ya instalada (display-mode: standalone) no se muestra', () => {
    expect(shouldShowInstallInvitation(env({ displayModeStandalone: true }), false)).toBe(false);
  });

  it('descartada antes: no se muestra', () => {
    expect(shouldShowInstallInvitation(env({}), true)).toBe(false);
  });
});

describe('InvitacionInstalar', () => {
  const originalUserAgent = navigator.userAgent;
  const originalMatchMedia = window.matchMedia;

  function pretendSafariIPhone() {
    Object.defineProperty(window.navigator, 'userAgent', { value: SAFARI_IPHONE, configurable: true });
    Object.defineProperty(window.navigator, 'platform', { value: 'iPhone', configurable: true });
    Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 5, configurable: true });
    window.matchMedia = () => ({ matches: false }) as MediaQueryList;
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', { value: originalUserAgent, configurable: true });
    window.matchMedia = originalMatchMedia;
  });

  it('en jsdom (no es Safari iOS) no se renderiza', () => {
    render(<InvitacionInstalar />);
    expect(screen.queryByRole('region', { name: 'Usar TRAZIA como app' })).not.toBeInTheDocument();
  });

  it('en Safari iOS muestra las instrucciones, con tono neutro, y se puede cerrar', async () => {
    pretendSafariIPhone();
    render(<InvitacionInstalar />);

    const card = screen.getByRole('region', { name: 'Usar TRAZIA como app' });
    expect(card).toHaveTextContent('Compartir › Agregar a pantalla de inicio');
    for (const forbidden of ['¡', 'Cuidado', 'perder', 'ahora mismo']) {
      expect(card.textContent).not.toContain(forbidden);
    }

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('region', { name: 'Usar TRAZIA como app' })).not.toBeInTheDocument();
    expect(localStorage.getItem(INSTALL_DISMISSED_KEY)).toBe('1');
  });

  it('una vez cerrada no vuelve a aparecer', () => {
    pretendSafariIPhone();
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    render(<InvitacionInstalar />);
    expect(screen.queryByRole('region', { name: 'Usar TRAZIA como app' })).not.toBeInTheDocument();
  });
});
