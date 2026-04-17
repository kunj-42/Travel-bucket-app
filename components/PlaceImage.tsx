import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import type { Category } from '@/lib/types';

interface Props {
  uri?: string;
  category: Category;
  aspectRatio?: number;
  style?: ViewStyle;
}

export function PlaceImage({ uri, category, aspectRatio = 4 / 5, style }: Props) {
  if (uri) {
    return <Image source={{ uri }} style={[styles.base, { aspectRatio }, style]} resizeMode="cover" />;
  }
  return (
    <View style={[styles.base, styles.placeholder, { aspectRatio }, style]}>
      <Text style={type.labelSoft}>{category}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});
