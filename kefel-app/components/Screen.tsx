import React from 'react';
import { View, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  /** Visual area: child screens use warm paper, adult screens use plain. */
  variant?: 'child' | 'adult';
  style?: ViewStyle;
}

/** Root screen container: safe area + RTL + consistent padding. */
export function Screen({ children, scroll = false, variant = 'child', style }: ScreenProps) {
  const theme = useTheme();
  const bg = variant === 'child' ? theme.palette.paper : theme.palette.cloud;
  const content = (
    <View style={[styles.inner, { padding: theme.spacing.lg }, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // RTL is set globally via I18nManager; writingDirection keeps text correct.
  inner: { flex: 1, writingDirection: 'rtl' },
  scrollContent: { flexGrow: 1 },
});
