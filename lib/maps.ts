import * as Linking from 'expo-linking';
import type { Place } from './types';

export function googleMapsUrl(place: Place): string {
  const base = 'https://www.google.com/maps/search/?api=1';
  if (place.coordinates) {
    const { latitude, longitude } = place.coordinates;
    return `${base}&query=${latitude},${longitude}`;
  }
  const q = encodeURIComponent(`${place.title} ${place.city} ${place.country}`.trim());
  return `${base}&query=${q}`;
}

export async function openInMaps(place: Place): Promise<void> {
  await Linking.openURL(googleMapsUrl(place));
}

export async function openUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}
