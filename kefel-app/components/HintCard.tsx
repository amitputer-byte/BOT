import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { RTLText } from './RTLText';
import { Button } from './Button';
import { ArrayGrid } from './ArrayGrid';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import type { Hint } from '@/content/he/hints';

interface HintCardProps {
  hint: Hint;
  a: number;
  b: number;
  /** When true, also render the visual array (scaffold step-down). */
  showScaffold?: boolean;
}

/** Two-stage hint: a nudge first, then a worked step + optional visual array. */
export function HintCard({ hint, a, b, showScaffold = false }: HintCardProps) {
  const theme = useTheme();
  const [showWorked, setShowWorked] = useState(showScaffold);
  return (
    <View
      style={[styles.card, { backgroundColor: theme.palette.warnBg, borderColor: theme.palette.warn, borderRadius: theme.radius.lg }]}
    >
      <RTLText variant="label" color={theme.palette.warn}>
        💡 {t('lesson.hint.title')}
      </RTLText>
      <RTLText variant="body">{hint.nudge}</RTLText>
      {showWorked ? (
        <>
          <RTLText variant="body" color={theme.palette.inkSoft}>
            {hint.worked}
          </RTLText>
          {showScaffold ? (
            <View style={styles.array}>
              <ArrayGrid rows={a} cols={b} />
            </View>
          ) : null}
        </>
      ) : (
        <Button label={t('fb.showMe')} tone="ghost" onPress={() => setShowWorked(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 2, gap: 12 },
  array: { alignItems: 'center', marginTop: 8 },
});
