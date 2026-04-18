import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { usePlaces } from '@/lib/store';
import { hasGeminiKey } from '@/lib/gemini';
import {
  MIN_ITEMS_FOR_SUGGESTIONS,
  canGenerate,
  fetchSuggestions,
  savedSetKey,
  type Suggestion,
} from '@/lib/suggestions';
import {
  clearSuggestionsCache,
  loadSuggestionsCache,
  saveSuggestionsCache,
} from '@/lib/db';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export default function Suggestions() {
  const { places } = usePlaces();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>('idle');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const unlocked = canGenerate(places.length);
  const currentKey = savedSetKey(places);
  const apiAvailable = hasGeminiKey();

  const load = useCallback(
    async (force = false) => {
      if (!unlocked || !apiAvailable) return;
      try {
        if (!force) {
          const cached = await loadSuggestionsCache();
          if (cached && cached.key === currentKey && cached.suggestions.length > 0) {
            setSuggestions(cached.suggestions);
            setStatus('ready');
            return;
          }
        }
        setStatus('loading');
        setErrorMsg(null);
        const fresh = await fetchSuggestions(places);
        setSuggestions(fresh);
        await saveSuggestionsCache({
          key: currentKey,
          suggestions: fresh,
          updatedAt: Date.now(),
        });
        setStatus('ready');
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
        setStatus('error');
      }
    },
    [unlocked, apiAvailable, currentKey, places],
  );

  // Regenerate when the saved set changes (organic refresh) or on first unlock.
  useEffect(() => {
    if (!unlocked) {
      setSuggestions([]);
      setStatus('idle');
      return;
    }
    load(false);
  }, [currentKey, unlocked, load]);

  const onPullRefresh = useCallback(async () => {
    await clearSuggestionsCache();
    await load(true);
  }, [load]);

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        unlocked ? (
          <RefreshControl
            refreshing={status === 'loading'}
            onRefresh={onPullRefresh}
            tintColor={colors.textMuted}
          />
        ) : undefined
      }
    >
      <Header />

      {!unlocked ? (
        <LockedState count={places.length} />
      ) : !apiAvailable ? (
        <MissingKeyState />
      ) : status === 'loading' && suggestions.length === 0 ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState message={errorMsg} onRetry={() => load(true)} />
      ) : suggestions.length > 0 ? (
        <SuggestionsList items={suggestions} />
      ) : (
        <LoadingState />
      )}
    </ScrollView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>For you</Text>
      <Text style={type.display}>In the margins{'\n'}of your list.</Text>
      <Text style={[type.body, styles.subtitle]}>
        Five places, picked to match the taste in your bucket. New ones appear only
        as your list grows.
      </Text>
      <View style={styles.rule} />
    </View>
  );
}

function LockedState({ count }: { count: number }) {
  const remaining = Math.max(0, MIN_ITEMS_FOR_SUGGESTIONS - count);
  return (
    <View style={styles.block}>
      <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Not yet</Text>
      <Text style={[type.subtitle, { marginBottom: spacing.lg }]}>
        Save {MIN_ITEMS_FOR_SUGGESTIONS} items to unlock suggestions.
      </Text>
      <Text style={type.body}>
        To pick up on your taste — the kind of food, the kind of rooms, the kind of
        afternoons you chase — we need a little more to read. Add {remaining}{' '}
        {remaining === 1 ? 'more item' : 'more items'} and they'll appear here.
      </Text>
      <View style={styles.progressWrap}>
        <View
          style={[
            styles.progressBar,
            { width: `${Math.min(100, (count / MIN_ITEMS_FOR_SUGGESTIONS) * 100)}%` },
          ]}
        />
      </View>
      <Text style={[type.meta, { marginTop: spacing.sm }]}>
        {count} / {MIN_ITEMS_FOR_SUGGESTIONS}
      </Text>
    </View>
  );
}

function MissingKeyState() {
  return (
    <View style={styles.block}>
      <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Missing key</Text>
      <Text style={[type.body, { color: colors.text }]}>
        Add a Gemini API key (free at aistudio.google.com) to{' '}
        <Text style={{ fontStyle: 'italic' }}>.env</Text>{' '}
        (EXPO_PUBLIC_GEMINI_API_KEY) and restart with{' '}
        <Text style={{ fontStyle: 'italic' }}>npx expo start -c</Text>.
      </Text>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={[styles.block, { alignItems: 'center', paddingTop: spacing.xxl }]}>
      <ActivityIndicator color={colors.textMuted} />
      <Text style={[type.meta, { marginTop: spacing.md }]}>Reading your list…</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <View style={styles.block}>
      <Text style={[type.labelSoft, { marginBottom: spacing.md }]}>Hit a snag</Text>
      <Text style={[type.body, { color: colors.text, marginBottom: spacing.lg }]}>
        {message ?? 'Could not reach the suggestions engine.'}
      </Text>
      <Pressable onPress={onRetry}>
        <Text style={[type.label, { color: colors.accent }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

function SuggestionsList({ items }: { items: Suggestion[] }) {
  return (
    <View style={{ paddingTop: spacing.lg }}>
      {items.map((s, i) => (
        <View key={`${s.title}-${s.city}-${i}`} style={styles.card}>
          <Text style={[type.labelSoft, { marginBottom: spacing.sm }]}>
            {s.category}
          </Text>
          <Text style={type.subtitle}>{s.title}</Text>
          <Text style={[type.meta, { marginTop: spacing.xs }]}>
            {s.city}
            {s.country ? ` · ${s.country}` : ''}
          </Text>
          <Text style={[type.body, { marginTop: spacing.md, fontStyle: 'italic' }]}>
            {s.reason}
          </Text>
        </View>
      ))}
    </View>
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
    paddingTop: spacing.xl,
  },
  progressWrap: {
    marginTop: spacing.xl,
    height: 2,
    backgroundColor: colors.hairline,
    overflow: 'hidden',
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.text,
  },
  card: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
});
