import React, { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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

export default function Feed() {
  const { places, loading, refresh } = usePlaces();
  const insets = useSafeAreaInsets();

  const data = useMemo<Array<{ place: Place; index: number }>>(
    () => places.map((place, index) => ({ place, index })),
    [places],
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.place.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        ListHeaderComponent={<Header count={places.length} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              eyebrow="Empty bucket"
              title="A quiet shelf, for now."
              body="Add the first place you've been meaning to save. Pick a city, type the name — we handle the rest."
            >
              <Button label="Add your first place" onPress={() => router.push('/add')} />
            </EmptyState>
          )
        }
        renderItem={({ item }) => (
          <PlaceCard place={item.place} layout={layoutFor(item.index)} />
        )}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.textMuted} />
        }
        showsVerticalScrollIndicator={false}
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

function Header({ count }: { count: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>My travel list — {count} {count === 1 ? 'place' : 'places'}</Text>
      <Text style={type.display}>Places, kept.</Text>
      <Text style={[type.body, styles.subtitle]}>
        A quiet shelf for everywhere you want to go next. Add a link, open in Maps when it's time.
      </Text>
      <View style={styles.rule} />
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
