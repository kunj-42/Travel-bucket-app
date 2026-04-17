import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts, type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { CategoryLabel } from '@/components/CategoryLabel';
import { Divider } from '@/components/Divider';
import { Button } from '@/components/Button';
import { usePlaces } from '@/lib/store';
import { getPlace } from '@/lib/places';
import { CANDIDATE_PLACES } from '@/lib/seed';
import { openInMaps, openUrl } from '@/lib/maps';
import type { Place } from '@/lib/types';

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { places, remove } = usePlaces();
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState<Place | undefined>(() =>
    places.find((p) => p.id === id) ?? CANDIDATE_PLACES.find((p) => p.id === id),
  );

  useEffect(() => {
    let live = true;
    if (!place && id) {
      (async () => {
        const found = await getPlace(id);
        if (live) setPlace(found ?? CANDIDATE_PLACES.find((p) => p.id === id));
      })();
    }
    return () => {
      live = false;
    };
  }, [id, place]);

  if (!place) {
    return (
      <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl }]}>
        <View style={styles.topbar}>
          <BackButton />
        </View>
        <View style={{ padding: spacing.xl }}>
          <Text style={type.title}>Not found.</Text>
          <Text style={[type.body, { marginTop: spacing.md }]}>
            This place has been removed, or never existed.
          </Text>
        </View>
      </View>
    );
  }

  const onDelete = () => {
    Alert.alert('Remove from bucket?', 'You can always add it again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await remove(place.id);
          router.back();
        },
      },
    ]);
  };

  const inBucket = places.some((p) => p.id === place.id);

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroWrap}>
        {place.thumbnailUrl ? (
          <Image source={{ uri: place.thumbnailUrl }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]} />
        )}
        <View style={[styles.topbar, { top: insets.top + spacing.sm }]}>
          <BackButton />
        </View>
      </View>

      <View style={styles.meta}>
        <CategoryLabel category={place.category} />
        <Text style={[type.display, styles.title]}>{place.title}</Text>
        <Text style={type.body}>
          {place.city} · {place.country}
        </Text>
      </View>

      <Divider style={{ marginHorizontal: spacing.xl, marginVertical: spacing.xl }} />

      {place.notes ? (
        <View style={styles.section}>
          <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Notes</Text>
          <Text style={[type.body, { fontSize: 16, lineHeight: 26, color: colors.text }]}>
            {place.notes}
          </Text>
        </View>
      ) : null}

      {place.tags.length > 0 ? (
        <View style={styles.section}>
          <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Tags</Text>
          <Text style={type.body}>{place.tags.map((t) => `#${t}`).join('   ')}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Button label="Open in Google Maps" onPress={() => openInMaps(place)} />
      </View>

      {place.sourceUrl ? (
        <View style={[styles.section, { paddingTop: 0 }]}>
          <Pressable onPress={() => openUrl(place.sourceUrl!)}>
            <Text style={[type.labelSoft, { marginBottom: spacing.xs }]}>Source</Text>
            <Text style={styles.sourceLink} numberOfLines={1}>
              {place.sourceUrl.replace(/^https?:\/\//, '')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {inBucket ? (
        <View style={[styles.section, { paddingTop: spacing.xxl }]}>
          <Pressable onPress={onDelete}>
            <Text style={styles.delete}>Remove from bucket</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.section, { paddingTop: spacing.xxl }]}>
          <Text style={[type.meta, { fontStyle: 'italic' }]}>
            A suggestion — not yet in your bucket.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backBtn}>
      <Text style={styles.backText}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  topbar: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xl,
  },
  backBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.text,
  },
  backText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.text,
  },
  heroWrap: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  hero: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface,
  },
  heroPlaceholder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  meta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    marginTop: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  sourceLink: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  delete: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.accent,
  },
});
