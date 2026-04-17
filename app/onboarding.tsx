import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { CITY_SUGGESTIONS } from '@/lib/seed';
import { usePlaces } from '@/lib/store';
import { autocompleteCities, getPlaceDetails, hasApiKey } from '@/lib/placesApi';
import type { PickedCity } from '@/lib/types';

const MIN_PICKS = 3;

export default function Onboarding() {
  const { finishOnboarding } = usePlaces();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<PickedCity[]>([]);
  const [query, setQuery] = useState('');
  const [searchHits, setSearchHits] = useState<PickedCity[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchSeq = useRef(0);

  const isPicked = useCallback(
    (c: PickedCity) => picked.some((p) => keyOf(p) === keyOf(c)),
    [picked],
  );

  const toggle = (c: PickedCity) => {
    setPicked((prev) =>
      prev.some((p) => keyOf(p) === keyOf(c))
        ? prev.filter((p) => keyOf(p) !== keyOf(c))
        : [...prev, c],
    );
  };

  const onContinue = async () => {
    if (picked.length < MIN_PICKS || saving) return;
    setSaving(true);
    await finishOnboarding(picked);
    router.replace('/(tabs)');
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !hasApiKey()) {
      setSearchHits([]);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const id = setTimeout(async () => {
      const hits = await autocompleteCities(q);
      if (seq !== searchSeq.current) return;
      const mapped: PickedCity[] = [];
      for (const h of hits.slice(0, 6)) {
        const details = await getPlaceDetails(h.placeId);
        if (seq !== searchSeq.current) return;
        if (!details) continue;
        mapped.push({
          name: h.name,
          country: h.country.split(',').pop()?.trim() ?? h.country,
          coordinates: details.coordinates,
        });
      }
      if (seq === searchSeq.current) {
        setSearchHits(mapped);
        setSearching(false);
      }
    }, 320);
    return () => clearTimeout(id);
  }, [query]);

  const rows = useMemo(() => {
    if (query.trim().length >= 2) return searchHits;
    return CITY_SUGGESTIONS;
  }, [query, searchHits]);

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.select({ ios: 'padding', default: undefined })}
    >
      <FlatList
        data={rows}
        keyExtractor={keyOf}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: insets.bottom + 180,
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Begin</Text>
              <Text style={type.display}>Which cities{'\n'}do you dream of?</Text>
              <Text style={[type.body, styles.subtitle]}>
                Pick at least three. This is how the shelf knows where your head is. You can always
                add more later.
              </Text>
              <View style={styles.rule} />
            </View>

            <View style={styles.searchWrap}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search any city…"
                placeholderTextColor={colors.textMuted}
                style={styles.search}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {searching ? (
                <ActivityIndicator style={styles.searchSpinner} color={colors.textMuted} />
              ) : null}
            </View>

            <Text style={[type.labelSoft, styles.sectionLabel]}>
              {query.trim().length >= 2 ? 'Search' : 'Start here'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          !searching && query.trim().length >= 2 ? (
            <Text style={[type.body, styles.empty]}>No matches. Try a different spelling.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <CityRow city={item} selected={isPicked(item)} onPress={() => toggle(item)} />
        )}
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.lg, paddingTop: spacing.lg },
        ]}
      >
        <Text style={[type.meta, styles.footerMeta]}>
          {picked.length < MIN_PICKS
            ? `${picked.length} of ${MIN_PICKS} picked`
            : `${picked.length} cities chosen`}
        </Text>
        <Button
          label={saving ? 'Saving…' : 'Continue'}
          onPress={onContinue}
          loading={saving}
          disabled={picked.length < MIN_PICKS}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function CityRow({
  city,
  selected,
  onPress,
}: {
  city: PickedCity;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.checkbox, selected && styles.checkboxOn]}>
        {selected ? <View style={styles.checkDot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.subtitle}>{city.name}</Text>
        <Text style={type.meta}>{city.country}</Text>
      </View>
    </Pressable>
  );
}

function keyOf(c: PickedCity): string {
  return `${c.name}|${c.country}`;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  subtitle: { marginTop: spacing.md, maxWidth: 440 },
  rule: {
    height: 1,
    backgroundColor: colors.text,
    width: 36,
    marginTop: spacing.xxl,
  },
  searchWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  search: {
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.text,
  },
  searchSpinner: {
    position: 'absolute',
    right: spacing.xl + 4,
    top: spacing.md + 2,
  },
  sectionLabel: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  empty: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.text,
  },
  checkDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.background,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    gap: spacing.md,
  },
  footerMeta: { textAlign: 'center' },
});
