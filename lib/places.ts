import { DEFAULT_BUCKET_ID, type Category, type Coordinates, type Place } from './types';
import { loadPlaces, savePlaces } from './db';

function uid(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface NewPlaceInput {
  title: string;
  category: Category;
  city: string;
  country: string;
  coordinates?: Coordinates;
  sourceUrl?: string;
  thumbnailUrl?: string;
  address?: string;
  googlePlaceId?: string;
  notes?: string;
  tags?: string[];
}

export async function listPlaces(): Promise<Place[]> {
  const all = await loadPlaces();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPlace(id: string): Promise<Place | undefined> {
  const all = await loadPlaces();
  return all.find((p) => p.id === id);
}

export async function createPlace(input: NewPlaceInput): Promise<Place> {
  const all = await loadPlaces();
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
    address: input.address?.trim() || undefined,
    googlePlaceId: input.googlePlaceId,
    notes: input.notes?.trim() || undefined,
    tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
    createdAt: now,
    updatedAt: now,
    bucketIds: [DEFAULT_BUCKET_ID],
  };
  await savePlaces([place, ...all]);
  return place;
}

export async function updatePlace(id: string, patch: Partial<NewPlaceInput>): Promise<Place | undefined> {
  const all = await loadPlaces();
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
  await savePlaces(copy);
  return next;
}

export async function deletePlace(id: string): Promise<void> {
  const all = await loadPlaces();
  await savePlaces(all.filter((p) => p.id !== id));
}

/**
 * Flip the visited flag on a place and (optionally) update the share-note.
 * Clearing visited also clears the note, since the note is the post-visit
 * artefact — a place can't have a tip you'd share if you haven't been.
 */
export async function setVisited(
  id: string,
  visited: boolean,
  visitNote?: string,
): Promise<Place | undefined> {
  const all = await loadPlaces();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return undefined;
  const prev = all[idx];
  const next: Place = {
    ...prev,
    visited,
    visitedAt: visited ? (prev.visitedAt ?? Date.now()) : undefined,
    visitNote: visited ? (visitNote ?? prev.visitNote) : undefined,
    updatedAt: Date.now(),
  };
  const copy = all.slice();
  copy[idx] = next;
  await savePlaces(copy);
  return next;
}

export async function setVisitNote(id: string, note: string): Promise<Place | undefined> {
  const all = await loadPlaces();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return undefined;
  const prev = all[idx];
  if (!prev.visited) return prev;
  const next: Place = {
    ...prev,
    visitNote: note.trim() || undefined,
    updatedAt: Date.now(),
  };
  const copy = all.slice();
  copy[idx] = next;
  await savePlaces(copy);
  return next;
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
