import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { RTLText } from './RTLText';

type Tone = 'primary' | 'secondary' | 'success' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  tone?: Tone;
  /** Emoji/icon glyph shown alongside text — never color-only signalling. */
  icon?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  big?: boolean;
}

/** Large, high-contrast, accessible button. Min 56dp tap target. */
export function Button({
  label,
  onPress,
  tone = 'primary',
  icon,
  disabled = false,
  accessibilityLabel,
  style,
  big = false,
}: ButtonProps) {
  const theme = useTheme();
  const tones: Record<Tone, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.palette.sky, fg: theme.palette.cloud },
    secondary: { bg: theme.palette.paperAlt, fg: theme.palette.ink, border: theme.palette.border },
    success: { bg: theme.palette.grass, fg: theme.palette.cloud },
    ghost: { bg: 'transparent', fg: theme.palette.sky, border: theme.palette.sky },
  };
  const c = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: c.bg,
          minHeight: big ? 72 : theme.tapTarget,
          borderRadius: theme.radius.lg,
          borderWidth: c.border ? 2 : 0,
          borderColor: c.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          paddingHorizontal: theme.spacing.lg,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? (
          <RTLText variant={big ? 'title' : 'heading'} color={c.fg} style={styles.icon}>
            {icon}
          </RTLText>
        ) : null}
        <RTLText variant={big ? 'title' : 'heading'} color={c.fg} center>
          {label}
        </RTLText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center' },
  // row-reverse keeps icon on the correct side for RTL.
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  icon: { marginStart: 4 },
});
