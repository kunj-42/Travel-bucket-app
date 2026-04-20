import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import type { Place } from '@/lib/types';
import { PlaceImage } from './PlaceImage';

interface Props {
  name: string;
  country?: string;
  places: Place[];
  onPress: () => void;
}

/**
 * A single magazine-cover folder in the Shelf grid. Quiet, hairline-bordered,
 * 4:3 landscape thumbnail derived from the most-recent photo-having place in
 * that city. Count of places below, with a small "visited" tally once the
 * user's actually been to a few.
 */
export function CityFolder({ name, country, places, onPress }: Props) {
  const cover = places.find((p) => p.thumbnailUrl);
  const visited = places.filter((p) => p.visited).length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.image}>
        <PlaceImage
          uri={cover?.thumbnailUrl}
          category={cover?.category ?? 'See'}
          aspectRatio={4 / 3}
        />
      </View>
      <View style={styles.meta}>
        <Text style={type.title} numberOfLines={1}>
          {name}
        </Text>
        <Text style={type.meta} numberOfLines={1}>
          {places.length} {places.length === 1 ? 'place' : 'places'}
          {visited > 0 ? `  ·  ${visited} visited` : ''}
        </Text>
        {country ? (
          <Text style={[type.labelSoft, styles.country]} numberOfLines={1}>
            {country}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * The pinned "All" folder — no image, serif "All" big, routes back to the
 * flat list. Same shape as CityFolder so the grid stays regular.
 */
export function AllFolder({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.image, styles.allImage]}>
        <Text style={[type.display, styles.allTitle]}>All</Text>
      </View>
      <View style={styles.meta}>
        <Text style={type.title} numberOfLines={1}>
          Everything
        </Text>
        <Text style={type.meta}>
          {count} {count === 1 ? 'place' : 'places'} in one list
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
  image: {
    width: '100%',
    overflow: 'hidden',
  },
  meta: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  country: {
    marginTop: spacing.xs,
  },
  allImage: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allTitle: {
    fontSize: 48,
    lineHeight: 52,
  },
});
