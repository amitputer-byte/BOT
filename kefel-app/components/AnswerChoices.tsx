import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { RTLText } from './RTLText';
import { ltr } from '@/lib/rtl';
import { t } from '@/services/i18n';

interface AnswerChoicesProps {
  options: number[];
  onChoose: (value: number) => void;
  /** When set, show correctness state (avoid color-only: also icon + text). */
  revealed?: { value: number; correct: boolean } | null;
  disabled?: boolean;
}

/**
 * Big multiple-choice buttons with prominent numerals. Tapping (not dragging)
 * is the critical-path interaction per child-UX guidance.
 */
export function AnswerChoices({ options, onChoose, revealed, disabled }: AnswerChoicesProps) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {options.map((value) => {
        const isChosen = revealed?.value === value;
        const showCorrect = revealed && value === revealed.value && revealed.correct;
        const showWrong = revealed && isChosen && !revealed.correct;
        const bg = showCorrect
          ? theme.palette.successBg
          : showWrong
            ? theme.palette.dangerBg
            : theme.palette.cloud;
        const border = showCorrect
          ? theme.palette.success
          : showWrong
            ? theme.palette.danger
            : theme.palette.border;
        return (
          <Pressable
            key={value}
            disabled={disabled}
            onPress={() => onChoose(value)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.answerOption', { value })}
            style={[
              styles.tile,
              { backgroundColor: bg, borderColor: border, borderRadius: theme.radius.lg },
            ]}
          >
            {/* icon + numeral, never color alone */}
            {showCorrect ? <RTLText variant="heading">✓</RTLText> : null}
            {showWrong ? <RTLText variant="heading">✕</RTLText> : null}
            <RTLText variant="numeral" center color={theme.palette.ink}>
              {ltr(value)}
            </RTLText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  tile: {
    width: 140,
    minHeight: 110,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
