import { z } from 'zod';

export const chartColorKeySchema = z.enum([
  'slate',
  'sage',
  'ochre',
  'clay',
  'plum',
  'teal',
  'olive',
  'stone',
  'denim',
  'rose',
]);

export const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/);
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Fecha ISO inválida',
});
export const summaryStatusSchema = z.enum([
  'en-plan',
  'cerca',
  'por-encima',
  'sin-presupuesto',
  'sin-actividad',
]);

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  colorKey: chartColorKeySchema,
  order: z.number().int().nonnegative(),
  archivedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const budgetVersionSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  effectiveFrom: monthKeySchema,
  amountCents: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const transactionSchema = z.object({
  id: z.string().min(1),
  concept: z.string().min(1).max(80),
  amountCents: z.number().int().positive().max(999999999),
  categoryId: z.string().min(1),
  date: localDateSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const appSettingsSchema = z.object({
  key: z.literal('app'),
  seededAt: isoDateTimeSchema.nullable(),
  lastBackupAt: isoDateTimeSchema.nullable(),
  persistenceRequested: z.boolean(),
});

export const monthSummaryRowSchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  colorKey: chartColorKeySchema,
  budgetCents: z.number().int().nonnegative(),
  spentCents: z.number().int().nonnegative(),
  availableCents: z.number().int(),
  ratio: z.number().nullable(),
  status: summaryStatusSchema,
  shareOfSpent: z.number().nonnegative(),
});

export const monthSummarySchema = z.object({
  monthKey: monthKeySchema,
  totalBudgetCents: z.number().int().nonnegative(),
  totalSpentCents: z.number().int().nonnegative(),
  totalAvailableCents: z.number().int(),
  rows: z.array(monthSummaryRowSchema),
});

export type ChartColorKey = z.infer<typeof chartColorKeySchema>;
export type MonthKey = z.infer<typeof monthKeySchema>;
export type LocalDate = z.infer<typeof localDateSchema>;
export type SummaryStatus = z.infer<typeof summaryStatusSchema>;
export type Category = z.infer<typeof categorySchema>;
export type BudgetVersion = z.infer<typeof budgetVersionSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type MonthSummaryRow = z.infer<typeof monthSummaryRowSchema>;
export type MonthSummary = z.infer<typeof monthSummarySchema>;
