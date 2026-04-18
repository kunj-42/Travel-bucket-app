export const colors = {
  // Pale mint — warmer than pure white, feels like morning light in a library.
  background: '#E9EFEC',
  // One step darker than background, used for cards, inputs, elevated surfaces.
  surface: '#DDE6E0',
  // Deep forest green — the primary text + primary button color.
  text: '#16423C',
  // Softer body-text green for long-form prose.
  textSoft: '#2C5A53',
  // Low-emphasis labels and meta copy.
  textMuted: '#7A948B',
  // Barely-there separators and borders.
  hairline: '#C8D4CE',
  // Terracotta, the one warm accent — used sparingly for attention.
  accent: '#B4552D',
  // Soft terracotta tint for background washes on accent states.
  accentSoft: '#E7CDB9',
  // Very faint tint of the primary for overlays.
  overlay: 'rgba(22, 66, 60, 0.04)',
} as const;

export type ColorToken = keyof typeof colors;
