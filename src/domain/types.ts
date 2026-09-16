export type ID = string;
export type ISODateTime = string;
export type LocalDate = string;
export type MonthKey = string;
export type Cents = number;

export type SummaryStatus = 'en-plan' | 'cerca' | 'por-encima' | 'sin-presupuesto' | 'sin-actividad';
export type ChartColorKey =
  | 'slate'
  | 'sage'
  | 'ochre'
  | 'clay'
  | 'plum'
  | 'teal'
  | 'olive'
  | 'stone'
  | 'denim'
  | 'rose';

export interface Category {
  id: ID;
  name: string;
  colorKey: ChartColorKey;
  order: number;
  archivedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface BudgetVersion {
  id: ID;
  categoryId: ID;
  effectiveFrom: MonthKey;
  amountCents: Cents;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Transaction {
  id: ID;
  concept: string;
  amountCents: Cents;
  categoryId: ID;
  date: LocalDate;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface AppSettings {
  key: 'app';
  seededAt: ISODateTime | null;
  lastBackupAt: ISODateTime | null;
  persistenceRequested: boolean;
}

export interface MonthSummaryRow {
  categoryId: string;
  name: string;
  colorKey: ChartColorKey;
  budgetCents: Cents;
  spentCents: Cents;
  availableCents: Cents;
  ratio: number | null;
  status: SummaryStatus;
  shareOfSpent: number;
}

export interface MonthSummary {
  monthKey: MonthKey;
  totalBudgetCents: Cents;
  totalSpentCents: Cents;
  totalAvailableCents: Cents;
  rows: MonthSummaryRow[];
}
