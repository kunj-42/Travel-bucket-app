import type { Category, Coordinates } from './types';

export type LinkDomain = 'google-maps' | 'airbnb' | 'instagram' | 'tiktok' | 'generic';

export interface ParsedLink {
  domain: LinkDomain;
  sourceUrl: string;
  rejected?: boolean; // true for IG/TT — we still save the URL but can't scrape
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  city?: string;
  country?: string;
  coordinates?: Coordinates;
  googlePlaceId?: string;
  suggestedCategory?: Category;
}

const META_PATTERNS: Array<{ key: keyof ParsedLink; re: RegExp }> = [
  { key: 'title', re: /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i },
  { key: 'title', re: /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i },
  { key: 'description', re: /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i },
  { key: 'description', re: /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i },
  { key: 'thumbnailUrl', re: /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i },
  { key: 'thumbnailUrl', re: /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i },
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

export function detectDomain(url: string): LinkDomain {
  const u = url.toLowerCase();
  if (/(^|\.)google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/.test(u)) return 'google-maps';
  if (/(^|\.)airbnb\.[a-z.]+/.test(u)) return 'airbnb';
  if (/(^|\.)instagram\.com|instagr\.am/.test(u)) return 'instagram';
  if (/(^|\.)tiktok\.com/.test(u)) return 'tiktok';
  return 'generic';
}

function guessCategory(hay: string): Category | undefined {
  const h = hay.toLowerCase();
  if (/airbnb|booking\.com|hotels\.com|hostel|hotel|ryokan|riad|resort/.test(h)) return 'Stay';
  if (/restaurant|cafe|café|bar|bistro|eater|infatuation|michelin|menu|bakery|coffee/.test(h)) return 'Eat';
  if (/museum|gallery|viewpoint|park|temple|shrine|mosque|church|cathedral|market/.test(h)) return 'See';
  if (/tour|hike|trek|dive|surf|class|workshop|experience|cruise|onsen|spa/.test(h)) return 'Do';
  return undefined;
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } catch {
    return null;
  }
}

function extractMeta(html: string, out: ParsedLink) {
  for (const { key, re } of META_PATTERNS) {
    if (out[key]) continue;
    const m = html.match(re);
    if (m?.[1]) (out[key] as unknown as string) = decode(m[1]);
  }
  if (!out.title) {
    const m = html.match(/<title>([^<]+)<\/title>/i);
    if (m?.[1]) out.title = decode(m[1]);
  }
}

function parseMapsCoords(url: string): Coordinates | undefined {
  const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!m) return undefined;
  return { latitude: parseFloat(m[1]), longitude: parseFloat(m[2]) };
}

function parseMapsName(url: string): string | undefined {
  const m = url.match(/\/maps\/place\/([^/@]+)/);
  if (!m) return undefined;
  return decodeURIComponent(m[1]).replace(/\+/g, ' ');
}

async function parseGoogleMaps(url: string): Promise<ParsedLink> {
  const out: ParsedLink = { domain: 'google-maps', sourceUrl: url };

  // Short links (maps.app.goo.gl, goo.gl/maps) redirect to the full URL.
  const fetched = await fetchHtml(url);
  const resolved = fetched?.finalUrl ?? url;

  out.coordinates = parseMapsCoords(resolved) ?? parseMapsCoords(url);
  const name = parseMapsName(resolved) ?? parseMapsName(url);
  if (name) out.title = name;

  if (fetched?.html) extractMeta(fetched.html, out);
  out.suggestedCategory = guessCategory(`${out.title ?? ''} ${out.description ?? ''}`);
  return out;
}

function extractCityFromAirbnbTitle(title: string): { city?: string; country?: string } {
  // Airbnb titles often read "<type> in <city>, <country> · ..."
  const m = title.match(/\bin\s+([A-Z][A-Za-z\u00C0-\u024F'’\- ]+?)(?:,\s*([A-Z][A-Za-z\u00C0-\u024F'’\- ]+))?(?:\s*·|\s*\||$)/);
  if (!m) return {};
  return { city: m[1]?.trim(), country: m[2]?.trim() };
}

async function parseAirbnb(url: string): Promise<ParsedLink> {
  const out: ParsedLink = { domain: 'airbnb', sourceUrl: url, suggestedCategory: 'Stay' };
  const fetched = await fetchHtml(url);
  if (fetched?.html) {
    extractMeta(fetched.html, out);
    if (out.title) {
      const { city, country } = extractCityFromAirbnbTitle(out.title);
      if (city) out.city = city;
      if (country) out.country = country;
    }
  }
  return out;
}

async function parseGeneric(url: string): Promise<ParsedLink> {
  const out: ParsedLink = { domain: 'generic', sourceUrl: url };
  const fetched = await fetchHtml(url);
  if (fetched?.html) {
    extractMeta(fetched.html, out);
    out.suggestedCategory = guessCategory(
      `${url} ${out.title ?? ''} ${out.description ?? ''}`,
    );
  }
  return out;
}

/**
 * Parse any pasted URL. Returns a domain-tagged result with whatever we
 * could extract. IG/TT get a `rejected: true` flag — we still capture the
 * URL as the source link, but we don't pretend to have metadata.
 */
export async function parseLink(url: string): Promise<ParsedLink> {
  const trimmed = url.trim();
  if (!trimmed) return { domain: 'generic', sourceUrl: trimmed };
  const domain = detectDomain(trimmed);

  if (domain === 'instagram' || domain === 'tiktok') {
    return { domain, sourceUrl: trimmed, rejected: true };
  }
  if (domain === 'google-maps') return parseGoogleMaps(trimmed);
  if (domain === 'airbnb') return parseAirbnb(trimmed);
  return parseGeneric(trimmed);
}

// Backwards-compat alias — the earlier, simpler caller in add.tsx's Details
// step still uses this name to hydrate a thumbnail from a pasted source link.
export async function parseUrl(url: string): Promise<{
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  suggestedCategory?: Category;
}> {
  const r = await parseLink(url);
  return {
    title: r.title,
    description: r.description,
    thumbnailUrl: r.thumbnailUrl,
    suggestedCategory: r.suggestedCategory,
  };
}
