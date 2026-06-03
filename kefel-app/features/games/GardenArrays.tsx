import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, RTLText, Button, ArrayGrid, FeedbackBanner } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { useAppStore } from '@/features/store/appStore';
import { pickPracticeFact, arrayTarget, isArrayCorrect } from './gameLogic';
import { makeRng } from '@/lib/random';
import { expr } from '@/lib/rtl';

/**
 * Garden Arrays. Learning outcome: connect a multiplication fact to its
 * array/area structure (rows × columns = product). The child grows a garden of
 * the right shape using steppers (tap, not drag).
 */
export function GardenArrays() {
  const theme = useTheme();
  const mastery = useAppStore((s) => s.mastery);
  const practiceAnswer = useAppStore((s) => s.practiceAnswer);
  const [round, setRound] = useState(0);

  const fact = useMemo(() => pickPracticeFact(mastery, makeRng(round + 1)), [round, mastery]);
  const target = arrayTarget(fact);
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  const [result, setResult] = useState<boolean | null>(null);

  const step = (set: (n: number) => void, value: number, delta: number) =>
    set(Math.max(1, Math.min(10, value + delta)));

  function check() {
    const correct = isArrayCorrect(target, rows, cols);
    setResult(correct);
    practiceAnswer(fact.a, fact.b, correct, false, 'garden_arrays');
  }

  function nextRound() {
    setRows(1);
    setCols(1);
    setResult(null);
    setRound((r) => r + 1);
  }

  return (
    <Screen scroll>
      <RTLText variant="title" center>
        {t('game.garden.title')}
      </RTLText>
      <RTLText variant="body" center>
        {t('game.garden.instruction', { expr: expr(fact.a, fact.b) })}
      </RTLText>

      <View style={styles.steppers}>
        <Stepper label="שורות" value={rows} onMinus={() => step(setRows, rows, -1)} onPlus={() => step(setRows, rows, 1)} />
        <Stepper label="עמודות" value={cols} onMinus={() => step(setCols, cols, -1)} onPlus={() => step(setCols, cols, 1)} />
      </View>

      <View style={styles.grid}>
        <ArrayGrid rows={rows} cols={cols} dotColor={theme.palette.grass} />
        <RTLText variant="heading" center>
          {rows} × {cols} = {rows * cols}
        </RTLText>
      </View>

      {result === null ? (
        <Button label={t('common.done')} tone="success" big onPress={check} />
      ) : (
        <>
          <FeedbackBanner kind={result ? 'correct' : 'wrong'} message={result ? t('fb.correct.generic') : t('fb.wrong.generic')} />
          <Button label={t('common.next')} big onPress={nextRound} />
        </>
      )}
    </Screen>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <RTLText variant="label" center>
        {label}
      </RTLText>
      <View style={styles.stepperRow}>
        <Button label="−" tone="secondary" onPress={onMinus} accessibilityLabel={`פחות ${label}`} style={styles.stepBtn} />
        <RTLText variant="numeral" center>
          {value}
        </RTLText>
        <Button label="+" tone="secondary" onPress={onPlus} accessibilityLabel={`עוד ${label}`} style={styles.stepBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  steppers: { flexDirection: 'row-reverse', justifyContent: 'space-around', marginVertical: 16 },
  stepper: { alignItems: 'center', gap: 8 },
  stepperRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  stepBtn: { width: 64 },
  grid: { alignItems: 'center', gap: 12, marginVertical: 16 },
});
