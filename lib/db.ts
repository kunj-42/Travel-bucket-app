import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place } from './types';
import { SEED_PLACES } from './seed';

const STORAGE_KEY = 'bucket.places.v1';
const SEEDED_FLAG = 'bucket.seeded.v1';

export async function loadAll(): Promise<Place[]> {
  const [seededRaw, raw] = await Promise.all([
    AsyncStorage.getItem(SEEDED_FLAG),
    AsyncStorage.getItem(STORAGE_KEY),
  ]);

  if (!seededRaw) {
    await AsyncStorage.multiSet([
      [STORAGE_KEY, JSON.stringify(SEED_PLACES)],
      [SEEDED_FLAG, '1'],
    ]);
    return SEED_PLACES;
  }

  if (!raw) return [];
  try {
    return JSON.parse(raw) as Place[];
  } catch {
    return [];
  }
}

export async function saveAll(places: Place[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
}

export async function resetToSeed(): Promise<Place[]> {
  await AsyncStorage.multiSet([
    [STORAGE_KEY, JSON.stringify(SEED_PLACES)],
    [SEEDED_FLAG, '1'],
  ]);
  return SEED_PLACES;
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEY, SEEDED_FLAG]);
}
