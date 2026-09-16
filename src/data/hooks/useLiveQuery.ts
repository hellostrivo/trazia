import { useEffect, useState } from 'react';
import { useLiveQuery as useDexieLiveQuery } from 'dexie-react-hooks';

export function useLiveQuery<T>(query: () => Promise<T>): { data: T | null; loading: boolean; error: unknown } {
  const result = useDexieLiveQuery(query, []);
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
