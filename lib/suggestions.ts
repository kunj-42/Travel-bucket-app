import { CANDIDATE_PLACES } from './seed';
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

interface Profile {
  cities: Map<string, number>;
  categories: Map<Category, number>;
  tags: Map<string, number>;
  savedIds: Set<string>;
}

function buildProfile(saved: Place[]): Profile {
  const cities = new Map<string, number>();
  const categories = new Map<Category, number>();
  const tags = new Map<string, number>();
  const savedIds = new Set<string>();

  for (const p of saved) {
    savedIds.add(p.id);
    const cityKey = `${p.city}|${p.country}`;
    cities.set(cityKey, (cities.get(cityKey) ?? 0) + 1);
    categories.set(p.category, (categories.get(p.category) ?? 0) + 1);
    for (const tag of p.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
  }

  return { cities, categories, tags, savedIds };
}

function scoreCandidate(candidate: Place, profile: Profile): Suggestion | null {
  if (profile.savedIds.has(candidate.id)) return null;

  const cityKey = `${candidate.city}|${candidate.country}`;
  const cityWeight = profile.cities.get(cityKey) ?? 0;
  const categoryWeight = profile.categories.get(candidate.category) ?? 0;

  const sharedTags = candidate.tags.filter((t) => profile.tags.has(t));
  const tagWeight = sharedTags.reduce((acc, t) => acc + (profile.tags.get(t) ?? 0), 0);

  const score = cityWeight * 3 + tagWeight * 2 + categoryWeight * 1;
  if (score <= 0) return null;

  const reason: SuggestionReason = {
    city: cityWeight > 0 ? candidate.city : undefined,
    category: categoryWeight > 0 ? candidate.category : undefined,
    sharedTags,
  };
  return { place: candidate, score, reason };
}

/**
 * Pure, deterministic recommender. Given the user's saved places, returns
 * ranked candidates from a seeded pool using city + tag + category overlap.
 *
 * TODO(llm): swap the candidate pool + scoring for an LLM/retrieval backend.
 * The signature should stay the same so the UI doesn't need to change —
 * feed the saved list + a prompt, get a list of {place, score, reason}.
 */
export function suggestPlaces(saved: Place[], limit = 10): Suggestion[] {
  if (saved.length === 0) return [];
  const profile = buildProfile(saved);

  const scored: Suggestion[] = [];
  for (const candidate of CANDIDATE_PLACES) {
    const s = scoreCandidate(candidate, profile);
    if (s) scored.push(s);
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function describeReason(reason: SuggestionReason): string {
  const bits: string[] = [];
  if (reason.city) bits.push(`More from ${reason.city}`);
  if (reason.sharedTags.length) bits.push(reason.sharedTags.slice(0, 2).join(' · '));
  else if (reason.category) bits.push(`Another ${reason.category.toLowerCase()} spot`);
  return bits.join(' — ');
}
