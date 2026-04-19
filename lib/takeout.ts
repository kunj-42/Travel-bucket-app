import type { Coordinates, ImportedPin } from './types';

/**
 * Parse a Google Takeout Maps export file. Handles the two common formats:
 *
 * 1. GeoJSON FeatureCollection (Saved Places, custom lists). Each Feature
 *    has Point geometry [lng, lat] and a `properties.location` object with
 *    name + address.
 * 2. CSV (Starred places, older exports). Three columns: Title, Note, URL.
 *
 * Returns the parsed pins without `id`, `importedAt`, `promoted` — the
 * caller fills those in with their own bookkeeping.
 */

export type ParsedPin = Omit<ImportedPin, 'id' | 'importedAt' | 'promoted'>;

export function parseTakeout(raw: string, filename: string): ParsedPin[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseGeoJson(trimmed, filename);
  }
  return parseCsv(trimmed, filename);
}

function parseGeoJson(raw: string, filename: string): ParsedPin[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const features = extractFeatures(data);
  const sourceList = stripExtension(filename);
  const pins: ParsedPin[] = [];
  for (const f of features) {
    const pin = featureToPin(f, sourceList);
    if (pin) pins.push(pin);
  }
  return pins;
}

interface GeoFeature {
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: Record<string, unknown>;
}

function extractFeatures(data: unknown): GeoFeature[] {
  if (Array.isArray(data)) return data as GeoFeature[];
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.features)) return obj.features as GeoFeature[];
  return [];
}

function featureToPin(f: GeoFeature, sourceList: string): ParsedPin | null {
  const props = f.properties ?? {};
  const location = (props.location ?? props.Location) as
    | { name?: string; address?: string; country_code?: string }
    | undefined;

  const title =
    stringProp(location?.name) ||
    stringProp(props.Title) ||
    stringProp(props.name) ||
    stringProp((props as Record<string, unknown>)['Business Name']);
  if (!title) return null;

  const address =
    stringProp(location?.address) ||
    stringProp(props.Address) ||
    stringProp((props as Record<string, unknown>).address);

  const mapsUrl =
    stringProp(props.google_maps_url) ||
    stringProp((props as Record<string, unknown>)['Google Maps URL']) ||
    stringProp(props.url);

  const note =
    stringProp(props.Note) ||
    stringProp(props.note) ||
    stringProp(props.Comment) ||
    stringProp((props as Record<string, unknown>).comment);

  const coords = coordsFromFeature(f);
  const { city, country } = splitAddress(address, location?.country_code);

  return {
    title,
    address,
    city,
    country,
    coordinates: coords,
    mapsUrl,
    note,
    sourceList,
  };
}

function coordsFromFeature(f: GeoFeature): Coordinates | undefined {
  const c = f.geometry?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return undefined;
  const [lng, lat] = c;
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  return { latitude: lat, longitude: lng };
}

function parseCsv(raw: string, filename: string): ParsedPin[] {
  // Very small CSV parser that handles quoted fields but no escaped quotes.
  // Good enough for Takeout's simple "Title,Note,URL" exports.
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idxTitle = header.indexOf('title');
  const idxNote = header.indexOf('note');
  const idxUrl = header.indexOf('url');
  if (idxTitle < 0) return [];

  const sourceList = stripExtension(filename);
  const pins: ParsedPin[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const title = cells[idxTitle]?.trim();
    if (!title) continue;
    pins.push({
      title,
      note: idxNote >= 0 ? cells[idxNote]?.trim() || undefined : undefined,
      mapsUrl: idxUrl >= 0 ? cells[idxUrl]?.trim() || undefined : undefined,
      sourceList,
    });
  }
  return pins;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (ch === ',' && !inQuote) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function stringProp(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : undefined;
}

function stripExtension(filename: string): string {
  const base = filename.split('/').pop() ?? filename;
  return base.replace(/\.(json|geojson|csv)$/i, '');
}

/**
 * Rough city + country parse from a formatted address string. Mirrors the
 * same heuristic used elsewhere in the app (placesApi.cityFromAddress).
 */
function splitAddress(
  address: string | undefined,
  countryCode: string | undefined,
): { city?: string; country?: string } {
  if (!address) return {};
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return { country: countryCode };
  const country = parts[parts.length - 1];
  const cityRaw = parts[parts.length - 2];
  const city = cityRaw.replace(/^\d[\d\s-]*/, '').trim();
  return { city, country };
}
