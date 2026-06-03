import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, RTLText, Button, FeedbackBanner } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { useAppStore } from '@/features/store/appStore';
import { pickPracticeFact, buildLabChallenge } from './gameLogic';
import { makeRng } from '@/lib/random';
import { expr, ltr } from '@/lib/rtl';

/**
 * Magic Lab (optional). Learning outcome: strategy-based decomposition for
 * harder facts — the child picks the correct way to break a fact into known
 * parts, reinforcing the decompose-known strategy used for ×6/×7/×8.
 */
export function MagicLab() {
  const theme = useTheme();
  const mastery = useAppStore((s) => s.mastery);
  const practiceAnswer = useAppStore((s) => s.practiceAnswer);
  const [round, setRound] = useState(0);

  const fact = useMemo(() => pickPracticeFact(mastery, makeRng(round * 5 + 3)), [round, mastery]);
  const challenge = useMemo(() => buildLabChallenge(makeRng(round * 5 + 4), fact), [round, fact]);
  const [chosen, setChosen] = useState<number | null>(null);

  function choose(i: number) {
    setChosen(i);
    practiceAnswer(fact.a, fact.b, challenge.options[i]!.correct, true, 'magic_lab');
  }

  return (
    <Screen scroll>
      <RTLText variant="title" center>
        {t('game.lab.title')}
      </RTLText>
      <RTLText variant="body" center>
        {t('game.lab.instruction')}
      </RTLText>
      <RTLText variant="numeral" center>
        {expr(fact.a, fact.b)} = ?
      </RTLText>

      <View style={styles.options}>
        {challenge.options.map((opt, i) => (
          <Button
            key={i}
            label={ltr(opt.text)}
            tone={chosen === null ? 'secondary' : opt.correct ? 'success' : chosen === i ? 'primary' : 'secondary'}
            onPress={() => choose(i)}
            disabled={chosen !== null}
          />
        ))}
      </View>

      {chosen !== null ? (
        <>
          <FeedbackBanner
            kind={challenge.options[chosen]!.correct ? 'correct' : 'wrong'}
            message={challenge.options[chosen]!.correct ? t('fb.correct.generic') : t('fb.wrong.generic')}
          />
          <Button label={t('common.next')} big onPress={() => { setChosen(null); setRound((r) => r + 1); }} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: 12, marginVertical: 16 },
});
