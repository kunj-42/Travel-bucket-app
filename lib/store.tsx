import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ImportedPin, PickedCity, Place } from './types';
import {
  collectCities,
  collectTags,
  createPlace,
  deletePlace,
  listPlaces,
  setPinned,
  setVisited,
  setVisitNote,
  type NewPlaceInput,
} from './places';

export const MAX_PINS = 10;
import {
  clearImportedPins,
  isOnboarded,
  loadCities,
  loadImportedPins,
  markOnboarded,
  resetEverything,
  saveCities,
  saveImportedPins,
} from './db';
import type { ParsedPin } from './takeout';

interface StoreValue {
  places: Place[];
  pickedCities: PickedCity[];
  importedPins: ImportedPin[];
  onboarded: boolean;
  loading: boolean;
  cities: string[];
  tags: string[];
  add: (input: NewPlaceInput) => Promise<Place>;
  remove: (id: string) => Promise<void>;
  markVisited: (id: string, visited: boolean, visitNote?: string) => Promise<void>;
  updateVisitNote: (id: string, note: string) => Promise<void>;
  togglePin: (id: string) => Promise<{ ok: boolean; reason?: 'max-pins-reached' }>;
  setPickedCities: (cities: PickedCity[]) => Promise<void>;
  finishOnboarding: (cities: PickedCity[]) => Promise<void>;
  importPins: (pins: ParsedPin[]) => Promise<number>;
  removeImportedPin: (id: string) => Promise<void>;
  markPinPromoted: (id: string) => Promise<void>;
  clearImported: () => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

function pinId(): string {
  return `ip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function PlacesProvider({ children }: { children: React.ReactNode }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [pickedCities, setPickedCitiesState] = useState<PickedCity[]>([]);
  const [importedPins, setImportedPinsState] = useState<ImportedPin[]>([]);
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [all, cities, pins, done] = await Promise.all([
      listPlaces(),
      loadCities(),
      loadImportedPins(),
      isOnboarded(),
    ]);
    setPlaces(all);
    setPickedCitiesState(cities);
    setImportedPinsState(pins);
    setOnboarded(done);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const add = useCallback(
    async (input: NewPlaceInput) => {
      const place = await createPlace(input);
      await refresh();
      return place;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deletePlace(id);
      await refresh();
    },
    [refresh],
  );

  const markVisited = useCallback(
    async (id: string, visited: boolean, visitNote?: string) => {
      await setVisited(id, visited, visitNote);
      await refresh();
    },
    [refresh],
  );

  const updateVisitNote = useCallback(
    async (id: string, note: string) => {
      await setVisitNote(id, note);
      await refresh();
    },
    [refresh],
  );

  /**
   * Toggle the Up-next pin for a place. When pinning, enforce the
   * short-list cap (MAX_PINS). Caller gets a { ok, reason } back so the UI
   * can explain the rejection to the user.
   */
  const togglePin = useCallback(
    async (id: string) => {
      const all = await listPlaces();
      const target = all.find((p) => p.id === id);
      if (!target) return { ok: false };
      const nextPinned = !target.pinned;
      if (nextPinned) {
        const pinnedCount = all.filter((p) => p.pinned).length;
        if (pinnedCount >= MAX_PINS) {
          return { ok: false, reason: 'max-pins-reached' as const };
        }
      }
      await setPinned(id, nextPinned);
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const setPickedCities = useCallback(
    async (cities: PickedCity[]) => {
      await saveCities(cities);
      setPickedCitiesState(cities);
    },
    [],
  );

  const finishOnboarding = useCallback(
    async (cities: PickedCity[]) => {
      await saveCities(cities);
      await markOnboarded();
      setPickedCitiesState(cities);
      setOnboarded(true);
    },
    [],
  );

  /**
   * Merge a freshly-parsed batch into the imported list. We dedupe on
   * (title + city + mapsUrl) so re-importing the same Takeout file doesn't
   * double up. Returns the count of pins actually added (new rows).
   */
  const importPins = useCallback(
    async (pins: ParsedPin[]) => {
      const current = await loadImportedPins();
      const seen = new Set(
        current.map((p) =>
          `${p.title.toLowerCase()}|${(p.city ?? '').toLowerCase()}|${p.mapsUrl ?? ''}`,
        ),
      );
      const now = Date.now();
      const additions: ImportedPin[] = [];
      for (const p of pins) {
        const key = `${p.title.toLowerCase()}|${(p.city ?? '').toLowerCase()}|${p.mapsUrl ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        additions.push({
          id: pinId(),
          importedAt: now,
          ...p,
        });
      }
      if (additions.length === 0) return 0;
      const next = [...additions, ...current];
      await saveImportedPins(next);
      setImportedPinsState(next);
      return additions.length;
    },
    [],
  );

  const removeImportedPin = useCallback(async (id: string) => {
    const current = await loadImportedPins();
    const next = current.filter((p) => p.id !== id);
    await saveImportedPins(next);
    setImportedPinsState(next);
  }, []);

  const markPinPromoted = useCallback(async (id: string) => {
    const current = await loadImportedPins();
    const next = current.map((p) => (p.id === id ? { ...p, promoted: true } : p));
    await saveImportedPins(next);
    setImportedPinsState(next);
  }, []);

  const clearImported = useCallback(async () => {
    await clearImportedPins();
    setImportedPinsState([]);
  }, []);

  const reset = useCallback(async () => {
    await resetEverything();
    setPlaces([]);
    setPickedCitiesState([]);
    setImportedPinsState([]);
    setOnboarded(false);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      places,
      pickedCities,
      importedPins,
      onboarded,
      loading,
      cities: collectCities(places),
      tags: collectTags(places),
      add,
      remove,
      markVisited,
      updateVisitNote,
      togglePin,
      setPickedCities,
      finishOnboarding,
      importPins,
      removeImportedPin,
      markPinPromoted,
      clearImported,
      reset,
      refresh,
    }),
    [
      places,
      pickedCities,
      importedPins,
      onboarded,
      loading,
      add,
      remove,
      markVisited,
      updateVisitNote,
      togglePin,
      setPickedCities,
      finishOnboarding,
      importPins,
      removeImportedPin,
      markPinPromoted,
      clearImported,
      reset,
      refresh,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlaces(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlaces must be used inside PlacesProvider');
  return v;
}
