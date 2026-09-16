import Dexie, { type Table } from 'dexie';
import type { AppSettings, BudgetVersion, Category, Transaction } from '../domain/types';

export class TraziaDB extends Dexie {
  categories!: Table<Category, string>;
  budgetVersions!: Table<BudgetVersion, string>;
  transactions!: Table<Transaction, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('trazia');
    this.version(1).stores({
      categories: 'id, order, archivedAt',
      budgetVersions: 'id, categoryId, &[categoryId+effectiveFrom]',
      transactions: 'id, date, categoryId, [categoryId+date]',
      settings: 'key',
    });
  }
}

export const db = new TraziaDB();
