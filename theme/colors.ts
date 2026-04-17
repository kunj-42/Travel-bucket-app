export const colors = {
  background: '#FBF9F4',
  surface: '#F4F1EA',
  text: '#1A1A1A',
  textMuted: '#8A8780',
  textSoft: '#4A4A48',
  hairline: '#E5E2DB',
  accent: '#B4552D',
  accentSoft: '#E7CDB9',
  overlay: 'rgba(26, 26, 26, 0.04)',
} as const;

export type ColorToken = keyof typeof colors;
