import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { RTLText } from './RTLText';
import { useTheme } from '@/theme/ThemeProvider';
import { expr } from '@/lib/rtl';
import { factA11yLabel } from '@/lib/a11y';
import { t } from '@/services/i18n';

interface FactPromptProps {
  a: number;
  b: number;
  /** Optional spoken-instruction replay (Hebrew). */
  audioEnabled?: boolean;
  question?: string;
}

/**
 * The large, prominent expression "a × b = ?" with an optional audio replay
 * button. The expression is bidi-isolated so it never reflows in the RTL UI.
 */
export function FactPrompt({ a, b, audioEnabled = true, question }: FactPromptProps) {
  const theme = useTheme();
  const speak = () => {
    Speech.speak(question ?? `${factA11yLabel(a, b)}?`, { language: 'he-IL' });
  };
  return (
    <View style={styles.wrap}>
      {question ? (
        <RTLText variant="title" center>
          {question}
        </RTLText>
      ) : null}
      <View
        accessibilityLabel={`${factA11yLabel(a, b)}?`}
        style={[styles.card, { backgroundColor: theme.palette.cloud, borderColor: theme.palette.border, borderRadius: theme.radius.lg }]}
      >
        <RTLText variant="numeral" center>
          {expr(a, b)}
        </RTLText>
        <RTLText variant="numeral" center color={theme.palette.inkSoft}>
          = ?
        </RTLText>
      </View>
      {audioEnabled ? (
        <Pressable onPress={speak} accessibilityRole="button" accessibilityLabel={t('a11y.replayAudio')}>
          <RTLText variant="label" color={theme.palette.sky} center>
            🔊 {t('common.replayAudio')}
          </RTLText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 16 },
  card: { paddingVertical: 24, paddingHorizontal: 40, borderWidth: 2, alignItems: 'center', gap: 4, minWidth: 220 },
});
