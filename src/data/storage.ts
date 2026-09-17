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
