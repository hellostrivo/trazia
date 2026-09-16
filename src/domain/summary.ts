import { sumCents } from './money';
import type { Category, MonthSummary, MonthSummaryRow, SummaryStatus, Transaction } from './types';
import type { BudgetVersion } from './types';
import { resolveBudget } from './budget';
import type { MonthKey } from './types';

export function buildMonthSummary({
  categories,
  versions,
  transactions,
  monthKey,
}: {
  categories: readonly Category[];
  versions: readonly BudgetVersion[];
  transactions: readonly Transaction[];
  monthKey: MonthKey;
}): MonthSummary {
  const monthTransactions = transactions.filter((transaction) => transaction.date.startsWith(monthKey));
  const visibleCategories = categories.filter((category) => {
    if (category.archivedAt && category.archivedAt < `${monthKey}-01T00:00:00.000Z`) {
      return false;
    }
    return true;
  });

  const rows: MonthSummaryRow[] = visibleCategories.map((category) => {
    const budgetCents = resolveBudget(versions, category.id, monthKey);
    const spentCents = monthTransactions
      .filter((transaction) => transaction.categoryId === category.id)
      .reduce((total, transaction) => total + transaction.amountCents, 0);
    const availableCents = budgetCents - spentCents;
    const ratio = budgetCents > 0 ? spentCents / budgetCents : null;
    let status: SummaryStatus = 'sin-actividad';

    if (budgetCents > 0 && spentCents === 0) {
      status = 'en-plan';
    } else if (budgetCents > 0 && ratio !== null && ratio < 0.8) {
      status = 'en-plan';
    } else if (budgetCents > 0 && ratio !== null && ratio <= 1) {
      status = 'cerca';
    } else if (budgetCents > 0 && ratio !== null && ratio > 1) {
      status = 'por-encima';
    } else if (budgetCents === 0 && spentCents > 0) {
      status = 'sin-presupuesto';
    }

    const shareOfSpent =
      monthTransactions.reduce((total, transaction) => total + transaction.amountCents, 0) === 0
        ? 0
        : (spentCents / monthTransactions.reduce((total, transaction) => total + transaction.amountCents, 0)) * 100;

    return {
      categoryId: category.id,
      name: category.name,
      colorKey: category.colorKey,
      budgetCents,
      spentCents,
      availableCents,
      ratio,
      status,
      shareOfSpent,
    };
  });

  const totalSpentCents = sumCents(monthTransactions.map((transaction) => transaction.amountCents));
  const totalBudgetCents = sumCents(rows.map((row) => row.budgetCents));

  return {
    monthKey,
    totalBudgetCents,
    totalSpentCents,
    totalAvailableCents: totalBudgetCents - totalSpentCents,
    rows,
  };
}
