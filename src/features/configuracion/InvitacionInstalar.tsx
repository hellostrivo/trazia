import { useState } from 'react';
import { Button } from '../../components/Button';

export const INSTALL_TITLE_TEXT = 'Usar TRAZIA como app';
export const INSTALL_BODY_TEXT =
  'Puedes agregar TRAZIA a tu pantalla de inicio para abrirla como una app y usarla sin conexión.';
export const INSTALL_STEPS_TEXT = 'En Safari: Compartir › Agregar a pantalla de inicio.';
export const INSTALL_DISMISS_TEXT = 'Cerrar';

/** Clave local de descarte: describe a este navegador, no a los datos (no entra en respaldos). */
export const INSTALL_DISMISSED_KEY = 'trazia.invitacionInstalarCerrada';

export interface InstallEnvironment {
  userAgent: string;
  /** `navigator.platform`, para detectar iPad con agente de escritorio. */
  platform: string;
  maxTouchPoints: number;
  /** `navigator.standalone` (sólo Safari iOS). */
  standalone: boolean | undefined;
  /** `matchMedia('(display-mode: standalone)').matches`. */
  displayModeStandalone: boolean;
}

/** iPhone, iPod o iPad, incluido el iPad que se presenta como "Macintosh" con pantalla táctil. */
export function isIOSDevice(env: Pick<InstallEnvironment, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
  if (/iPhone|iPad|iPod/.test(env.userAgent)) return true;
  return env.platform === 'MacIntel' && env.maxTouchPoints > 1;
}

/**
 * Safari en iOS: excluye Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS), Opera
 * (OPiOS/OPT) y las vistas web de otras apps, que no traen "Safari/" o no
 * tienen "Versión/…". "Compartir › Agregar a pantalla de inicio" es de Safari.
 */
export function isSafariOnIOS(env: Pick<InstallEnvironment, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
  if (!isIOSDevice(env)) return false;
  const ua = env.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|YaBrowser|Instagram|FBAN|FBAV|Line\//.test(ua)) {
    return false;
  }
  return /Version\/[\d.]+.*Safari\//.test(ua);
}

export function isStandalone(env: Pick<InstallEnvironment, 'standalone' | 'displayModeStandalone'>): boolean {
  return env.standalone === true || env.displayModeStandalone;
}

/** Regla completa: Safari iOS, fuera de modo standalone y sin descarte previo. */
export function shouldShowInstallInvitation(env: InstallEnvironment, dismissed: boolean): boolean {
  return !dismissed && isSafariOnIOS(env) && !isStandalone(env);
}

function readEnvironment(): InstallEnvironment {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone: nav.standalone,
    displayModeStandalone:
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches,
  };
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
  } catch {
    // Sin almacenamiento local (modo privado antiguo): el cierre dura la sesión.
  }
}

/**
 * Configuración › tarjeta discreta (SPEC-08): sólo en Safari iOS y sólo si la
 * app no está instalada. Se puede cerrar y no vuelve a aparecer en este navegador.
 */
export function InvitacionInstalar() {
  const [visible, setVisible] = useState(() =>
    shouldShowInstallInvitation(readEnvironment(), readDismissed()),
  );

  if (!visible) return null;

  const handleDismiss = () => {
    writeDismissed();
    setVisible(false);
  };

  return (
    <section className="card invitacion-instalar" aria-labelledby="invitacion-instalar-title">
      <h2 id="invitacion-instalar-title">{INSTALL_TITLE_TEXT}</h2>
      <p>{INSTALL_BODY_TEXT}</p>
      <p>
        <strong>{INSTALL_STEPS_TEXT}</strong>
      </p>
      <div className="row">
        <Button variant="ghost" onClick={handleDismiss}>
          {INSTALL_DISMISS_TEXT}
        </Button>
      </div>
    </section>
  );
}
