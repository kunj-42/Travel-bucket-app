import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Divider } from '@/components/Divider';
import { Button } from '@/components/Button';
import { usePlaces } from '@/lib/store';

export default function Settings() {
  const { places, pickedCities, importedPins, reset } = usePlaces();
  const insets = useSafeAreaInsets();

  const onReset = () => {
    Alert.alert(
      'Start over?',
      'This wipes your saved places and dream cities. You\'ll go back through onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => reset() },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Account</Text>
        <Text style={type.display}>The desk.</Text>
        <Text style={[type.body, styles.subtitle]}>
          A quiet place for the things that don't fit anywhere else.
        </Text>
        <View style={styles.rule} />
      </View>

      <Row label="Places saved" value={`${places.length}`} />
      <Divider style={{ marginHorizontal: spacing.xl }} />
      <Row label="Dream cities" value={`${pickedCities.length}`} />
      <Divider style={{ marginHorizontal: spacing.xl }} />
      <Row label="Storage" value="On device" />
      <Divider style={{ marginHorizontal: spacing.xl }} />
      <Row label="Bucket" value="Personal" />
      <Divider style={{ marginHorizontal: spacing.xl }} />

      <Pressable onPress={() => router.push('/imported')} style={styles.action}>
        <View style={{ flex: 1 }}>
          <Text style={type.subtitle}>Import from Google Maps</Text>
          <Text style={[type.meta, { marginTop: spacing.xs }]}>
            {importedPins.length > 0
              ? `${importedPins.length} pins on your shortlist`
              : 'Bring your saved pins in as a shortlist.'}
          </Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Coming later</Text>
        <Text style={type.body}>
          Shared buckets with friends. Real-time sync across devices. A trip planner that pulls from
          the shelf. For now, everything lives quietly on this phone.
        </Text>
      </View>

      <View style={styles.section}>
        <Button label="Start over" variant="outline" onPress={onReset} />
      </View>

      <View style={[styles.section, { alignItems: 'center' }]}>
        <Text style={type.meta}>Bucket — v0.1</Text>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={type.labelSoft}>{label}</Text>
      <Text style={type.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  arrow: {
    fontSize: 18,
    color: colors.textMuted,
    paddingLeft: spacing.md,
  },
});
