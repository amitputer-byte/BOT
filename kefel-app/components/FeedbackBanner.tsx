import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RTLText } from './RTLText';
import { useTheme } from '@/theme/ThemeProvider';

interface FeedbackBannerProps {
  kind: 'correct' | 'wrong' | 'scaffold';
  message: string;
}

/**
 * Warm, non-aggressive feedback. Uses icon + text + color together (never color
 * alone) and avoids flashing/animated success states for accessibility.
 */
export function FeedbackBanner({ kind, message }: FeedbackBannerProps) {
  const theme = useTheme();
  const map = {
    correct: { bg: theme.palette.successBg, fg: theme.palette.success, icon: '✓' },
    wrong: { bg: theme.palette.dangerBg, fg: theme.palette.danger, icon: '↻' },
    scaffold: { bg: theme.palette.warnBg, fg: theme.palette.warn, icon: '👀' },
  }[kind];
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: map.bg, borderRadius: theme.radius.lg }]}
    >
      <RTLText variant="heading" color={map.fg} center>
        {map.icon} {message}
      </RTLText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 16, alignItems: 'center' },
});
