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
import type { Place } from '@/lib/types';

// Below this count, the search input is noise — a 3-place list reads faster
// than it filters. Once the shelf grows, search earns its space.
const SEARCH_VISIBLE_AT = 6;

export default function Feed() {
  const { places, loading, refresh } = usePlaces();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter((p) => {
      const hay = `${p.title} ${p.city} ${p.country} ${p.tags.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [places, query]);

  const data = useMemo<Array<{ place: Place; index: number }>>(
    () => filtered.map((place, index) => ({ place, index })),
    [filtered],
  );

  const searching = query.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.place.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        ListHeaderComponent={
          <Header
            count={places.length}
            query={query}
            onQueryChange={setQuery}
            showSearch={places.length >= SEARCH_VISIBLE_AT}
          />
        }
        ListEmptyComponent={
          loading ? null : searching ? (
            <EmptyState
              eyebrow="No match"
              title={`Nothing for "${query.trim()}".`}
              body="Try a shorter word, a city, or a tag."
            />
          ) : (
            <EmptyState
              eyebrow="A quiet shelf"
              title="Nothing saved — yet."
              body="Paste a link, or tap the plus below. Once you've saved a place or two, this page fills in on its own."
            >
              <Button label="Add your first place" onPress={() => router.push('/add')} />
            </EmptyState>
          )
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
      <Pressable
        accessibilityLabel="Add a place"
        onPress={() => router.push('/add')}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 88 },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
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
