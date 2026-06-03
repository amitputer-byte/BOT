/**
 * Design tokens. Child-friendly but accessible:
 * - all text/background pairs target WCAG AA (>= 4.5:1 for body).
 * - colors are never the only signal; components also use shape/text/icon.
 * - large tap targets (min 56dp) and prominent numerals.
 */

export const palette = {
  // Warm, friendly, high-contrast set.
  sky: '#1E6FD9',
  skyDark: '#0B4DA8',
  grass: '#1F8A4C',
  grassDark: '#136034',
  sun: '#F2A20C',
  berry: '#D6336C',
  plum: '#7048E8',
  ink: '#1A1C2A', // primary text on light
  inkSoft: '#4A4E69',
  cloud: '#FFFFFF',
  paper: '#FBF7EF', // warm off-white background
  paperAlt: '#F1E9D8',
  border: '#D9CFB8',
  success: '#1F8A4C',
  successBg: '#E4F4EA',
  warn: '#B25E00',
  warnBg: '#FBEFD9',
  danger: '#C32B3D',
  dangerBg: '#FBE4E6',
  focus: '#0B4DA8',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  // Sizes scale up for a 7–8 y/o; numerals are intentionally large.
  display: { fontSize: 48, fontWeight: '800' as const, lineHeight: 56 },
  numeral: { fontSize: 64, fontWeight: '900' as const, lineHeight: 70 },
  title: { fontSize: 28, fontWeight: '800' as const, lineHeight: 36 },
  heading: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  body: { fontSize: 20, fontWeight: '500' as const, lineHeight: 30 },
  label: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  caption: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
} as const;

/** Minimum interactive target per accessibility guidance. */
export const TAP_TARGET = 56;

export const motion = {
  fast: 150,
  base: 250,
  celebrate: 1200, // short + skippable
} as const;

export type Palette = typeof palette;
