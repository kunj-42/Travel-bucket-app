import * as Linking from 'expo-linking';
import type { Place } from './types';

export function googleMapsUrl(place: Place): string {
  const base = 'https://www.google.com/maps/search/?api=1';
  // Prefer coordinates + googlePlaceId — this pins the exact place.
  if (place.coordinates && place.googlePlaceId) {
    const { latitude, longitude } = place.coordinates;
    return `${base}&query=${latitude},${longitude}&query_place_id=${place.googlePlaceId}`;
  }
  if (place.coordinates) {
    const { latitude, longitude } = place.coordinates;
    return `${base}&query=${latitude},${longitude}`;
  }
  // Fallback: structured name + city + country query. Commas help Maps parse it
  // as an address rather than a broad text search.
  const parts = [place.title, place.city, place.country].filter(Boolean);
  const q = encodeURIComponent(parts.join(', '));
  return `${base}&query=${q}`;
}

export async function openInMaps(place: Place): Promise<void> {
  await Linking.openURL(googleMapsUrl(place));
}

export async function openUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}
