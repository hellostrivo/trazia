import { z } from 'zod';
import type { Category, AppSettings } from './types';

export const seedCategories = [
  'Hogar',
  'Supermercado',
  'Transporte',
  'Salud',
  'Cuidado personal',
  'Comidas fuera',
  'Entretenimiento',
  'Otros',
] as const;

export const seedColorKeys = [
  'slate',
  'sage',
  'ochre',
  'clay',
  'plum',
  'teal',
  'olive',
  'stone',
] as const;

export function makeSeedCategories(nowIso: string): Category[] {
  return seedCategories.map((name, index) => {
    const colorKey: Category['colorKey'] =
      seedColorKeys[index % seedColorKeys.length] ?? seedColorKeys[0];

    const category: Category = {
      id: crypto.randomUUID(),
      name,
      colorKey,
      order: index,
      archivedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return category;
  });
}

export const settingsSeedSchema = z.object({
  key: z.literal('app'),
  seededAt: z.string().nullable(),
  lastBackupAt: z.string().nullable(),
  persistenceRequested: z.boolean(),
});

export function makeDefaultSettings(): AppSettings {
  return {
    key: 'app',
    seededAt: null,
    lastBackupAt: null,
    persistenceRequested: false,
  };
}
