import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
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
import { usePlaces } from '@/lib/store';
import { PlaceCard, layoutFor } from '@/components/PlaceCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { CityFolder, AllFolder } from '@/components/CityFolder';
import type { Place } from '@/lib/types';

// Below this count, the search input is noise — a 3-place list reads faster
// than it filters. Once the shelf grows, search earns its space.
const SEARCH_VISIBLE_AT = 6;
// Thresholds for the Shelf (city folders) view. Below either, we stay on the
// flat list — folders of three items feel empty and clutter the hierarchy.
const SHELF_MIN_CITIES = 2;
const SHELF_MIN_PLACES = 5;

type CityBucket = { name: string; country: string; places: Place[] };
type ShelfItem =
  | { kind: 'all'; total: number }
  | { kind: 'city'; bucket: CityBucket };

export default function Feed() {
  const { places, loading, refresh } = usePlaces();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = (p: Place) => {
    if (!q) return true;
    const hay = `${p.title} ${p.city} ${p.country} ${p.tags.join(' ')}`.toLowerCase();
    return hay.includes(q);
  };

  // Pinned places live in their own "Up next" section. They're pulled off the
  // main shelf so the list below stays the long-term bucket, not the planner.
  const pinned = useMemo(() => places.filter((p) => p.pinned && matches(p)), [places, q]);
  const rest = useMemo(() => places.filter((p) => !p.pinned && matches(p)), [places, q]);

  // Group the non-pinned places by city to produce the Shelf folders. Only
  // used when the Shelf threshold is met.
  const cityBuckets = useMemo<CityBucket[]>(() => {
    const map = new Map<string, CityBucket>();
    for (const p of rest) {
      const key = p.city.toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) existing.places.push(p);
      else map.set(key, { name: p.city, country: p.country, places: [p] });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rest]);

  const totalCities = new Set(places.map((p) => p.city.toLowerCase())).size;
  const shelfMode =
    totalCities >= SHELF_MIN_CITIES &&
    places.length >= SHELF_MIN_PLACES &&
    cityBuckets.length > 0;

  const searching = q.length > 0;
  const nothingMatches = searching && pinned.length === 0 && rest.length === 0;

  // ------ Flat mode (below threshold OR search collapsed to 0 folders) ------
  const flatData = useMemo<Array<{ place: Place; index: number }>>(
    () => rest.map((place, index) => ({ place, index })),
    [rest],
  );

  const header = (
    <>
      <Header
        count={places.length}
        query={query}
        onQueryChange={setQuery}
        showSearch={places.length >= SEARCH_VISIBLE_AT}
      />
      {pinned.length > 0 ? <UpNextSection pinned={pinned} /> : null}
      {pinned.length > 0 && (shelfMode ? cityBuckets.length > 0 : rest.length > 0) ? (
        <SectionDivider label={shelfMode ? 'The shelf' : 'The shelf'} />
      ) : null}
    </>
  );

  if (shelfMode) {
    const shelfData: ShelfItem[] = [
      { kind: 'all', total: places.length },
      ...cityBuckets.map((bucket): ShelfItem => ({ kind: 'city', bucket })),
    ];
    return (
      <View style={styles.wrap}>
        <FlatList
          data={shelfData}
          keyExtractor={(item) =>
            item.kind === 'all' ? 'all' : `city-${item.bucket.name}`
          }
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          ListHeaderComponent={<View style={styles.headerBleed}>{header}</View>}
          ListEmptyComponent={
            nothingMatches ? (
              <EmptyState
                eyebrow="No match"
                title={`Nothing for "${query.trim()}".`}
                body="Try a shorter word, a city, or a tag."
              />
            ) : null
          }
          renderItem={({ item }) =>
            item.kind === 'all' ? (
              <AllFolder
                count={places.length}
                onPress={() => router.push('/city/__all')}
              />
            ) : (
              <CityFolder
                name={item.bucket.name}
                country={item.bucket.country}
                places={item.bucket.places}
                onPress={() =>
                  router.push({ pathname: '/city/[name]', params: { name: item.bucket.name } })
                }
              />
            )
          }
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.accent} />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
        <Fab onPress={() => router.push('/add')} bottom={insets.bottom + 88} />
      </View>
    );
  }

  // ------ Flat mode ------
  return (
    <View style={styles.wrap}>
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.place.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? null : nothingMatches ? (
            <EmptyState
              eyebrow="No match"
              title={`Nothing for "${query.trim()}".`}
              body="Try a shorter word, a city, or a tag."
            />
          ) : places.length === 0 ? (
            <EmptyState
              eyebrow="A quiet shelf"
              title="Nothing saved — yet."
              body="Paste a link, or tap the plus below. Once you've saved a place or two, this page fills in on its own."
            >
              <Button label="Add your first place" onPress={() => router.push('/add')} />
            </EmptyState>
          ) : null
        }
        renderItem={({ item }) => (
          <PlaceCard place={item.place} layout={layoutFor(item.index)} />
        )}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
      <Fab onPress={() => router.push('/add')} bottom={insets.bottom + 88} />
    </View>
  );
}

function Header({
  count,
  query,
  onQueryChange,
  showSearch,
}: {
  count: number;
  query: string;
  onQueryChange: (v: string) => void;
  showSearch: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>
        My travel list — {count} {count === 1 ? 'place' : 'places'}
      </Text>
      <Text style={type.display}>Places, kept.</Text>
      <Text style={[type.body, styles.subtitle]}>
        A quiet shelf for everywhere you want to go next. Add a link, open in Maps when it's time.
      </Text>
      <View style={styles.rule} />
      {showSearch ? (
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search titles, cities, tags…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      ) : null}
    </View>
  );
}

function UpNextSection({ pinned }: { pinned: Place[] }) {
  return (
    <View style={styles.upNext}>
      <View style={styles.upNextLabel}>
        <Text style={[type.labelSoft, { color: colors.accent }]}>
          Up next — {pinned.length} {pinned.length === 1 ? 'place' : 'places'}
        </Text>
      </View>
      {pinned.map((place, i) => (
        <PlaceCard
          key={place.id}
          place={place}
          layout={i % 2 === 0 ? 'left' : 'right'}
        />
      ))}
    </View>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.sectionLine} />
      <Text style={[type.labelSoft, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function Fab({ onPress, bottom }: { onPress: () => void; bottom: number }) {
  return (
    <Pressable
      accessibilityLabel="Add a place"
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.fabText}>＋</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  // In Shelf mode the grid needs horizontal padding on the list itself, so the
  // header bleed-undoes that padding to keep the hero type full-width.
  headerBleed: {
    marginHorizontal: -spacing.xl,
  },
  subtitle: {
    marginTop: spacing.md,
    maxWidth: 420,
  },
  rule: {
    height: 1,
    backgroundColor: colors.text,
    width: 36,
    marginTop: spacing.xxl,
  },
  search: {
    marginTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.text,
  },
  upNext: {
    paddingTop: spacing.lg,
  },
  upNextLabel: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline,
  },
  gridRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: colors.background,
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 30,
    marginTop: -2,
  },
});
