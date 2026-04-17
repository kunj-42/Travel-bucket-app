import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { usePlaces } from '@/lib/store';

export default function Suggestions() {
  const { pickedCities } = usePlaces();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>For you</Text>
        <Text style={type.display}>In the margins{'\n'}of your list.</Text>
        <Text style={[type.body, styles.subtitle]}>
          Soon, places pulled from the cities you've dreamt of and the ones you've already saved. A
          small, well-read friend with a pen in hand.
        </Text>
        <View style={styles.rule} />
      </View>

      <View style={styles.block}>
        <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Coming soon</Text>
        <Text style={[type.body, { fontSize: 16, lineHeight: 26, color: colors.text }]}>
          The suggestions engine will read your saved list and surface new places nearby — in the
          same cities, the same mood, the same quiet corners. Until then, keep adding.
        </Text>
      </View>

      {pickedCities.length > 0 ? (
        <View style={styles.block}>
          <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Your dream cities</Text>
          <Text style={type.body}>
            {pickedCities.map((c) => c.name).join(' · ')}
          </Text>
        </View>
      ) : null}
    </ScrollView>
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
  block: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
});
