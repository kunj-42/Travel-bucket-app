import type { Place } from './types';
import { generateSuggestions, type Suggestion } from './suggestionsEngine';

export const MIN_ITEMS_FOR_SUGGESTIONS = 10;
export const MAX_SUGGESTIONS = 5;

export type { Suggestion };

export function canGenerate(savedCount: number): boolean {
  return savedCount >= MIN_ITEMS_FOR_SUGGESTIONS;
}

/**
 * Stable key derived from the saved-set. Changes when the user adds or
 * removes an item, so the cache self-invalidates organically.
 */
export function savedSetKey(saved: Place[]): string {
  return saved
    .map((p) => p.id)
    .sort()
    .join(',');
}

export async function fetchSuggestions(saved: Place[]): Promise<Suggestion[]> {
  if (!canGenerate(saved.length)) return [];
  return generateSuggestions(saved);
}
