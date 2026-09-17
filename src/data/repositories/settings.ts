import { z } from 'zod';
import { db } from '../db';
import { appSettingsSchema } from '../../domain/schemas';
import type { AppSettings } from '../../domain/types';

export const settingsInputSchema = z.object({
  seededAt: z.string().nullable(),
  lastBackupAt: z.string().nullable(),
  persistenceRequested: z.boolean(),
  backupReminderDismissedAt: z.string().nullable().default(null),
});

export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get('app');
  if (row) {
    return appSettingsSchema.parse(row);
  }

  const defaults: AppSettings = {
    key: 'app',
    seededAt: null,
    lastBackupAt: null,
    persistenceRequested: false,
    backupReminderDismissedAt: null,
  };

  await db.settings.put(defaults);
  return defaults;
}

export async function updateSettings(input: z.infer<typeof settingsInputSchema>): Promise<AppSettings> {
  const payload = settingsInputSchema.parse(input);
  const row: AppSettings = {
    key: 'app',
    seededAt: payload.seededAt,
    lastBackupAt: payload.lastBackupAt,
    persistenceRequested: payload.persistenceRequested,
    backupReminderDismissedAt: payload.backupReminderDismissedAt,
  };

  appSettingsSchema.parse(row);
  await db.settings.put(row);
  return row;
}

/** Cierra el recordatorio de respaldo por 30 días (SPEC-07, punto 4). */
export async function dismissBackupReminder(at: Date = new Date()): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings();
    await db.settings.put({ ...current, backupReminderDismissedAt: at.toISOString() });
  });
}
