import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { fonts, type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Divider } from '@/components/Divider';
import { usePlaces } from '@/lib/store';
import { parseUrl } from '@/lib/parseUrl';
import { CATEGORIES, type Category } from '@/lib/types';

export default function AddPlace() {
  const insets = useSafeAreaInsets();
  const { add } = usePlaces();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [thumb, setThumb] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<Category | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [saving, setSaving] = useState(false);

  const onFetch = async () => {
    if (!url.trim()) return;
    setParsing(true);
    try {
      const res = await parseUrl(url.trim());
      if (res.title && !title) setTitle(res.title);
      if (res.thumbnailUrl && !thumb) setThumb(res.thumbnailUrl);
      if (res.suggestedCategory && !category) setCategory(res.suggestedCategory);
      setParsed(true);
    } finally {
      setParsing(false);
    }
  };

  const canSave = title.trim() && city.trim() && country.trim() && category;

  const onSave = async () => {
    if (!canSave || !category) return;
    setSaving(true);
    try {
      await add({
        title: title.trim(),
        city: city.trim(),
        country: country.trim(),
        category,
        sourceUrl: url.trim() || undefined,
        thumbnailUrl: thumb,
        notes: notes.trim() || undefined,
        tags: tagsRaw
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.select({ ios: 'padding', default: undefined })}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.cancel}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>New entry</Text>
          <Text style={type.display}>Add a place.</Text>
          <Text style={[type.body, styles.subtitle]}>
            Paste a link — a reel, a listing, a restaurant page. We'll read what we can and you fill
            in the rest.
          </Text>
          <View style={styles.rule} />
        </View>

        <Field label="Link">
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
            onSubmitEditing={onFetch}
            returnKeyType="go"
          />
          <View style={{ height: spacing.md }} />
          <Button
            label={parsing ? 'Reading…' : parsed ? 'Re-read link' : 'Read link'}
            variant="outline"
            loading={parsing}
            onPress={onFetch}
            disabled={!url.trim()}
          />
        </Field>

        {thumb ? (
          <View style={styles.thumbWrap}>
            <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
          </View>
        ) : null}

        <Divider style={{ marginVertical: spacing.xxl, marginHorizontal: spacing.xl }} />

        <Field label="Title">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Name of the place"
            placeholderTextColor={colors.textMuted}
            style={styles.inputSerif}
          />
        </Field>

        <Field label="Category">
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
        </Field>

        <Field label="City">
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Lisbon"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>

        <Field label="Country">
          <TextInput
            value={country}
            onChangeText={setCountry}
            placeholder="Portugal"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>

        <Field label="Tags" hint="Comma-separated, lowercase.">
          <TextInput
            value={tagsRaw}
            onChangeText={setTagsRaw}
            placeholder="natural-wine, alfama, lunch"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={styles.input}
          />
        </Field>

        <Field label="Notes">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="A line for future you."
            placeholderTextColor={colors.textMuted}
            multiline
            style={[styles.input, styles.notes]}
          />
        </Field>

        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>
          <Button
            label={saving ? 'Saving…' : 'Save to bucket'}
            onPress={onSave}
            loading={saving}
            disabled={!canSave}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>{label}</Text>
      {children}
      {hint ? <Text style={[type.meta, { marginTop: spacing.sm }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    paddingHorizontal: spacing.xl,
    alignItems: 'flex-end',
  },
  cancel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
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
  field: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.text,
  },
  inputSerif: {
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    paddingVertical: spacing.md,
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.text,
  },
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbWrap: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface,
  },
});
