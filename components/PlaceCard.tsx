import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import type { Place } from '@/lib/types';
import { usePlaces } from '@/lib/store';
import { openInMaps } from '@/lib/maps';
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
  const { remove, markVisited, togglePin } = usePlaces();

  // Long-press opens a native action sheet with the four most-used quick
  // actions. Avoids a trip into the detail screen for common tasks.
  const handleLongPress = () => {
    const actions: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [
      {
        text: place.visited ? 'Unmark as visited' : 'Mark as visited',
        onPress: () => void markVisited(place.id, !place.visited, place.visitNote),
      },
      {
        text: place.pinned ? 'Release pin' : 'Pin to Up next',
        onPress: async () => {
          const res = await togglePin(place.id);
          if (!res.ok && res.reason === 'max-pins-reached') {
            Alert.alert(
              'Up next is full',
              'You already have 10 places pinned. Release one first.',
            );
          }
        },
      },
      { text: 'Open in Google Maps', onPress: () => openInMaps(place) },
      {
        text: 'Remove from bucket',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Remove from bucket?', 'You can always add it again later.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => void remove(place.id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ];
    Alert.alert(place.title, undefined, actions);
  };

  if (layout === 'hero') {
    return (
      <Pressable
        onPress={handle}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
      >
        <View>
          <PlaceImage uri={place.thumbnailUrl} category={place.category} aspectRatio={4 / 5} />
          {place.pinned ? <PinDot style={styles.pinHero} /> : null}
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
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.row,
        reverse && styles.rowReverse,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.imageCol}>
        <PlaceImage uri={place.thumbnailUrl} category={place.category} aspectRatio={3 / 4} />
        {place.pinned ? <PinDot style={styles.pinRow} /> : null}
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

// A small terracotta dot marking an "Up next" pin. Deliberately quiet — reads
// as an unread indicator on the corner of the photo, not decoration.
function PinDot({ style }: { style?: object }) {
  return <View style={[styles.pin, style]} />;
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
  pin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  pinHero: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
  },
  pinRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
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
