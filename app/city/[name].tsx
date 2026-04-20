import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts, type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { PlaceCard } from '@/components/PlaceCard';
import { EmptyState } from '@/components/EmptyState';
import { usePlaces } from '@/lib/store';

/**
 * Filtered view of one city's places. Opened by tapping a CityFolder on the
 * Shelf. Uses PlaceCard's `compact` layout for a dense list — ~100px per row,
 * four or five places visible per screen.
 */
export default function CityView() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const { places } = usePlaces();

  const cityName = typeof name === 'string' ? name : '';
  // Special pseudonym: `/city/__all` shows every place regardless of city.
  // Tapped from the "All" folder on the Shelf.
  const isAll = cityName === '__all';
  const displayName = isAll ? 'Everything' : cityName;
  const items = useMemo(
    () =>
      (isAll
        ? places
        : places.filter((p) => p.city.toLowerCase() === cityName.toLowerCase())
      ).sort((a, b) => b.createdAt - a.createdAt),
    [places, cityName, isAll],
  );
  const country = isAll ? undefined : items[0]?.country;
  const visited = items.filter((p) => p.visited).length;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View>
            <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.back}>← The shelf</Text>
              </Pressable>
            </View>
            <View style={styles.header}>
              <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>
                {items.length} {items.length === 1 ? 'place' : 'places'}
                {visited > 0 ? `  ·  ${visited} visited` : ''}
              </Text>
              <Text style={type.display}>{displayName}</Text>
              {country ? (
                <Text style={[type.body, styles.country]}>{country}</Text>
              ) : null}
              <View style={styles.rule} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            eyebrow="Empty folder"
            title={`Nothing saved in ${cityName || 'this city'} yet.`}
            body="Add a place from the plus below, or paste a link."
          />
        }
        renderItem={({ item }) => <PlaceCard place={item} layout="compact" />}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  topbar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  back: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  country: {
    marginTop: spacing.sm,
  },
  rule: {
    height: 1,
    backgroundColor: colors.text,
    width: 36,
    marginTop: spacing.xxl,
  },
});
