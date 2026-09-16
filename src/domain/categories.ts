export type NormalizedCategoryName = string;

const diacritics: Record<string, string> = {
  á: 'a',
  à: 'a',
  ä: 'a',
  â: 'a',
  é: 'e',
  è: 'e',
  ë: 'e',
  ê: 'e',
  í: 'i',
  ì: 'i',
  ï: 'i',
  î: 'i',
  ó: 'o',
  ò: 'o',
  ö: 'o',
  ô: 'o',
  ú: 'u',
  ù: 'u',
  ü: 'u',
  û: 'u',
  ñ: 'n',
  ç: 'c',
};

export function normalizeName(name: string): string {
  const trimmed = name.trim();
  const withoutDiacritics = Array.from(trimmed)
    .map((character) => diacritics[character] ?? character)
    .join('');
  return withoutDiacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function isSameCategoryName(left: string, right: string): boolean {
  return normalizeName(left) === normalizeName(right);
}
