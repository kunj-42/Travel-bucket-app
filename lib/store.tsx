import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PickedCity, Place } from './types';
import {
  collectCities,
  collectTags,
  createPlace,
  deletePlace,
  listPlaces,
  type NewPlaceInput,
} from './places';
import {
  isOnboarded,
  loadCities,
  markOnboarded,
  resetEverything,
  saveCities,
} from './db';

interface StoreValue {
  places: Place[];
  pickedCities: PickedCity[];
  onboarded: boolean;
  loading: boolean;
  cities: string[];
  tags: string[];
  add: (input: NewPlaceInput) => Promise<Place>;
  remove: (id: string) => Promise<void>;
  setPickedCities: (cities: PickedCity[]) => Promise<void>;
  finishOnboarding: (cities: PickedCity[]) => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

export function PlacesProvider({ children }: { children: React.ReactNode }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [pickedCities, setPickedCitiesState] = useState<PickedCity[]>([]);
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [all, cities, done] = await Promise.all([
      listPlaces(),
      loadCities(),
      isOnboarded(),
    ]);
    setPlaces(all);
    setPickedCitiesState(cities);
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

  const reset = useCallback(async () => {
    await resetEverything();
    setPlaces([]);
    setPickedCitiesState([]);
    setOnboarded(false);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      places,
      pickedCities,
      onboarded,
      loading,
      cities: collectCities(places),
      tags: collectTags(places),
      add,
      remove,
      setPickedCities,
      finishOnboarding,
      reset,
      refresh,
    }),
    [places, pickedCities, onboarded, loading, add, remove, setPickedCities, finishOnboarding, reset, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlaces(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlaces must be used inside PlacesProvider');
  return v;
}
