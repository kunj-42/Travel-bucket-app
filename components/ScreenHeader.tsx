import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={[type.labelSoft, styles.eyebrow]}>{eyebrow}</Text> : null}
      <Text style={type.display}>{title}</Text>
      {subtitle ? <Text style={[type.body, styles.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  eyebrow: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.sm,
    maxWidth: 420,
  },
});
