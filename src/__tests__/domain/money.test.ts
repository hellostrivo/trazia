import { describe, expect, it } from 'vitest';
import {
  centsToNumber,
  formatMXN,
  formatMoneyInput,
  parseMoneyInput,
  parseMoneyInputMany,
  safeCents,
  sumCents,
} from '../../domain/money';

describe('money', () => {
  it.each([
    ['1234', 123400],
    ['1,234.5', 123450],
    ['1234.50', 123450],
    ['$1,234.50', 123450],
    ['9999999.99', 999999999],
    ['0001234', 123400],
    ['0.01', 1],
    ['$0.50', 50],
  ])('parses %s as %d cents', (value, expected) => {
    expect(parseMoneyInput(value)).toBe(expected);
  });

  it.each([
    '',
    '0',
    '-1',
    '$-1',
    '1,234.567',
    'abc',
    '1.234',
    '1234.567',
    '99999999.99',
    '100000000.00',
    ' ',
    '$',
    '1e3',
    '3.1416',
  ])('rejects %s', (value) => {
    expect(() => parseMoneyInput(value)).toThrow();
  });

  it('formats money in MXN', () => {
    expect(formatMXN(123450)).toBe('$1,234.50');
  });

  it('sums cents safely', () => {
    expect(sumCents([100, 200, 300])).toBe(600);
  });

  it('converts cents to number', () => {
    expect(centsToNumber(123450)).toBe(1234.5);
  });

  it('formats a cents value as decimal input', () => {
    expect(formatMoneyInput(123450)).toBe('1234.50');
  });

  it('validates cents', () => {
    expect(safeCents(2500)).toBe(2500);
    expect(() => safeCents(-1)).toThrow();
  });

  it('covers the non-zero invalid and bulk parsing branches', () => {
    expect(() => parseMoneyInput('0.00')).toThrow('Monto inválido');
    expect(parseMoneyInputMany(['100', '200.50', '$1,234.00'])).toEqual([10000, 20050, 123400]);
  });
});
