import { Platform, TextStyle } from 'react-native';
import { colors } from './colors';

const serif = Platform.select({
  default: 'Fraunces_400Regular',
  web: 'Fraunces, Georgia, serif',
});
const sans = Platform.select({
  default: 'Inter_400Regular',
  web: 'Inter, -apple-system, system-ui, sans-serif',
});
const sansMedium = Platform.select({
  default: 'Inter_500Medium',
  web: 'Inter, -apple-system, system-ui, sans-serif',
});

export const fonts = {
  serif,
  sans,
  sansMedium,
};

export const type = {
  display: {
    fontFamily: serif,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: colors.text,
  } as TextStyle,
  title: {
    fontFamily: serif,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: colors.text,
  } as TextStyle,
  subtitle: {
    fontFamily: serif,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.text,
  } as TextStyle,
  body: {
    fontFamily: sans,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSoft,
  } as TextStyle,
  meta: {
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  } as TextStyle,
  label: {
    fontFamily: sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.text,
  } as TextStyle,
  labelSoft: {
    fontFamily: sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  } as TextStyle,
};
