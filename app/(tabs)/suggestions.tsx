import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { usePlaces } from '@/lib/store';
import { PlaceImage } from '@/components/PlaceImage';
import { CategoryLabel } from '@/components/CategoryLabel';
import { Divider } from '@/components/Divider';
import { EmptyState } from '@/components/EmptyState';
import { describeReason, suggestPlaces, type Suggestion } from '@/lib/suggestions';

export default function Suggestions() {
  const { places } = usePlaces();
  const insets = useSafeAreaInsets();
  const suggestions = useMemo(() => suggestPlaces(places, 12), [places]);

  return (
    <View style={styles.wrap}>
      <FlatList
        data={suggestions}
        keyExtractor={(s) => s.place.id}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
            <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>For you</Text>
            <Text style={type.display}>In the margins{'\n'}of your list.</Text>
            <Text style={[type.body, styles.subtitle]}>
              Drawn from the cities, categories and tags you already save. Think of it as a well-read
              friend with a pen in hand.
            </Text>
            <View style={styles.rule} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            eyebrow="Nothing yet"
            title="Suggestions arrive once the shelf has a few books."
            body="Save three or four places and this page will start to feel like someone who knows your taste."
          />
        }
        renderItem={({ item }) => <SuggestionRow suggestion={item} />}
        ItemSeparatorComponent={() => <Divider style={{ marginHorizontal: spacing.xl }} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const { place, reason } = suggestion;
  const reasonText = describeReason(reason);
  return (
    <Pressable
      onPress={() => router.push(`/place/${place.id}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.image}>
        <PlaceImage uri={place.thumbnailUrl} category={place.category} aspectRatio={1} />
      </View>
      <View style={styles.body}>
        <CategoryLabel category={place.category} muted />
        <Text style={[type.subtitle, styles.title]} numberOfLines={2}>
          {place.title}
        </Text>
        <Text style={type.meta} numberOfLines={1}>
          {place.city} · {place.country}
        </Text>
        {reasonText ? (
          <Text style={[type.meta, styles.reason]} numberOfLines={2}>
            {reasonText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
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
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  image: {
    width: 110,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.xs,
  },
  reason: {
    marginTop: spacing.sm,
    fontStyle: 'italic',
    color: colors.accent,
  },
});
