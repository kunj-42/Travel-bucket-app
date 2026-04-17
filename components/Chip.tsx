import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  pressed: { opacity: 0.7 },
  text: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSoft,
    letterSpacing: 0.2,
  },
  textSelected: {
    color: colors.background,
  },
});
