import { z } from 'zod';

export type Cents = number;

const SAFE_MAX_CENTS = 9_999_999_99;

export const centsSchema = z.number().int().nonnegative().max(SAFE_MAX_CENTS);

export function parseMoneyInput(value: string): Cents {
  if (typeof value !== 'string') {
    throw new Error('Monto inválido');
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '$' || trimmed === '0') {
    throw new Error('Monto inválido');
  }

  if (trimmed.startsWith('-')) {
    throw new Error('Monto inválido');
  }

  const normalized = trimmed.replace(/[$\s,]/g, '').replace(/\.(?=.*\.)/g, '');

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Monto inválido');
  }

  const [whole, fraction = ''] = normalized.split('.');
  const numericValue = Number(`${whole}.${fraction.padEnd(2, '0')}`);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new Error('Monto inválido');
  }

  if (numericValue > 9_999_999.99) {
    throw new Error('Monto inválido');
  }

  const cents = Math.round(numericValue * 100);
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new Error('Monto inválido');
  }

  return cents;
}

export function formatMXN(cents: number): string {
  const safe = centsSchema.parse(cents);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe / 100);
}

export function sumCents(values: number[]): number {
  const safeValues = values.map((value) => centsSchema.parse(value));
  const total = safeValues.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error('Suma fuera de rango');
  }
  return total;
}

export function centsToNumber(cents: number): number {
  return centsSchema.parse(cents) / 100;
}

export function formatMoneyInput(cents: number): string {
  const safe = centsSchema.parse(cents);
  return (safe / 100).toFixed(2);
}

export function parseMoneyInputMany(values: string[]): number[] {
  return values.map((value) => parseMoneyInput(value));
}

export function safeCents(value: number): number {
  return centsSchema.parse(value);
}
