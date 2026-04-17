import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { fonts, type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Divider } from '@/components/Divider';
import { usePlaces } from '@/lib/store';
import {
  autocomplete,
  autocompleteCities,
  categoryFromTypes,
  cityFromAddress,
  getPlaceDetails,
  hasApiKey,
  photoUrl,
} from '@/lib/placesApi';
import { parseUrl } from '@/lib/parseUrl';
import type { AutocompletePrediction } from '@/lib/placesApi';
import { CATEGORIES, type Category, type PickedCity } from '@/lib/types';

export default function AddPlace() {
  const insets = useSafeAreaInsets();
  const { pickedCities, setPickedCities, add } = usePlaces();
  const apiAvailable = hasApiKey();

  const [step, setStep] = useState<'city' | 'place' | 'details'>(
    pickedCities.length > 0 ? 'city' : 'place',
  );
  const [city, setCity] = useState<PickedCity | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{
    title: string;
    category: Category;
    city: string;
    country: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
    thumbnailUrl?: string;
    googlePlaceId?: string;
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [addCityQuery, setAddCityQuery] = useState('');
  const [addCityHits, setAddCityHits] = useState<PickedCity[]>([]);
  const [addingCity, setAddingCity] = useState(false);
  const seq = useRef(0);
  const citySeq = useRef(0);

  // Place autocomplete
  useEffect(() => {
    if (step !== 'place') return;
    const q = placeQuery.trim();
    if (!apiAvailable || q.length < 2) {
      setPredictions([]);
      return;
    }
    const s = ++seq.current;
    setSearching(true);
    const id = setTimeout(async () => {
      const hits = await autocomplete(q, city?.coordinates);
      if (s === seq.current) {
        setPredictions(hits);
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(id);
  }, [placeQuery, city, step, apiAvailable]);

  // Add-a-city autocomplete (when user picks "add new city")
  useEffect(() => {
    if (!addingCity) return;
    const q = addCityQuery.trim();
    if (!apiAvailable || q.length < 2) {
      setAddCityHits([]);
      return;
    }
    const s = ++citySeq.current;
    const id = setTimeout(async () => {
      const hits = await autocompleteCities(q);
      if (s !== citySeq.current) return;
      const mapped: PickedCity[] = [];
      for (const h of hits.slice(0, 6)) {
        const d = await getPlaceDetails(h.placeId);
        if (s !== citySeq.current) return;
        mapped.push({
          name: h.name,
          country: h.country.split(',').pop()?.trim() ?? h.country,
          coordinates: d?.coordinates,
        });
      }
      if (s === citySeq.current) setAddCityHits(mapped);
    }, 280);
    return () => clearTimeout(id);
  }, [addCityQuery, addingCity, apiAvailable]);

  const pickCity = (c: PickedCity) => {
    setCity(c);
    setStep('place');
  };

  const addAndPickCity = async (c: PickedCity) => {
    const exists = pickedCities.some(
      (p) => p.name === c.name && p.country === c.country,
    );
    if (!exists) await setPickedCities([...pickedCities, c]);
    setAddingCity(false);
    setAddCityQuery('');
    pickCity(c);
  };

  const pickPrediction = useCallback(
    async (p: AutocompletePrediction) => {
      setSearching(true);
      const d = await getPlaceDetails(p.placeId);
      setSearching(false);
      if (!d) return;
      const { city: c, country } = cityFromAddress(d.address);
      setSelected({
        title: d.name || p.primary,
        category: categoryFromTypes(d.types),
        city: city?.name ?? c,
        country: city?.country ?? country,
        address: d.address,
        coordinates: d.coordinates,
        thumbnailUrl: d.photoName ? photoUrl(d.photoName, 1600) : undefined,
        googlePlaceId: d.placeId,
      });
      setStep('details');
    },
    [city],
  );

  const manualEntry = () => {
    setSelected({
      title: placeQuery.trim() || 'Untitled',
      category: 'See',
      city: city?.name ?? '',
      country: city?.country ?? '',
    });
    setStep('details');
  };

  const onSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await add({
        title: selected.title,
        category: selected.category,
        city: selected.city,
        country: selected.country,
        address: selected.address,
        coordinates: selected.coordinates,
        thumbnailUrl: selected.thumbnailUrl,
        googlePlaceId: selected.googlePlaceId,
        sourceUrl: sourceUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tagsRaw
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const onPasteFromUrl = async () => {
    const u = sourceUrl.trim();
    if (!u) return;
    const res = await parseUrl(u);
    if (res.title || res.thumbnailUrl) {
      setSelected((s) =>
        s
          ? {
              ...s,
              title: s.title || res.title || '',
              thumbnailUrl: s.thumbnailUrl || res.thumbnailUrl,
            }
          : s,
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.select({ ios: 'padding', default: undefined })}
    >
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Close</Text>
        </Pressable>
        {step !== 'city' && pickedCities.length > 0 ? (
          <Pressable
            onPress={() => {
              setStep('city');
              setSelected(null);
              setPlaceQuery('');
              setPredictions([]);
            }}
          >
            <Text style={styles.cancel}>Change city</Text>
          </Pressable>
        ) : null}
      </View>

      {step === 'city' ? (
        <CityStep
          cities={pickedCities}
          onPick={pickCity}
          addingCity={addingCity}
          onBeginAddCity={() => setAddingCity(true)}
          onCancelAddCity={() => {
            setAddingCity(false);
            setAddCityQuery('');
          }}
          addCityQuery={addCityQuery}
          onAddCityQueryChange={setAddCityQuery}
          addCityHits={addCityHits}
          onAddCityPick={addAndPickCity}
          apiAvailable={apiAvailable}
        />
      ) : null}

      {step === 'place' ? (
        <PlaceStep
          city={city}
          query={placeQuery}
          onQueryChange={setPlaceQuery}
          predictions={predictions}
          searching={searching}
          onPick={pickPrediction}
          onManualEntry={manualEntry}
          apiAvailable={apiAvailable}
        />
      ) : null}

      {step === 'details' && selected ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {selected.thumbnailUrl ? (
            <Image source={{ uri: selected.thumbnailUrl }} style={styles.hero} resizeMode="cover" />
          ) : null}

          <View style={styles.detailHeader}>
            <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Confirm</Text>
            <TextInput
              value={selected.title}
              onChangeText={(v) => setSelected({ ...selected, title: v })}
              style={styles.titleInput}
              multiline
            />
            <Text style={[type.meta, { marginTop: spacing.sm }]}>
              {selected.city}
              {selected.country ? ` · ${selected.country}` : ''}
            </Text>
            {selected.address ? (
              <Text style={[type.meta, { marginTop: spacing.xs }]} numberOfLines={2}>
                {selected.address}
              </Text>
            ) : null}
            <View style={styles.rule} />
          </View>

          <Field label="Category">
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  selected={selected.category === c}
                  onPress={() => setSelected({ ...selected, category: c })}
                />
              ))}
            </View>
          </Field>

          <Field label="Tags" hint="Comma-separated, lowercase.">
            <TextInput
              value={tagsRaw}
              onChangeText={setTagsRaw}
              placeholder="natural-wine, alfama, lunch"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={styles.input}
            />
          </Field>

          <Field label="Notes">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="A line for future you."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.input, styles.notes]}
            />
          </Field>

          <Field label="Source link (optional)" hint="Reel, article, anything.">
            <TextInput
              value={sourceUrl}
              onChangeText={setSourceUrl}
              onBlur={onPasteFromUrl}
              placeholder="https://…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.input}
            />
          </Field>

          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>
            <Button
              label={saving ? 'Saving…' : 'Save to bucket'}
              onPress={onSave}
              loading={saving}
              disabled={!selected.title.trim()}
            />
          </View>
        </ScrollView>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function CityStep({
  cities,
  onPick,
  addingCity,
  onBeginAddCity,
  onCancelAddCity,
  addCityQuery,
  onAddCityQueryChange,
  addCityHits,
  onAddCityPick,
  apiAvailable,
}: {
  cities: PickedCity[];
  onPick: (c: PickedCity) => void;
  addingCity: boolean;
  onBeginAddCity: () => void;
  onCancelAddCity: () => void;
  addCityQuery: string;
  onAddCityQueryChange: (v: string) => void;
  addCityHits: PickedCity[];
  onAddCityPick: (c: PickedCity) => void;
  apiAvailable: boolean;
}) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      <View style={styles.stepHeader}>
        <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>New entry</Text>
        <Text style={type.display}>Which city?</Text>
        <Text style={[type.body, styles.subtitle]}>
          Pick one of yours, or add a new city below.
        </Text>
        <View style={styles.rule} />
      </View>

      {cities.map((c) => (
        <Pressable
          key={`${c.name}-${c.country}`}
          onPress={() => onPick(c)}
          style={({ pressed }) => [styles.cityRow, pressed && { opacity: 0.7 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={type.subtitle}>{c.name}</Text>
            <Text style={type.meta}>{c.country}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      ))}

      {addingCity ? (
        <View style={styles.addCityWrap}>
          <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Add a city</Text>
          <TextInput
            value={addCityQuery}
            onChangeText={onAddCityQueryChange}
            placeholder="Search a city…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoFocus
            style={styles.input}
          />
          {addCityHits.map((c) => (
            <Pressable
              key={`${c.name}-${c.country}`}
              onPress={() => onAddCityPick(c)}
              style={({ pressed }) => [styles.cityRow, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={type.subtitle}>{c.name}</Text>
                <Text style={type.meta}>{c.country}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={onCancelAddCity} style={{ paddingTop: spacing.lg }}>
            <Text style={[type.labelSoft, { color: colors.accent }]}>Cancel</Text>
          </Pressable>
          {!apiAvailable ? (
            <Text style={[type.meta, { marginTop: spacing.md }]}>
              City search needs a Google Places API key. See the README.
            </Text>
          ) : null}
        </View>
      ) : (
        <Pressable onPress={onBeginAddCity} style={styles.addCityBtn}>
          <Text style={[type.label, { color: colors.accent }]}>＋ Add a new city</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function PlaceStep({
  city,
  query,
  onQueryChange,
  predictions,
  searching,
  onPick,
  onManualEntry,
  apiAvailable,
}: {
  city: PickedCity | null;
  query: string;
  onQueryChange: (v: string) => void;
  predictions: AutocompletePrediction[];
  searching: boolean;
  onPick: (p: AutocompletePrediction) => void;
  onManualEntry: () => void;
  apiAvailable: boolean;
}) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      <View style={styles.stepHeader}>
        <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>
          {city ? city.name : 'Anywhere'}
        </Text>
        <Text style={type.display}>What is it?</Text>
        <Text style={[type.body, styles.subtitle]}>
          Type the name of the place. We'll pull the photo, address and a pin from Google.
        </Text>
        <View style={styles.rule} />
      </View>

      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.lg }}>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="A Cevicheria, Kissa Madragoa…"
          placeholderTextColor={colors.textMuted}
          autoFocus
          style={styles.input}
        />
        {searching ? (
          <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.textMuted} />
        ) : null}
      </View>

      {!apiAvailable ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <Text style={[type.body, { marginBottom: spacing.lg }]}>
            Google Places API key isn't configured. You can still add this place manually.
          </Text>
          <Button label="Continue manually" onPress={onManualEntry} variant="outline" />
        </View>
      ) : null}

      {predictions.map((p) => (
        <Pressable
          key={p.placeId}
          onPress={() => onPick(p)}
          style={({ pressed }) => [styles.predictionRow, pressed && { opacity: 0.7 }]}
        >
          <Text style={type.subtitle}>{p.primary}</Text>
          <Text style={type.meta} numberOfLines={1}>
            {p.secondary}
          </Text>
        </Pressable>
      ))}

      {predictions.length > 0 ? <Divider style={{ marginHorizontal: spacing.xl, marginTop: spacing.lg }} /> : null}

      {query.trim().length >= 2 && !searching && apiAvailable ? (
        <Pressable onPress={onManualEntry} style={styles.manualBtn}>
          <Text style={[type.label, { color: colors.accent }]}>
            Not here — enter manually
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>{label}</Text>
      {children}
      {hint ? <Text style={[type.meta, { marginTop: spacing.sm }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  cancel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  stepHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.md,
    maxWidth: 440,
  },
  rule: {
    height: 1,
    backgroundColor: colors.text,
    width: 36,
    marginTop: spacing.xxl,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  arrow: {
    fontFamily: fonts.sans,
    fontSize: 20,
    color: colors.textMuted,
  },
  addCityBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  addCityWrap: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  predictionRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    gap: spacing.xs,
  },
  manualBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  hero: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface,
  },
  detailHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  titleInput: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  field: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.text,
  },
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
