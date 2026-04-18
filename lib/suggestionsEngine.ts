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

/**
 * Ask Claude Haiku for 5 taste-matched suggestions based on the user's saved
 * list. Throws on network / parse / auth errors so the caller can show an
 * error state instead of silently returning nothing.
 */
export async function generateSuggestions(saved: Place[]): Promise<Suggestion[]> {
  if (!hasGeminiKey()) throw new Error('Gemini API key not configured');
  const resp = await geminiJson<{ suggestions: Suggestion[] }>(
    SYSTEM_PROMPT,
    formatSaved(saved),
  );

  const savedKeys = new Set(
    saved.map((p) => `${p.title.toLowerCase()}|${p.city.toLowerCase()}`),
  );

  return (resp.suggestions ?? [])
    .filter((s) => s && s.title && s.city && VALID_CATEGORIES.includes(s.category))
    .filter((s) => !savedKeys.has(`${s.title.toLowerCase()}|${s.city.toLowerCase()}`))
    .slice(0, 5);
}
