import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Screen, RTLText, Button } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { useAppStore } from '@/features/store/appStore';
import { buildTrainPairs, type TrainPair } from './gameLogic';
import { makeRng, shuffle } from '@/lib/random';
import { ltr } from '@/lib/rtl';
import { factById } from '@/features/engine/facts';

/**
 * Multiplication Train. Learning outcome: bind an expression to its product by
 * connecting expression cards (engine cars) to result cars. Tap an expression,
 * then tap its matching result — no dragging on the critical path.
 */
export function MultiplicationTrain() {
  const theme = useTheme();
  const mastery = useAppStore((s) => s.mastery);
  const practiceAnswer = useAppStore((s) => s.practiceAnswer);
  const [round, setRound] = useState(0);

  const pairs = useMemo(() => buildTrainPairs(mastery, makeRng(round + 1), 4), [round, mastery]);
  const results = useMemo(() => shuffle(makeRng(round + 99), pairs.map((p) => p.result)), [pairs, round]);

  const [selectedExpr, setSelectedExpr] = useState<TrainPair | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);

  const done = matched.size === pairs.length && pairs.length > 0;

  function tapResult(value: number) {
    if (!selectedExpr) return;
    const correct = selectedExpr.result === value && !matched.has(selectedExpr.factId);
    const card = factById(selectedExpr.factId);
    if (correct && card) {
      const next = new Set(matched);
      next.add(selectedExpr.factId);
      setMatched(next);
      setSelectedExpr(null);
      setWrong(null);
      practiceAnswer(card.a, card.b, true, false, 'multiplication_train');
    } else {
      setWrong(value);
    }
  }

  return (
    <Screen scroll>
      <RTLText variant="title" center>
        {t('game.train.title')}
      </RTLText>
      <RTLText variant="body" center>
        {t('game.train.instruction')}
      </RTLText>

      <RTLText variant="label">🚂 קרונות תרגיל</RTLText>
      <View style={styles.row}>
        {pairs.map((p) => {
          const isMatched = matched.has(p.factId);
          const isSelected = selectedExpr?.factId === p.factId;
          return (
            <Pressable
              key={p.factId}
              disabled={isMatched}
              onPress={() => setSelectedExpr(p)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isMatched }}
              style={[
                styles.car,
                {
                  backgroundColor: isMatched ? theme.palette.successBg : theme.palette.paperAlt,
                  borderColor: isSelected ? theme.palette.sky : theme.palette.border,
                  borderWidth: isSelected ? 3 : 1,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <RTLText variant="heading" center>
                {isMatched ? '✓ ' : ''}
                {ltr(p.expr)}
              </RTLText>
            </Pressable>
          );
        })}
      </View>

      <RTLText variant="label">🛤️ קרונות תשובה</RTLText>
      <View style={styles.row}>
        {results.map((value, i) => (
          <Pressable
            key={`${value}_${i}`}
            onPress={() => tapResult(value)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.answerOption', { value })}
            style={[
              styles.car,
              {
                backgroundColor: wrong === value ? theme.palette.dangerBg : theme.palette.cloud,
                borderColor: theme.palette.border,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <RTLText variant="numeral" center>
              {ltr(value)}
            </RTLText>
          </Pressable>
        ))}
      </View>

      {done ? (
        <>
          <RTLText variant="heading" center color={theme.palette.grass}>
            {t('fb.correct.generic')}
          </RTLText>
          <Button
            label={t('common.next')}
            big
            onPress={() => {
              setMatched(new Set());
              setSelectedExpr(null);
              setWrong(null);
              setRound((r) => r + 1);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginVertical: 12 },
  car: { minWidth: 90, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
});
