import type { Category, Place } from './types';

export interface SuggestionReason {
  city?: string;
  category?: Category;
  sharedTags: string[];
}

export interface Suggestion {
  place: Place;
  score: number;
  reason: SuggestionReason;
}

/**
 * Pure, deterministic recommender scaffold. Returns ranked candidates from
 * an external pool based on the user's saved list (city + tag + category
 * overlap).
 *
 * V2 swap: the candidate pool will come from a Google Places-backed retrieval
 * (or an LLM-driven "you'd also like" generator). For now the pool is empty
 * until we wire that integration, so this function returns nothing and the
 * Suggestions tab renders a helpful empty state.
 *
 * TODO(llm): feed `saved` + `pickedCities` into a retrieval call that returns
 * a candidate array, then reuse the scoring below.
 */
export function suggestPlaces(_saved: Place[], _limit = 10): Suggestion[] {
  return [];
}

export function describeReason(reason: SuggestionReason): string {
  const bits: string[] = [];
  if (reason.city) bits.push(`More from ${reason.city}`);
  if (reason.sharedTags.length) bits.push(reason.sharedTags.slice(0, 2).join(' · '));
  else if (reason.category) bits.push(`Another ${reason.category.toLowerCase()} spot`);
  return bits.join(' — ');
}
