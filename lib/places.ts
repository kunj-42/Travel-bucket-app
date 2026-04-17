import { DEFAULT_BUCKET_ID, type Category, type Place } from './types';
import { loadAll, saveAll } from './db';

function uid(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface NewPlaceInput {
  title: string;
  category: Category;
  city: string;
  country: string;
  coordinates?: { latitude: number; longitude: number };
  sourceUrl?: string;
  thumbnailUrl?: string;
  notes?: string;
  tags?: string[];
}

export async function listPlaces(): Promise<Place[]> {
  const all = await loadAll();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPlace(id: string): Promise<Place | undefined> {
  const all = await loadAll();
  return all.find((p) => p.id === id);
}

export async function createPlace(input: NewPlaceInput): Promise<Place> {
  const all = await loadAll();
  const now = Date.now();
  const place: Place = {
    id: uid(),
    title: input.title.trim(),
    category: input.category,
    city: input.city.trim(),
    country: input.country.trim(),
    coordinates: input.coordinates,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    thumbnailUrl: input.thumbnailUrl?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
    createdAt: now,
    updatedAt: now,
    bucketIds: [DEFAULT_BUCKET_ID],
  };
  await saveAll([place, ...all]);
  return place;
}

export async function updatePlace(id: string, patch: Partial<NewPlaceInput>): Promise<Place | undefined> {
  const all = await loadAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return undefined;
  const prev = all[idx];
  const next: Place = {
    ...prev,
    ...patch,
    tags: patch.tags ? patch.tags.map((t) => t.trim()).filter(Boolean) : prev.tags,
    updatedAt: Date.now(),
  };
  const copy = all.slice();
  copy[idx] = next;
  await saveAll(copy);
  return next;
}

export async function deletePlace(id: string): Promise<void> {
  const all = await loadAll();
  await saveAll(all.filter((p) => p.id !== id));
}

export function collectCities(places: Place[]): string[] {
  const set = new Set<string>();
  for (const p of places) set.add(p.city);
  return Array.from(set).sort();
}

export function collectTags(places: Place[]): string[] {
  const map = new Map<string, number>();
  for (const p of places) for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t);
}
