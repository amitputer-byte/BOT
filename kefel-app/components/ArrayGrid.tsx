import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { factA11yLabel } from '@/lib/a11y';

interface ArrayGridProps {
  rows: number;
  cols: number;
  /** Cells filled (for build-the-array interactions); defaults to all filled. */
  filled?: number;
  onCellPress?: (index: number) => void;
  dotColor?: string;
  max?: number; // safety cap on render size
}

/**
 * Renders a multiplication array (rows × cols) of dots — the core visual for
 * the "array / area" concept and the step-down scaffold. Rows are laid out
 * top-to-bottom and cells are RTL-ordered within each row.
 */
export function ArrayGrid({
  rows,
  cols,
  filled,
  onCellPress,
  dotColor,
  max = 100,
}: ArrayGridProps) {
  const theme = useTheme();
  const total = Math.min(rows * cols, max);
  const fill = filled ?? total;
  const cells = Array.from({ length: total }, (_, i) => i);

  return (
    <View
      accessibilityLabel={factA11yLabel(rows, cols, rows * cols)}
      style={styles.container}
    >
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.row}>
          {cells.slice(r * cols, r * cols + cols).map((idx) => {
            const isFilled = idx < fill;
            const dot = (
              <View
                style={[
                  styles.cell,
                  {
                    backgroundColor: isFilled
                      ? (dotColor ?? theme.palette.sky)
                      : theme.palette.paperAlt,
                    borderColor: theme.palette.border,
                    borderRadius: theme.radius.sm,
                  },
                ]}
              />
            );
            return onCellPress ? (
              <Pressable
                key={idx}
                onPress={() => onCellPress(idx)}
                accessibilityRole="button"
                accessibilityLabel="תא במערך"
                hitSlop={4}
              >
                {dot}
              </Pressable>
            ) : (
              <View key={idx}>{dot}</View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL = 26;
const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row-reverse', gap: 6 },
  cell: { width: CELL, height: CELL, borderWidth: 1 },
});
