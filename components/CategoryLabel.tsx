import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import type { Category } from '@/lib/types';

interface Props {
  category: Category;
  muted?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function CategoryLabel({ category, muted, style, textStyle }: Props) {
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.rule, muted && { backgroundColor: colors.textMuted }]} />
      <Text style={[muted ? type.labelSoft : type.label, textStyle]}>{category}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rule: {
    width: 18,
    height: 1,
    backgroundColor: colors.text,
  },
});
