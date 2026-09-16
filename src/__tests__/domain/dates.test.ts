import { describe, expect, it } from 'vitest';
import { addMonths, formatMonthLabel, isLeapYear, monthKeyOf, monthRange } from '../../domain/dates';

describe('dates', () => {
  it('detects leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
  });

  it('creates month keys from local dates', () => {
    expect(monthKeyOf(new Date(2026, 8, 16))).toBe('2026-09');
    expect(monthKeyOf('2026-09-16')).toBe('2026-09');
  });

  it('calculates month ranges correctly', () => {
    const [start, end] = monthRange('2024-02');
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(1);
    expect(end.getDate()).toBe(29);
  });

  it('moves across months and years', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('formats month labels in Spanish', () => {
    expect(formatMonthLabel('2026-09')).toContain('septiembre');
  });
});
