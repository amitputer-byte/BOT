import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { clamp } from '@/lib/math';

interface ProgressBarProps {
  current: number;
  total: number;
  accessibilityLabel?: string;
}

/** RTL progress bar — fills from the right (start) toward the left. */
export function ProgressBar({ current, total, accessibilityLabel }: ProgressBarProps) {
  const theme = useTheme();
  const pct = total === 0 ? 0 : clamp(current / total, 0, 1);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: theme.palette.paperAlt, borderRadius: theme.radius.pill }]}
    >
      <View
        style={[
          styles.fill,
          { width: `${pct * 100}%`, backgroundColor: theme.palette.grass, borderRadius: theme.radius.pill },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // row-reverse so the fill grows from the RTL start edge.
  track: { height: 16, width: '100%', overflow: 'hidden', flexDirection: 'row-reverse' },
  fill: { height: '100%' },
});
