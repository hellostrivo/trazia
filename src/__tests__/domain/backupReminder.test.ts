import { describe, expect, it } from 'vitest';
import { isBackupReminderDue } from '../../domain/backupReminder';

const now = new Date('2026-09-16T12:00:00.000Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('isBackupReminderDue (SPEC-07, punto 4)', () => {
  it('nunca se muestra sin movimientos, aunque nunca se haya respaldado', () => {
    expect(isBackupReminderDue({ transactionsCount: 0, lastBackupAt: null, dismissedAt: null, now })).toBe(false);
  });

  it('se muestra con movimientos y sin respaldo previo', () => {
    expect(isBackupReminderDue({ transactionsCount: 1, lastBackupAt: null, dismissedAt: null, now })).toBe(true);
  });

  it('aparece a los 31 días, no a los 29 ni a los 30 exactos', () => {
    const base = { transactionsCount: 3, dismissedAt: null, now };
    expect(isBackupReminderDue({ ...base, lastBackupAt: daysAgo(29) })).toBe(false);
    expect(isBackupReminderDue({ ...base, lastBackupAt: daysAgo(30) })).toBe(false);
    expect(isBackupReminderDue({ ...base, lastBackupAt: daysAgo(31) })).toBe(true);
    expect(isBackupReminderDue({ ...base, lastBackupAt: daysAgo(400) })).toBe(true);
  });

  it('se oculta al respaldar', () => {
    expect(isBackupReminderDue({ transactionsCount: 3, lastBackupAt: daysAgo(0), dismissedAt: null, now })).toBe(false);
  });

  it('el descarte dura 30 días', () => {
    const base = { transactionsCount: 3, lastBackupAt: null, now };
    expect(isBackupReminderDue({ ...base, dismissedAt: daysAgo(0) })).toBe(false);
    expect(isBackupReminderDue({ ...base, dismissedAt: daysAgo(29) })).toBe(false);
    expect(isBackupReminderDue({ ...base, dismissedAt: daysAgo(30) })).toBe(false);
    expect(isBackupReminderDue({ ...base, dismissedAt: daysAgo(31) })).toBe(true);
  });

  it('un descarte viejo no oculta un respaldo vencido', () => {
    expect(isBackupReminderDue({ transactionsCount: 3, lastBackupAt: daysAgo(45), dismissedAt: daysAgo(40), now })).toBe(true);
  });

  it('fechas ilegibles cuentan como ausentes', () => {
    expect(isBackupReminderDue({ transactionsCount: 3, lastBackupAt: 'ayer', dismissedAt: null, now })).toBe(true);
    expect(isBackupReminderDue({ transactionsCount: 3, lastBackupAt: null, dismissedAt: 'hoy', now })).toBe(true);
  });
});
