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
  searchText,
} from '@/lib/placesApi';
import { parseLink, parseUrl, type LinkDomain } from '@/lib/parseUrl';
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

  // Paste-link flow state. `prefill` captures whatever a paste succeeded in
  // scraping; it seeds the title/photo/source URL through the rest of the
  // flow even when the user still needs to pick a city.
  const [pastingLink, setPastingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkProcessing, setLinkProcessing] = useState(false);
  const [linkNote, setLinkNote] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<{
    title?: string;
    thumbnailUrl?: string;
    sourceUrl?: string;
    domain?: LinkDomain;
    suggestedCategory?: Category;
    city?: string;
    country?: string;
  } | null>(null);

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
      if (s === citySeq.current) {
        // Dedupe by name|country so the list has unique keys even when
        // Google returns two cities that collapse to the same label.
        const seen = new Set<string>();
        const unique = mapped.filter((c) => {
          const k = `${c.name}|${c.country}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setAddCityHits(unique);
      }
    }, 280);
    return () => clearTimeout(id);
  }, [addCityQuery, addingCity, apiAvailable]);

  const onPasteLink = async () => {
    const u = linkUrl.trim();
    if (!u || linkProcessing) return;
    setLinkProcessing(true);
    setLinkNote(null);
    try {
      const res = await parseLink(u);

      // Instagram / TikTok: rejected scrape, but we still keep the URL so the
      // user can tap back to it from the place detail.
      if (res.rejected) {
        setPrefill({ sourceUrl: res.sourceUrl, domain: res.domain });
        setLinkNote(
          res.domain === 'instagram'
            ? "Instagram doesn't share its data. Pick a city and search for the place — the link is saved."
            : "TikTok doesn't share its data. Pick a city and search for the place — the link is saved.",
        );
        setPastingLink(false);
        setLinkUrl('');
        return;
      }

      // Google Maps share link: try to upgrade to a full Places match so we
      // get a photo, address and the right place_id for the deep link.
      if (res.domain === 'google-maps' && res.title) {
        const match = await searchText(res.title, res.coordinates);
        if (match) {
          const { city: c, country } = cityFromAddress(match.address);
          setSelected({
            title: match.name || res.title,
            category: categoryFromTypes(match.types),
            city: c,
            country,
            address: match.address,
            coordinates: match.coordinates ?? res.coordinates,
            thumbnailUrl: match.photoName ? photoUrl(match.photoName, 1600) : res.thumbnailUrl,
            googlePlaceId: match.placeId,
          });
          setSourceUrl(res.sourceUrl);
          setPastingLink(false);
          setLinkUrl('');
          setStep('details');
          return;
        }
      }

      // Airbnb / generic: we have a title and/or photo. Stash the prefill so
      // the City + Place + Details steps can use it.
      const hasAnything = res.title || res.thumbnailUrl;
      if (hasAnything) {
        setPrefill({
          title: res.title,
          thumbnailUrl: res.thumbnailUrl,
          sourceUrl: res.sourceUrl,
          domain: res.domain,
          suggestedCategory: res.suggestedCategory,
          city: res.city,
          country: res.country,
        });

        // If the link told us a city, use it directly — add it to the user's
        // cities if it's new, then jump to the place step with the title
        // pre-filled. Saves the user from picking or typing.
        if (res.city && res.country) {
          const linkCity: PickedCity = { name: res.city, country: res.country };
          const exists = pickedCities.some(
            (p) =>
              p.name.toLowerCase() === linkCity.name.toLowerCase() &&
              p.country.toLowerCase() === linkCity.country.toLowerCase(),
          );
          if (!exists) await setPickedCities([...pickedCities, linkCity]);
          setCity(linkCity);
          if (res.title) setPlaceQuery(res.title);
          setPastingLink(false);
          setLinkUrl('');
          setStep('place');
          return;
        }

        setLinkNote(
          res.domain === 'airbnb'
            ? "Got the listing, but we couldn't read the city — pick or add one below."
            : 'Got what we could from the link. Pick or add a city below to continue.',
        );
        setPastingLink(false);
        setLinkUrl('');
        return;
      }

      setLinkNote("Couldn't read this link. You can still add it manually.");
    } finally {
      setLinkProcessing(false);
    }
  };

  const pickCity = (c: PickedCity) => {
    setCity(c);
    if (prefill?.title && !placeQuery) setPlaceQuery(prefill.title);
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
        category: prefill?.suggestedCategory ?? categoryFromTypes(d.types),
        city: city?.name ?? c,
        country: city?.country ?? country,
        address: d.address,
        coordinates: d.coordinates,
        thumbnailUrl: d.photoName
          ? photoUrl(d.photoName, 1600)
          : prefill?.thumbnailUrl,
        googlePlaceId: d.placeId,
      });
      if (prefill?.sourceUrl) setSourceUrl(prefill.sourceUrl);
      setStep('details');
    },
    [city, prefill],
  );

  const manualEntry = () => {
    setSelected({
      title: prefill?.title || placeQuery.trim() || 'Untitled',
      category: prefill?.suggestedCategory ?? 'See',
      city: city?.name ?? '',
      country: city?.country ?? '',
      thumbnailUrl: prefill?.thumbnailUrl,
    });
    if (prefill?.sourceUrl) setSourceUrl(prefill.sourceUrl);
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
        sourceUrl: (sourceUrl.trim() || prefill?.sourceUrl) || undefined,
        notes: notes.trim() || undefined,
        tags: tagsRaw
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      });
      setPrefill(null);
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
          pastingLink={pastingLink}
          onBeginPasteLink={() => {
            setPastingLink(true);
            setLinkNote(null);
          }}
          onCancelPasteLink={() => {
            setPastingLink(false);
            setLinkUrl('');
          }}
          linkUrl={linkUrl}
          onLinkUrlChange={setLinkUrl}
          linkProcessing={linkProcessing}
          linkNote={linkNote}
          onClearLinkNote={() => setLinkNote(null)}
          onSubmitLink={onPasteLink}
          prefill={prefill}
          onClearPrefill={() => {
            setPrefill(null);
            setSourceUrl('');
          }}
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
          prefillThumb={prefill?.thumbnailUrl}
          prefillTitle={prefill?.title}
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

interface CityStepProps {
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
  pastingLink: boolean;
  onBeginPasteLink: () => void;
  onCancelPasteLink: () => void;
  linkUrl: string;
  onLinkUrlChange: (v: string) => void;
  linkProcessing: boolean;
  linkNote: string | null;
  onClearLinkNote: () => void;
  onSubmitLink: () => void;
  prefill: {
    title?: string;
    thumbnailUrl?: string;
    sourceUrl?: string;
    domain?: LinkDomain;
  } | null;
  onClearPrefill: () => void;
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
  pastingLink,
  onBeginPasteLink,
  onCancelPasteLink,
  linkUrl,
  onLinkUrlChange,
  linkProcessing,
  linkNote,
  onClearLinkNote,
  onSubmitLink,
  prefill,
  onClearPrefill,
}: CityStepProps) {
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
          Pick one of yours, or paste a link below.
        </Text>
        <View style={styles.rule} />
      </View>

      {prefill && (prefill.title || prefill.thumbnailUrl) ? (
        <View style={styles.prefillCard}>
          {prefill.thumbnailUrl ? (
            <Image source={{ uri: prefill.thumbnailUrl }} style={styles.prefillThumb} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[type.labelSoft, { marginBottom: spacing.xs }]}>
              From the link · {prefill.domain ?? 'web'}
            </Text>
            {prefill.title ? (
              <Text style={type.subtitle} numberOfLines={2}>
                {prefill.title}
              </Text>
            ) : null}
            <Pressable onPress={onClearPrefill} style={{ marginTop: spacing.sm }}>
              <Text style={[type.labelSoft, { color: colors.accent }]}>Clear</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {linkNote ? (
        <Pressable onPress={onClearLinkNote} style={styles.linkNote}>
          <Text style={[type.body, { color: colors.text }]}>{linkNote}</Text>
          <Text style={[type.meta, { marginTop: spacing.xs, color: colors.accent }]}>
            Tap to dismiss
          </Text>
        </Pressable>
      ) : null}

      {pastingLink ? (
        <View style={styles.linkPanel}>
          <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Paste a link</Text>
          <TextInput
            value={linkUrl}
            onChangeText={onLinkUrlChange}
            placeholder="https://…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            autoFocus
            style={styles.input}
            onSubmitEditing={onSubmitLink}
            returnKeyType="go"
          />
          <View style={styles.linkActions}>
            <Pressable onPress={onCancelPasteLink}>
              <Text style={[type.labelSoft, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSubmitLink} disabled={linkProcessing || !linkUrl.trim()}>
              <Text
                style={[
                  type.label,
                  { color: linkProcessing || !linkUrl.trim() ? colors.textMuted : colors.accent },
                ]}
              >
                {linkProcessing ? 'Reading…' : 'Read link'}
              </Text>
            </Pressable>
          </View>
          <Text style={[type.meta, { marginTop: spacing.md }]}>
            Google Maps · Airbnb · restaurant sites · blogs. Instagram and TikTok aren't supported.
          </Text>
        </View>
      ) : (
        <Pressable onPress={onBeginPasteLink} style={styles.addCityBtn}>
          <Text style={[type.label, { color: colors.accent }]}>＋ Add from a link</Text>
        </Pressable>
      )}

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
  prefillThumb,
  prefillTitle,
}: {
  city: PickedCity | null;
  query: string;
  onQueryChange: (v: string) => void;
  predictions: AutocompletePrediction[];
  searching: boolean;
  onPick: (p: AutocompletePrediction) => void;
  onManualEntry: () => void;
  apiAvailable: boolean;
  prefillThumb?: string;
  prefillTitle?: string;
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

      {prefillTitle || prefillThumb ? (
        <View style={styles.prefillBanner}>
          {prefillThumb ? (
            <Image source={{ uri: prefillThumb }} style={styles.prefillBannerThumb} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[type.labelSoft, { marginBottom: spacing.xs }]}>From the link</Text>
            {prefillTitle ? (
              <Text style={type.body} numberOfLines={2}>
                {prefillTitle}
              </Text>
            ) : null}
            <Pressable onPress={onManualEntry} style={{ marginTop: spacing.md }}>
              <Text style={[type.label, { color: colors.accent }]}>Save as-is</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

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
  linkPanel: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  linkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  linkNote: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.background,
  },
  prefillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  prefillThumb: {
    width: 64,
    height: 64,
    backgroundColor: colors.hairline,
  },
  prefillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  prefillBannerThumb: {
    width: 72,
    height: 72,
    backgroundColor: colors.hairline,
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
