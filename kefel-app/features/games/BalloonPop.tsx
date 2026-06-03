import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Screen, RTLText, Button } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { useAppStore } from '@/features/store/appStore';
import { pickPracticeFact, buildBalloons } from './gameLogic';
import { makeRng } from '@/lib/random';
import { expr, ltr } from '@/lib/rtl';

/**
 * Balloon Pop Review. Learning outcome: fast, accurate fact retrieval and
 * answer discrimination — the child pops ONLY balloons equal to the product.
 */
export function BalloonPop() {
  const theme = useTheme();
  const mastery = useAppStore((s) => s.mastery);
  const practiceAnswer = useAppStore((s) => s.practiceAnswer);
  const [round, setRound] = useState(0);

  const fact = useMemo(() => pickPracticeFact(mastery, makeRng(round * 13 + 1)), [round, mastery]);
  const balloons = useMemo(() => buildBalloons(makeRng(round * 13 + 2), fact), [round, fact]);
  const [popped, setPopped] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState(0);

  const matchesTotal = balloons.filter((b) => b.isMatch).length;
  const matchesPopped = balloons.filter((b) => b.isMatch && popped.has(b.id)).length;
  const done = matchesPopped === matchesTotal;

  function pop(id: number) {
    if (popped.has(id) || done) return;
    const balloon = balloons.find((b) => b.id === id)!;
    const next = new Set(popped);
    next.add(id);
    setPopped(next);
    if (!balloon.isMatch) setMistakes((m) => m + 1);
    // Record a fact attempt when the last needed match is found.
    const willBeDone = balloon.isMatch && matchesPopped + 1 === matchesTotal;
    if (willBeDone) practiceAnswer(fact.a, fact.b, mistakes === 0, mistakes > 0, 'balloon_pop');
  }

  return (
    <Screen scroll>
      <RTLText variant="title" center>
        {t('game.balloons.title')}
      </RTLText>
      <RTLText variant="body" center>
        {t('game.balloons.instruction', { expr: expr(fact.a, fact.b) })}
      </RTLText>

      <View style={styles.field}>
        {balloons.map((b) => {
          const isPopped = popped.has(b.id);
          return (
            <Pressable
              key={b.id}
              onPress={() => pop(b.id)}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.answerOption', { value: b.value })}
              style={[
                styles.balloon,
                {
                  backgroundColor: isPopped
                    ? b.isMatch
                      ? theme.palette.successBg
                      : theme.palette.dangerBg
                    : theme.palette.berry,
                  borderRadius: theme.radius.pill,
                  opacity: isPopped ? 0.5 : 1,
                },
              ]}
            >
              <RTLText variant="title" center color={isPopped ? theme.palette.ink : theme.palette.cloud}>
                {isPopped ? (b.isMatch ? '✓' : '✕') : ltr(b.value)}
              </RTLText>
            </Pressable>
          );
        })}
      </View>

      {done ? (
        <>
          <RTLText variant="heading" center color={theme.palette.grass}>
            {mistakes === 0 ? t('fb.correct.generic') : t('fb.tryAgain')}
          </RTLText>
          <Button
            label={t('common.next')}
            big
            onPress={() => {
              setPopped(new Set());
              setMistakes(0);
              setRound((r) => r + 1);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginVertical: 24 },
  balloon: { width: 90, height: 110, alignItems: 'center', justifyContent: 'center' },
});
