import type { Category, Coordinates } from './types';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
const BASE = 'https://places.googleapis.com/v1';

export function hasApiKey(): boolean {
  return API_KEY.trim().length > 0;
}

export interface AutocompletePrediction {
  placeId: string;
  primary: string;
  secondary: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  coordinates?: Coordinates;
  photoName?: string;
  types: string[];
}

export interface CityHit {
  placeId: string;
  name: string;
  country: string;
  coordinates?: Coordinates;
}

function headers(fieldMask: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': fieldMask,
  };
}

export async function autocomplete(
  query: string,
  bias?: Coordinates,
): Promise<AutocompletePrediction[]> {
  if (!hasApiKey() || !query.trim()) return [];
  const body: Record<string, unknown> = { input: query };
  if (bias) {
    body.locationBias = {
      circle: { center: bias, radius: 20000 },
    };
  }
  const res = await fetch(`${BASE}/places:autocomplete`, {
    method: 'POST',
    headers: headers(
      'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
    ),
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId: string;
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };
  return (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      placeId: p.placeId,
      primary: p.structuredFormat?.mainText?.text ?? '',
      secondary: p.structuredFormat?.secondaryText?.text ?? '',
    }));
}

export async function autocompleteCities(query: string): Promise<CityHit[]> {
  if (!hasApiKey() || !query.trim()) return [];
  const res = await fetch(`${BASE}/places:autocomplete`, {
    method: 'POST',
    headers: headers(
      'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
    ),
    body: JSON.stringify({
      input: query,
      includedPrimaryTypes: ['locality', 'administrative_area_level_3'],
    }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId: string;
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };
  const hits: CityHit[] = [];
  for (const s of json.suggestions ?? []) {
    const p = s.placePrediction;
    if (!p) continue;
    hits.push({
      placeId: p.placeId,
      name: p.structuredFormat?.mainText?.text ?? '',
      country: p.structuredFormat?.secondaryText?.text ?? '',
    });
  }
  return hits;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!hasApiKey()) return null;
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers: headers('id,displayName,formattedAddress,location,photos,types'),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    photos?: Array<{ name: string }>;
    types?: string[];
  };
  return {
    placeId: json.id,
    name: json.displayName?.text ?? '',
    address: json.formattedAddress ?? '',
    coordinates: json.location
      ? { latitude: json.location.latitude, longitude: json.location.longitude }
      : undefined,
    photoName: json.photos?.[0]?.name,
    types: json.types ?? [],
  };
}

export function photoUrl(photoName: string, maxHeight = 1200): string {
  return `${BASE}/${photoName}/media?maxHeightPx=${maxHeight}&key=${API_KEY}`;
}

// Rough mapping from Google Place types to our four categories.
// Falls back to 'See' for landmarks / unknown.
export function categoryFromTypes(types: string[]): Category {
  const set = new Set(types.map((t) => t.toLowerCase()));
  const eat = [
    'restaurant', 'cafe', 'bar', 'bakery', 'food', 'meal_takeaway',
    'meal_delivery', 'ice_cream_shop', 'coffee_shop',
  ];
  const stay = ['lodging', 'hotel', 'resort_hotel', 'bed_and_breakfast', 'hostel'];
  const doTypes = [
    'spa', 'amusement_park', 'aquarium', 'zoo', 'bowling_alley', 'gym',
    'casino', 'night_club', 'tourist_attraction',
  ];
  if (eat.some((t) => set.has(t))) return 'Eat';
  if (stay.some((t) => set.has(t))) return 'Stay';
  if (doTypes.some((t) => set.has(t))) return 'Do';
  return 'See';
}

export function cityFromAddress(address: string): { city: string; country: string } {
  // "A Cevicheria, Rua Dom Pedro V 129, 1250-094 Lisboa, Portugal"
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return { city: '', country: '' };
  const country = parts[parts.length - 1];
  // City is usually the second-to-last chunk, often with a postcode prefix.
  const cityRaw = parts[parts.length - 2];
  const city = cityRaw.replace(/^\d[\d\s-]*/, '').trim();
  return { city, country };
}
