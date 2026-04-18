const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const BASE = 'https://api.anthropic.com/v1';
const MODEL = 'claude-haiku-4-5-20251001';

export function hasAnthropicKey(): boolean {
  return API_KEY.trim().length > 0;
}

interface MessagesResponse {
  content?: Array<{ type: string; text?: string }>;
}

/**
 * Call Claude (Haiku) with a system + user prompt and return the parsed JSON
 * response. We prefill the assistant turn with `{` to force the model to emit
 * a JSON object (Claude has no JSON-mode flag). Throws on HTTP / parse errors.
 */
export async function claudeJson<T>(
  system: string,
  user: string,
  maxTokens = 2048,
): Promise<T> {
  if (!hasAnthropicKey()) throw new Error('Anthropic API key not configured');
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [
        { role: 'user', content: user },
        { role: 'assistant', content: '{' },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as MessagesResponse;
  const raw = json.content?.find((c) => c.type === 'text')?.text;
  if (!raw) throw new Error('Claude returned no text');
  // Re-attach the prefilled `{` and trim anything after the closing brace.
  const body = `{${raw}`;
  const end = body.lastIndexOf('}');
  if (end < 0) throw new Error('Claude response was not JSON');
  return JSON.parse(body.slice(0, end + 1)) as T;
}
