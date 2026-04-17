import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Place } from './types';
import {
  collectCities,
  collectTags,
  createPlace,
  deletePlace,
  listPlaces,
  type NewPlaceInput,
} from './places';
import { resetToSeed } from './db';

interface StoreValue {
  places: Place[];
  loading: boolean;
  cities: string[];
  tags: string[];
  add: (input: NewPlaceInput) => Promise<Place>;
  remove: (id: string) => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

export function PlacesProvider({ children }: { children: React.ReactNode }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listPlaces();
    setPlaces(all);
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

  const reset = useCallback(async () => {
    await resetToSeed();
    await refresh();
  }, [refresh]);

  const value = useMemo<StoreValue>(
    () => ({
      places,
      loading,
      cities: collectCities(places),
      tags: collectTags(places),
      add,
      remove,
      reset,
      refresh,
    }),
    [places, loading, add, remove, reset, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlaces(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlaces must be used inside PlacesProvider');
  return v;
}
