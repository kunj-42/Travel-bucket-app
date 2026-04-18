import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import type { Place } from '@/lib/types';
import { CategoryLabel } from './CategoryLabel';
import { PlaceImage } from './PlaceImage';
import { VisitedStamp } from './VisitedStamp';

type Layout = 'hero' | 'left' | 'right';

interface Props {
  place: Place;
  layout: Layout;
  onPress?: () => void;
}

export function PlaceCard({ place, layout, onPress }: Props) {
  const handle = onPress ?? (() => router.push(`/place/${place.id}`));

  if (layout === 'hero') {
    return (
      <Pressable onPress={handle} style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
        <View>
          <PlaceImage uri={place.thumbnailUrl} category={place.category} aspectRatio={4 / 5} />
          {place.visited ? <VisitedStamp style={styles.stampHero} /> : null}
        </View>
        <View style={styles.heroMeta}>
          <CategoryLabel category={place.category} style={styles.heroCategory} />
          <Text style={[type.title, styles.heroTitle]} numberOfLines={2}>
            {place.title}
          </Text>
          <Text style={type.meta}>
            {place.city} · {place.country}
          </Text>
        </View>
      </Pressable>
    );
  }

  const reverse = layout === 'right';
  return (
    <Pressable
      onPress={handle}
      style={({ pressed }) => [
        styles.row,
        reverse && styles.rowReverse,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.imageCol}>
        <PlaceImage uri={place.thumbnailUrl} category={place.category} aspectRatio={3 / 4} />
        {place.visited ? <VisitedStamp size="sm" style={styles.stampRow} /> : null}
      </View>
      <View style={[styles.textCol, reverse ? styles.textColRight : styles.textColLeft]}>
        <CategoryLabel category={place.category} />
        <Text style={[type.subtitle, styles.rowTitle]} numberOfLines={3}>
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
  pressed: { opacity: 0.9 },
  hero: {
    paddingHorizontal: 0,
    marginBottom: spacing.xxxl,
  },
  heroMeta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  heroCategory: {
    marginBottom: spacing.md,
  },
  heroTitle: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
    alignItems: 'flex-start',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  imageCol: {
    flex: 5,
  },
  textCol: {
    flex: 4,
    paddingTop: spacing.sm,
  },
  textColLeft: {
    paddingLeft: spacing.lg,
  },
  textColRight: {
    paddingRight: spacing.lg,
  },
  rowTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  stampHero: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
  },
  stampRow: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
});

export function layoutFor(index: number): Layout {
  const mod = index % 5;
  if (mod === 0) return 'hero';
  if (mod === 1) return 'left';
  if (mod === 2) return 'right';
  if (mod === 3) return 'left';
  return 'right';
}
