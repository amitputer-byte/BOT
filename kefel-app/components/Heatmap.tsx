import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RTLText } from './RTLText';
import { useTheme } from '@/theme/ThemeProvider';
import type { MasteryStatus } from '@/data/schemas';
import { factA11yLabel } from '@/lib/a11y';

interface Cell {
  a: number;
  b: number;
  status: MasteryStatus;
}

/** Status -> {color, glyph}. Glyph ensures we never rely on color alone. */
function statusStyle(status: MasteryStatus, palette: ReturnType<typeof useTheme>['palette']) {
  switch (status) {
    case 'mastered':
      return { bg: palette.grass, glyph: '★' };
    case 'strong':
      return { bg: palette.success, glyph: '●' };
    case 'practicing':
      return { bg: palette.sun, glyph: '◐' };
    case 'at_risk':
      return { bg: palette.danger, glyph: '!' };
    case 'learning':
      return { bg: palette.paperAlt, glyph: '·' };
    default:
      return { bg: palette.cloud, glyph: '' };
  }
}

/**
 * Mastery heatmap over the full 0–10 table. Canonical status is mirrored across
 * the diagonal so both a×b and b×a show the same colour.
 */
export function Heatmap({ cells }: { cells: Cell[] }) {
  const theme = useTheme();
  const lookup = new Map<string, MasteryStatus>();
  for (const c of cells) {
    lookup.set(`${c.a}x${c.b}`, c.status);
    lookup.set(`${c.b}x${c.a}`, c.status);
  }
  const range = Array.from({ length: 11 }, (_, i) => i); // 0..10

  return (
    <View style={styles.wrap}>
      {range.map((r) => (
        <View key={r} style={styles.row}>
          {range.map((c) => {
            const status = lookup.get(`${r}x${c}`) ?? 'new';
            const s = statusStyle(status, theme.palette);
            return (
              <View
                key={c}
                accessibilityLabel={`${factA11yLabel(r, c)} — ${status}`}
                style={[styles.cell, { backgroundColor: s.bg, borderColor: theme.palette.border }]}
              >
                <RTLText variant="caption" center color={theme.palette.ink} style={styles.glyph}>
                  {s.glyph}
                </RTLText>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const SIZE = 26;
const styles = StyleSheet.create({
  wrap: { gap: 2, alignSelf: 'center' },
  row: { flexDirection: 'row-reverse', gap: 2 },
  cell: { width: SIZE, height: SIZE, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 12 },
});
