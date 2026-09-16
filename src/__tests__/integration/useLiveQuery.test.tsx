import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLiveQuery } from '../../data/hooks/useLiveQuery';
import { db } from '../../data/db';
import { listTransactionsByMonth, upsertTransaction } from '../../data/repositories/transactions';

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

  it('re-runs the query when a dependency changes', async () => {
    await upsertTransaction({ concept: 'Septiembre', amountCents: 1000, categoryId: 'c1', date: '2026-09-10' });
    await upsertTransaction({ concept: 'Agosto', amountCents: 2000, categoryId: 'c1', date: '2026-08-10' });

    const { result, rerender } = renderHook(
      ({ monthKey }: { monthKey: string }) =>
        useLiveQuery(() => listTransactionsByMonth(monthKey), [monthKey]),
      { initialProps: { monthKey: '2026-09' } },
    );

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]?.concept).toBe('Septiembre');

    rerender({ monthKey: '2026-08' });

    await waitFor(() => expect(result.current.data?.[0]?.concept).toBe('Agosto'));
    expect(result.current.data).toHaveLength(1);

    rerender({ monthKey: '2026-07' });
    await waitFor(() => expect(result.current.data).toHaveLength(0));
  });

  it('keeps the previous behaviour when no dependencies are given', async () => {
    let calls = 0;
    const { result, rerender } = renderHook(() =>
      useLiveQuery(async () => {
        calls += 1;
        return db.transactions.toArray();
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsAfterMount = calls;

    rerender();
    rerender();

    expect(calls).toBe(callsAfterMount);
  });
});
