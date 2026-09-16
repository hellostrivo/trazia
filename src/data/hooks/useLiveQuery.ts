import { useEffect, useState } from 'react';
import { useLiveQuery as useDexieLiveQuery } from 'dexie-react-hooks';

/**
 * Envuelve `dexie-react-hooks` y expone `loading`.
 *
 * `deps` se reenvía tal cual a Dexie, que memoiza el observable con esas
 * dependencias: sin ellas, el querier del primer render queda fijo y una
 * consulta parametrizada (por ejemplo, por mes) nunca se vuelve a ejecutar.
 * El valor por omisión es `[]`, así que una consulta sin parámetros se
 * comporta igual que antes.
 */
export function useLiveQuery<T>(
  query: () => Promise<T>,
  deps: readonly unknown[] = [],
): { data: T | null; loading: boolean; error: unknown } {
  const result = useDexieLiveQuery(query, deps as unknown[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setLoading(result === undefined);
    if (result !== undefined) {
      setError(null);
    }
  }, [result]);

  return {
    data: result ?? null,
    loading,
    error,
  };
}
