import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.labelWrap}>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
      <View style={[styles.dot, focused && styles.dotFocused]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="Feed" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="suggestions"
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="For You" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="filters"
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="Filter" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="Account" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    height: 72,
    paddingTop: 10,
    paddingBottom: 14,
  },
  item: {
    justifyContent: 'center',
  },
  labelWrap: {
    alignItems: 'center',
    gap: 6,
    width: 90,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  labelFocused: {
    color: colors.text,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotFocused: {
    backgroundColor: colors.accent,
  },
});
