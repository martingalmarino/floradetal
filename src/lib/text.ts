/** Lowercases and strips diacritics so "Rúcula" and "rucula" compare equal. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compareSpanish(a: string, b: string): number {
  return a.localeCompare(b, 'es-AR', { sensitivity: 'base' });
}

export interface Searchable {
  commonName: string;
  scientificName: string;
  aliases: string[];
}

export function searchIndexText(item: Searchable): string {
  return normalizeText([item.commonName, item.scientificName, ...item.aliases].join(' | '));
}

/** Every whitespace-separated term in the query must appear in the indexed text. */
export function matchesQuery(indexText: string, query: string): boolean {
  const terms = normalizeText(query).split(' ').filter(Boolean);
  return terms.every((term) => indexText.includes(term));
}
