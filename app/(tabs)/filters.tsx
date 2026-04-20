import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { fonts, type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Chip } from '@/components/Chip';
import { Divider } from '@/components/Divider';
import { CategoryLabel } from '@/components/CategoryLabel';
import { PlaceImage } from '@/components/PlaceImage';
import { EmptyState } from '@/components/EmptyState';
import { usePlaces } from '@/lib/store';
import { CATEGORIES, type Category, type Place } from '@/lib/types';

export default function Filters() {
  const { places, cities, tags } = usePlaces();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (city && p.city !== city) return false;
      if (category && p.category !== category) return false;
      if (activeTags.size) {
        const has = [...activeTags].every((t) => p.tags.includes(t));
        if (!has) return false;
      }
      if (q) {
        const hay = `${p.title} ${p.city} ${p.country} ${p.tags.join(' ')} ${p.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [places, query, city, category, activeTags]);

  const toggleTag = (t: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const clear = () => {
    setQuery('');
    setCity(null);
    setCategory(null);
    setActiveTags(new Set());
  };

  const hasFilter = query || city || category || activeTags.size > 0;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top }}>
            <View style={styles.header}>
              <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Filter & search</Text>
              <Text style={type.display}>Find what{'\n'}you saved.</Text>
            </View>

            <View style={styles.section}>
              <TextInput
                placeholder="Search titles, tags, notes…"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                style={styles.search}
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>

            <Section label="Category">
              <View style={styles.chipRow}>
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={category === c}
                    onPress={() => setCategory(category === c ? null : c)}
                  />
                ))}
              </View>
            </Section>

            {cities.length > 0 && (
              <Section label="City">
                <View style={styles.chipRow}>
                  {cities.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      selected={city === c}
                      onPress={() => setCity(city === c ? null : c)}
                    />
                  ))}
                </View>
              </Section>
            )}

            {tags.length > 0 && (
              <Section label="Tags">
                <View style={styles.chipRow}>
                  {tags.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      selected={activeTags.has(t)}
                      onPress={() => toggleTag(t)}
                    />
                  ))}
                </View>
              </Section>
            )}

            <View style={styles.resultHeader}>
              <Text style={type.labelSoft}>
                {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </Text>
              {hasFilter ? (
                <Pressable onPress={clear}>
                  <Text style={styles.clear}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            eyebrow="No match"
            title="Nothing fits this shape."
            body="Try loosening a chip, or search for a word from the title or tags."
          />
        }
        renderItem={({ item }) => <ResultRow place={item} />}
        ItemSeparatorComponent={() => <Divider style={{ marginHorizontal: spacing.xl }} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>{label}</Text>
      {children}
    </View>
  );
}

function ResultRow({ place }: { place: Place }) {
  return (
    <Pressable
      onPress={() => router.push(`/place/${place.id}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.rowImage}>
        <PlaceImage uri={place.thumbnailUrl} category={place.category} aspectRatio={1} />
      </View>
      <View style={styles.rowBody}>
        <CategoryLabel category={place.category} muted />
        <Text style={[type.subtitle, styles.rowTitle]} numberOfLines={2}>
          {place.title}
        </Text>
        <Text style={type.meta} numberOfLines={1}>
          {place.city} · {place.country}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  search: {
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultHeader: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.text,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clear: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  rowImage: { width: 88 },
  rowBody: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  rowTitle: { marginTop: spacing.xs },
});
