import { z } from 'zod';
import { db } from '../db';
import { transactionSchema } from '../../domain/schemas';
import type { Transaction } from '../../domain/types';

export const transactionInputSchema = z.object({
  concept: z.string().min(1).max(80),
  amountCents: z.number().int().positive().max(999999999),
  categoryId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function listTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').toArray();
}

export async function listTransactionsByMonth(monthKey: string): Promise<Transaction[]> {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
  return db.transactions.where('date').between(start, end, true, true).toArray();
}

export async function upsertTransaction(input: z.infer<typeof transactionInputSchema> & { id?: string }): Promise<Transaction> {
  const payload = transactionInputSchema.parse(input);
  const now = new Date().toISOString();
  const existing = input.id ? await db.transactions.get(input.id) : undefined;
  const record: Transaction = {
    id: input.id ?? crypto.randomUUID(),
    concept: payload.concept,
    amountCents: payload.amountCents,
    categoryId: payload.categoryId,
    date: payload.date,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  transactionSchema.parse(record);
  await db.transactions.put(record);
  return record;
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}
