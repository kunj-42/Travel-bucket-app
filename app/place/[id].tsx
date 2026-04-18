import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts, type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { CategoryLabel } from '@/components/CategoryLabel';
import { Divider } from '@/components/Divider';
import { Button } from '@/components/Button';
import { VisitedStamp } from '@/components/VisitedStamp';
import { usePlaces } from '@/lib/store';
import { getPlace } from '@/lib/places';
import { openInMaps, openUrl } from '@/lib/maps';
import type { Place } from '@/lib/types';

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { places, remove, markVisited, updateVisitNote } = usePlaces();
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState<Place | undefined>(() =>
    places.find((p) => p.id === id),
  );
  // Local draft of the visit note — flushed to storage on blur so the user
  // isn't interrupted by a save button while typing.
  const [tipDraft, setTipDraft] = useState('');

  useEffect(() => {
    let alive = true;
    if (!place && id) {
      (async () => {
        const found = await getPlace(id);
        if (alive) setPlace(found);
      })();
    }
    return () => {
      alive = false;
    };
  }, [id, place]);

  // Always prefer the latest copy from the store, so the stamp + note flip
  // the moment the user taps the toggle.
  const current = places.find((p) => p.id === id) ?? place;

  // Keep the local draft in sync with the stored note as the place updates.
  useEffect(() => {
    setTipDraft(current?.visitNote ?? '');
  }, [current?.id, current?.visitNote]);

  if (!current) {
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
          await remove(current.id);
          router.back();
        },
      },
    ]);
  };

  const toggleVisited = async () => {
    await markVisited(current.id, !current.visited, current.visitNote);
  };

  const saveTipIfChanged = async () => {
    if (!current.visited) return;
    if ((current.visitNote ?? '') === tipDraft) return;
    await updateVisitNote(current.id, tipDraft);
  };

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroWrap}>
        {current.thumbnailUrl ? (
          <Image source={{ uri: current.thumbnailUrl }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]} />
        )}
        {current.visited ? <VisitedStamp style={styles.stamp} /> : null}
        <View style={[styles.topbar, { top: insets.top + spacing.sm }]}>
          <BackButton />
        </View>
      </View>

      <View style={styles.meta}>
        <CategoryLabel category={current.category} />
        <Text style={[type.display, styles.title]}>{current.title}</Text>
        <Text style={type.body}>
          {current.city} · {current.country}
        </Text>
      </View>

      <Divider style={{ marginHorizontal: spacing.xl, marginVertical: spacing.xl }} />

      <View style={styles.section}>
        {current.visited ? (
          <>
            <Text style={[type.labelSoft, { marginBottom: spacing.sm }]}>
              Visited{current.visitedAt ? ` · ${formatVisitedDate(current.visitedAt)}` : ''}
            </Text>
            <Text style={[type.subtitle, { marginBottom: spacing.md }]}>
              A tip for a fellow traveller.
            </Text>
            <TextInput
              value={tipDraft}
              onChangeText={setTipDraft}
              onBlur={saveTipIfChanged}
              placeholder="Share what made it worth the trip — where to sit, what to order, when to go."
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.tipInput}
            />
            <Pressable onPress={toggleVisited} hitSlop={8} style={{ marginTop: spacing.md }}>
              <Text style={styles.unmark}>Unmark as visited</Text>
            </Pressable>
          </>
        ) : (
          <Button label="Mark as visited" onPress={toggleVisited} variant="outline" />
        )}
      </View>

      {current.notes ? (
        <View style={styles.section}>
          <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Notes</Text>
          <Text style={[type.body, { fontSize: 16, lineHeight: 26, color: colors.text }]}>
            {current.notes}
          </Text>
        </View>
      ) : null}

      {current.tags.length > 0 ? (
        <View style={styles.section}>
          <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Tags</Text>
          <Text style={type.body}>{current.tags.map((t) => `#${t}`).join('   ')}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Button label="Open in Google Maps" onPress={() => openInMaps(current)} />
      </View>

      {current.sourceUrl ? (
        <View style={[styles.section, { paddingTop: 0 }]}>
          <Pressable onPress={() => openUrl(current.sourceUrl!)}>
            <Text style={[type.labelSoft, { marginBottom: spacing.xs }]}>Source</Text>
            <Text style={styles.sourceLink} numberOfLines={1}>
              {current.sourceUrl.replace(/^https?:\/\//, '')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.section, { paddingTop: spacing.xxl }]}>
        <Pressable onPress={onDelete}>
          <Text style={styles.delete}>Remove from bucket</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function formatVisitedDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
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
  stamp: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
  },
  tipInput: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    minHeight: 96,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
  unmark: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
});
