import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },
});
