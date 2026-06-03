import React from 'react';
import { Text, StyleSheet, type TextStyle, type TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/tokens';

type Variant = keyof typeof typography;

interface RTLTextProps extends TextProps {
  children: React.ReactNode;
  variant?: Variant;
  color?: string;
  center?: boolean;
  style?: TextStyle | TextStyle[];
}

/**
 * Text primitive for Hebrew RTL content. Defaults to right alignment and RTL
 * writing direction; numbers embedded via the i18n/rtl helpers stay isolated.
 */
export function RTLText({
  children,
  variant = 'body',
  color,
  center = false,
  style,
  ...rest
}: RTLTextProps) {
  const theme = useTheme();
  return (
    <Text
      style={[
        typography[variant],
        styles.base,
        { color: color ?? theme.palette.ink, textAlign: center ? 'center' : 'right' },
        style as TextStyle,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { writingDirection: 'rtl' },
});
