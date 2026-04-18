const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const MODEL = 'gemini-2.0-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function hasGeminiKey(): boolean {
  return API_KEY.trim().length > 0;
}

interface GenerateResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

/**
 * Call Gemini Flash with a system + user prompt and return the parsed JSON
 * response. Uses Gemini's native JSON mode (responseMimeType). Throws on
 * HTTP / parse errors so the caller can surface a real error state.
 */
export async function geminiJson<T>(system: string, user: string): Promise<T> {
  if (!hasGeminiKey()) throw new Error('Gemini API key not configured');
  const res = await fetch(
    `${BASE}/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as GenerateResponse;
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini returned no text');
  return JSON.parse(raw) as T;
}
