import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

/**
 * Library-card inspired "VISITED" stamp — slightly rotated, imperfect border,
 * terracotta ink at 85% opacity so the image still reads underneath. Used as
 * an overlay on PlaceCard images and on the place-detail hero.
 */
export function VisitedStamp({ style, size = 'md' }: { style?: ViewStyle; size?: 'sm' | 'md' }) {
  const sizeStyle = size === 'sm' ? styles.small : styles.medium;
  return (
    <View style={[styles.wrap, sizeStyle, style]} pointerEvents="none">
      <View style={[styles.border, sizeStyle]}>
        <Text style={[styles.text, size === 'sm' && styles.textSmall]}>VISITED</Text>
      </View>
    </View>
  );
}

const STAMP_COLOR = colors.accent;

const styles = StyleSheet.create({
  wrap: {
    transform: [{ rotate: '-4deg' }],
    opacity: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  border: {
    borderWidth: 2,
    borderColor: STAMP_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },
  text: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    letterSpacing: 3,
    color: STAMP_COLOR,
  },
  textSmall: {
    fontSize: 11,
    letterSpacing: 2.4,
  },
  small: {
    // No fixed size; child paddings scale via `textSmall`.
  },
  medium: {
    // No fixed size; intrinsic from text.
  },
});
