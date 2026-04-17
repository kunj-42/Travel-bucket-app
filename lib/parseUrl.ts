import type { Category } from './types';

export interface ParsedUrl {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  siteName?: string;
  suggestedCategory?: Category;
  suggestedCity?: string;
}

const META_PATTERNS: Array<{ key: keyof ParsedUrl; re: RegExp }> = [
  { key: 'title', re: /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i },
  { key: 'title', re: /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i },
  { key: 'description', re: /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i },
  { key: 'description', re: /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i },
  { key: 'thumbnailUrl', re: /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i },
  { key: 'thumbnailUrl', re: /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i },
  { key: 'siteName', re: /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i },
];

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function guessCategory(url: string, siteName = '', title = ''): Category | undefined {
  const haystack = `${url} ${siteName} ${title}`.toLowerCase();
  if (/airbnb|booking\.com|hotels\.com|hostel|hotel|ryokan|riad|resort/.test(haystack)) return 'Stay';
  if (/restaurant|cafe|café|bar|bistro|eater|infatuation|michelin|menu|bakery|coffee/.test(haystack)) return 'Eat';
  if (/museum|gallery|viewpoint|park|temple|shrine|mosque|church|cathedral|market/.test(haystack)) return 'See';
  if (/tour|hike|trek|dive|surf|class|workshop|experience|cruise|onsen|spa/.test(haystack)) return 'Do';
  return undefined;
}

export async function parseUrl(url: string, signal?: AbortSignal): Promise<ParsedUrl> {
  const out: ParsedUrl = {};
  try {
    const res = await fetch(url, {
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BucketApp/0.1)',
        Accept: 'text/html',
      },
    });
    const html = await res.text();

    for (const { key, re } of META_PATTERNS) {
      if (out[key]) continue;
      const m = html.match(re);
      if (m?.[1]) (out[key] as unknown as string) = decode(m[1]);
    }

    if (!out.title) {
      const m = html.match(/<title>([^<]+)<\/title>/i);
      if (m?.[1]) out.title = decode(m[1]);
    }

    out.suggestedCategory = guessCategory(url, out.siteName, out.title);
  } catch {
    // Best-effort: caller falls back to manual entry.
  }
  return out;
}
