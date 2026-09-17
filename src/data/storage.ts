import { db } from './db';
import { makeDefaultSettings } from '../domain/seed';

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) {
    return false;
  }

  const persist = navigator.storage.persist?.bind(navigator.storage);
  if (!persist) {
    return false;
  }

  try {
    return await persist();
  } catch {
    return false;
  }
}

export function getPersistenceStatus(): 'available' | 'unsupported' | 'denied' {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) {
    return 'unsupported';
  }

  return typeof navigator.storage.persist === 'function' ? 'available' : 'unsupported';
}

/**
 * Estado real de la persistencia (`navigator.storage.persisted()`), que
 * alimenta "Estado del almacenamiento" (SPEC-07). `getPersistenceStatus`
 * sólo dice si la API existe; esto dice si el navegador la concedió.
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (getPersistenceStatus() !== 'available') {
    return false;
  }

  const persisted = navigator.storage.persisted?.bind(navigator.storage);
  if (!persisted) {
    return false;
  }

  try {
    return await persisted();
  } catch {
    return false;
  }
}

/**
 * Pide la persistencia una sola vez por instalación (SPEC-01; SPEC-07,
 * criterio 5). `settings.persistenceRequested` registra el **intento**, no el
 * resultado, para no volver a pedirla; el estado real se consulta con
 * `isStoragePersisted()`. Se llama tras guardar el primer movimiento.
 */
export async function requestPersistenceOnce(): Promise<void> {
  const firstAttempt = await db.transaction('rw', db.settings, async () => {
    const current = (await db.settings.get('app')) ?? makeDefaultSettings();
    if (current.persistenceRequested) return false;
    await db.settings.put({ ...current, key: 'app', persistenceRequested: true });
    return true;
  });

  if (firstAttempt) {
    await requestPersistence();
  }
}
