import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface Props {
  eyebrow?: string;
  title: string;
  body?: string;
  children?: React.ReactNode;
}

export function EmptyState({ eyebrow, title, body, children }: Props) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={[type.labelSoft, styles.eyebrow]}>{eyebrow}</Text> : null}
      <Text style={[type.title, styles.title]}>{title}</Text>
      {body ? <Text style={[type.body, styles.body]}>{body}</Text> : null}
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.huge,
    alignItems: 'flex-start',
    backgroundColor: colors.background,
  },
  eyebrow: { marginBottom: spacing.md },
  title: { marginBottom: spacing.md, maxWidth: 360 },
  body: { maxWidth: 360 },
  children: { marginTop: spacing.xl, alignSelf: 'stretch' },
});
