import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLiveQuery } from '../../data/hooks/useLiveQuery';
import { db } from '../../data/db';
import { upsertTransaction } from '../../data/repositories/transactions';

describe('useLiveQuery', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('updates when a transaction is saved', async () => {
    const { result } = renderHook(() =>
      useLiveQuery(async () => {
        return db.transactions.toArray();
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await upsertTransaction({
        concept: 'Mercado',
        amountCents: 1500,
        categoryId: 'cat-1',
        date: '2026-09-16',
      });
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });
  });
});
