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
