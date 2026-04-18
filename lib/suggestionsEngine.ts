import type { Category, Place } from './types';
import { geminiJson, hasGeminiKey } from './gemini';

export interface Suggestion {
  title: string;
  category: Category;
  city: string;
  country: string;
  reason: string;
}

const SYSTEM_PROMPT = `You are a well-read travel editor for a quiet, editorial bucket-list app (Kinfolk / Cereal Magazine feel — slow travel, serif typography, small independent places). The user has a list of places they want to visit. Your job is to propose five new places that echo the taste signals in their list.

Read their saved items for:
- Categories they care about (Stay, Eat, Do, See)
- Style and formality (Michelin vs hawker, luxury vs bohemian)
- Aesthetic (contemporary art vs classical, design vs old-world)
- Geography (specific cities, or a region / vibe they keep returning to)

Propose places that match these signals. Favor small, well-regarded independents over generic tourist landmarks. Spread across categories if their list is diverse; stay narrow if it is focused. Never include places already in their saved list.

Respond with a JSON object matching this shape exactly, nothing else:

{
  "suggestions": [
    {
      "title": "Place name",
      "category": "Stay" | "Eat" | "Do" | "See",
      "city": "City name",
      "country": "Country name",
      "reason": "One sentence (no marketing fluff) on why this matches their taste"
    }
  ]
}

Return exactly 5 items.`;

function formatSaved(saved: Place[]): string {
  const lines = saved.map((p) => {
    const tags = p.tags.length ? ` (tags: ${p.tags.join(', ')})` : '';
    const country = p.country ? `, ${p.country}` : '';
    return `- ${p.title} — ${p.category} in ${p.city}${country}${tags}`;
  });
  return `Saved items:\n${lines.join('\n')}\n\nReturn 5 suggestions.`;
}

const VALID_CATEGORIES: Category[] = ['Stay', 'Eat', 'Do', 'See'];

function normalizeCategory(raw: unknown): Category | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  const match = VALID_CATEGORIES.find((c) => c.toLowerCase() === lower);
  return match ?? null;
}

/**
 * Ask Gemini Flash for 5 taste-matched suggestions based on the user's saved
 * list. Throws on network / parse / auth errors so the caller can show an
 * error state instead of silently returning nothing.
 */
export async function generateSuggestions(saved: Place[]): Promise<Suggestion[]> {
  if (!hasGeminiKey()) throw new Error('Gemini API key not configured');
  const resp = await geminiJson<{ suggestions: Array<Record<string, unknown>> }>(
    SYSTEM_PROMPT,
    formatSaved(saved),
  );

  const savedKeys = new Set(
    saved.map((p) => `${p.title.toLowerCase()}|${p.city.toLowerCase()}`),
  );

  const cleaned: Suggestion[] = [];
  for (const raw of resp.suggestions ?? []) {
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    const city = typeof raw.city === 'string' ? raw.city.trim() : '';
    const country = typeof raw.country === 'string' ? raw.country.trim() : '';
    const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
    const category = normalizeCategory(raw.category);
    if (!title || !city || !category) continue;
    if (savedKeys.has(`${title.toLowerCase()}|${city.toLowerCase()}`)) continue;
    cleaned.push({ title, category, city, country, reason });
    if (cleaned.length >= 5) break;
  }
  return cleaned;
}
