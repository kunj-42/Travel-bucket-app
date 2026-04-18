import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PickedCity, Place } from './types';
import type { Suggestion } from './suggestionsEngine';

const PLACES_KEY = 'bucket.places.v2';
const CITIES_KEY = 'bucket.cities.v2';
const ONBOARDED_KEY = 'bucket.onboarded.v2';
const SUGGESTIONS_KEY = 'bucket.suggestions.v1';

export async function loadPlaces(): Promise<Place[]> {
  const raw = await AsyncStorage.getItem(PLACES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Place[];
  } catch {
    return [];
  }
}

export async function savePlaces(places: Place[]): Promise<void> {
  await AsyncStorage.setItem(PLACES_KEY, JSON.stringify(places));
}

export async function loadCities(): Promise<PickedCity[]> {
  const raw = await AsyncStorage.getItem(CITIES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PickedCity[];
  } catch {
    return [];
  }
}

export async function saveCities(cities: PickedCity[]): Promise<void> {
  await AsyncStorage.setItem(CITIES_KEY, JSON.stringify(cities));
}

export async function isOnboarded(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ONBOARDED_KEY);
  return raw === '1';
}

export async function markOnboarded(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED_KEY, '1');
}

export async function resetEverything(): Promise<void> {
  await AsyncStorage.multiRemove([PLACES_KEY, CITIES_KEY, ONBOARDED_KEY, SUGGESTIONS_KEY]);
}

interface SuggestionsCache {
  key: string;
  suggestions: Suggestion[];
  updatedAt: number;
}

export async function loadSuggestionsCache(): Promise<SuggestionsCache | null> {
  const raw = await AsyncStorage.getItem(SUGGESTIONS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SuggestionsCache;
  } catch {
    return null;
  }
}

export async function saveSuggestionsCache(cache: SuggestionsCache): Promise<void> {
  await AsyncStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(cache));
}

export async function clearSuggestionsCache(): Promise<void> {
  await AsyncStorage.removeItem(SUGGESTIONS_KEY);
}
