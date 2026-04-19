import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { colors } from '@/theme/colors';
import { fonts, type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Button } from '@/components/Button';
import { Divider } from '@/components/Divider';
import { usePlaces } from '@/lib/store';
import { parseTakeout } from '@/lib/takeout';
import type { ImportedPin } from '@/lib/types';

export default function ImportedScreen() {
  const insets = useSafeAreaInsets();
  const { importedPins, importPins, removeImportedPin, markPinPromoted, clearImported } =
    usePlaces();
  const [reading, setReading] = useState(false);

  const onPickFile = async () => {
    if (reading) return;
    setReading(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/geo+json', 'text/csv', '*/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const raw = await FileSystem.readAsStringAsync(asset.uri);
      const parsed = parseTakeout(raw, asset.name ?? 'takeout');
      if (parsed.length === 0) {
        Alert.alert(
          "Couldn't read that file",
          'It doesn\'t look like a Google Takeout Maps export. Try a .json, .geojson, or .csv from takeout.google.com.',
        );
        return;
      }
      const added = await importPins(parsed);
      Alert.alert(
        'Import complete',
        added === 0
          ? "All of those pins were already imported — nothing new to add."
          : `Added ${added} ${added === 1 ? 'pin' : 'pins'} from ${asset.name ?? 'the file'}.`,
      );
    } catch (e) {
      Alert.alert('Could not read file', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setReading(false);
    }
  };

  const onPromote = (pin: ImportedPin) => {
    // Route to the add flow with the pin's data pre-filled. The add screen
    // reads these params on mount and seeds its state. The pin is marked as
    // promoted so the row dims, but stays in the imported list as a record.
    markPinPromoted(pin.id);
    router.push({
      pathname: '/add',
      params: {
        fromImport: '1',
        title: pin.title,
        city: pin.city ?? '',
        country: pin.country ?? '',
        lat: pin.coordinates ? String(pin.coordinates.latitude) : '',
        lng: pin.coordinates ? String(pin.coordinates.longitude) : '',
        sourceUrl: pin.mapsUrl ?? '',
      },
    });
  };

  const onRemove = (pin: ImportedPin) => {
    Alert.alert('Remove this pin?', `"${pin.title}" will disappear from your import list.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeImportedPin(pin.id) },
    ]);
  };

  const onClearAll = () => {
    Alert.alert(
      'Clear all imported pins?',
      'This removes everything from your import list. Places already added to your bucket stay put.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all', style: 'destructive', onPress: () => clearImported() },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        {importedPins.length > 0 ? (
          <Pressable onPress={onClearAll}>
            <Text style={[styles.back, { color: colors.accent }]}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.header}>
        <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Import</Text>
        <Text style={type.display}>From Google Maps.</Text>
        <Text style={[type.body, styles.subtitle]}>
          Your Google Maps pins — Saved, Favorites, Want to go, and custom lists —
          land here as a shortlist. Tap any pin to turn it into a bucket entry.
        </Text>
        <View style={styles.rule} />
      </View>

      <View style={styles.howto}>
        <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>How to export</Text>
        <Text style={[type.body, { color: colors.text }]}>
          1. Open <Text style={styles.em}>takeout.google.com</Text> on any device.{'\n'}
          2. Deselect all, pick <Text style={styles.em}>Maps (your places)</Text>.{'\n'}
          3. Export, download the zip, open it, find the list files inside{' '}
          <Text style={styles.em}>Saved</Text>.{'\n'}
          4. Tap Choose file below, pick one list at a time.
        </Text>
      </View>

      <View style={styles.section}>
        <Button
          label={reading ? 'Reading…' : 'Choose file'}
          onPress={onPickFile}
          loading={reading}
        />
      </View>

      {importedPins.length > 0 ? (
        <>
          <Divider style={{ marginHorizontal: spacing.xl, marginVertical: spacing.xxl }} />
          <View style={styles.section}>
            <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>
              Shortlist · {importedPins.length}
            </Text>
          </View>
          {importedPins.map((pin) => (
            <PinRow
              key={pin.id}
              pin={pin}
              onPromote={() => onPromote(pin)}
              onRemove={() => onRemove(pin)}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function PinRow({
  pin,
  onPromote,
  onRemove,
}: {
  pin: ImportedPin;
  onPromote: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.pinRow, pin.promoted && styles.pinRowPromoted]}>
      <View style={{ flex: 1 }}>
        <Text style={type.subtitle} numberOfLines={2}>
          {pin.title}
        </Text>
        {pin.city || pin.country ? (
          <Text style={[type.meta, { marginTop: spacing.xs }]} numberOfLines={1}>
            {[pin.city, pin.country].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {pin.note ? (
          <Text style={[type.meta, { marginTop: spacing.sm, fontStyle: 'italic' }]}>
            {pin.note}
          </Text>
        ) : null}
        {pin.sourceList ? (
          <Text style={[type.meta, { marginTop: spacing.sm }]} numberOfLines={1}>
            From: {pin.sourceList}
          </Text>
        ) : null}
      </View>
      <View style={styles.pinActions}>
        {pin.promoted ? (
          <Text style={[type.labelSoft, { color: colors.textMuted }]}>Added</Text>
        ) : (
          <Pressable onPress={onPromote} hitSlop={8}>
            <Text style={[type.label, { color: colors.accent }]}>Add</Text>
          </Pressable>
        )}
        <Pressable onPress={onRemove} hitSlop={8} style={{ marginTop: spacing.md }}>
          <Text style={[type.meta, { color: colors.textMuted }]}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  back: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.md,
    maxWidth: 440,
  },
  rule: {
    height: 1,
    backgroundColor: colors.text,
    width: 36,
    marginTop: spacing.xxl,
  },
  howto: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  em: {
    fontFamily: fonts.sansMedium,
    color: colors.text,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  pinRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    gap: spacing.lg,
  },
  pinRowPromoted: {
    opacity: 0.5,
  },
  pinActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
