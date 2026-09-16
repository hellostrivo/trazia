import { describe, expect, it } from 'vitest';
import {
  addMonths,
  formatMonthLabel,
  isLeapYear,
  isSameMonth,
  monthDiff,
  monthKeyOf,
  monthRange,
} from '../../domain/dates';

describe('dates', () => {
  it('detects leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
  });

  it('creates month keys from local dates without UTC reinterpretation', () => {
    const localDate = new Date(2026, 8, 16, 23, 59, 59, 999);
    expect(monthKeyOf(localDate)).toBe('2026-09');
    expect(monthKeyOf('2026-09-16')).toBe('2026-09');
    expect(monthKeyOf('2026-09-30')).toBe('2026-09');
  });

  it('calculates month ranges correctly for leap-year February', () => {
    const [start, end] = monthRange('2024-02');
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(1);
    expect(end.getDate()).toBe(29);
    expect(end.getHours()).toBe(23);
  });

  it('moves across months and years', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2024-01', 12)).toBe('2025-01');
    expect(addMonths('2024-03', -1)).toBe('2024-02');
  });

  it('formats month labels in Spanish', () => {
    expect(formatMonthLabel('2026-09')).toContain('septiembre');
    expect(formatMonthLabel('2024-02')).toContain('febrero');
  });

  it('compares months and calculates month differences', () => {
    const date = new Date(2026, 8, 21);
    expect(isSameMonth(date, '2026-09')).toBe(true);
    expect(isSameMonth(date, '2026-10')).toBe(false);
    expect(monthDiff('2025-12', '2026-01')).toBe(1);
    expect(monthDiff('2026-09', '2027-02')).toBe(5);
  });
});
