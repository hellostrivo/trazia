import { z } from 'zod';
import type { LocalDate, MonthKey } from './schemas';

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/);
const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function monthKeyOf(date: Date | LocalDate | string): MonthKey {
  const value = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? parseLocalDate(date) : date;
  const actualDate = value instanceof Date ? value : new Date(value);
  const year = actualDate.getFullYear();
  const month = String(actualDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}` as MonthKey;
}

export function today(): LocalDate {
  return formatLocalDate(new Date());
}

export function formatLocalDate(date: Date): LocalDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as LocalDate;
}

export function parseLocalDate(value: LocalDate): Date {
  localDateSchema.parse(value);
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return new Date(year, month - 1, day);
}

export function monthRange(key: MonthKey): [Date, Date] {
  const parsed = monthKeySchema.parse(key);
  const [yearText, monthText] = parsed.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0, 23, 59, 59, 999);
  return [firstDay, lastDay];
}

export function addMonths(key: MonthKey, amount: number): MonthKey {
  const parsed = monthKeySchema.parse(key);
  const [yearText, monthText] = parsed.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const next = new Date(year, month - 1 + amount, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}` as MonthKey;
}

export function formatMonthLabel(key: MonthKey): string {
  const parsed = monthKeySchema.parse(key);
  const [yearText, monthText] = parsed.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(date);
}

export function isSameMonth(date: Date, key: MonthKey): boolean {
  return monthKeyOf(date) === key;
}

export function monthDiff(from: MonthKey, to: MonthKey): number {
  const [fromYearText, fromMonthText] = from.split('-');
  const [toYearText, toMonthText] = to.split('-');
  const fromYear = Number(fromYearText);
  const fromMonth = Number(fromMonthText);
  const toYear = Number(toYearText);
  const toMonth = Number(toMonthText);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}
