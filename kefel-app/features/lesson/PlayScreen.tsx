import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Screen,
  RTLText,
  Button,
  AnswerChoices,
  ProgressBar,
  FactPrompt,
  HintCard,
  FeedbackBanner,
} from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { useAppStore } from '@/features/store/appStore';
import { makeContentProvider } from '@/content/contentBank';
import { makeDistractors } from '@/features/engine/difficulty';
import { strategiesFor } from '@/features/engine/facts';
import { makeRng, shuffle, deriveSeed } from '@/lib/random';
import type { SessionKind } from '@/features/store/appStore';

/**
 * The gameplay loop for both lessons and reviews. Handles retrieval, transfer
 * (word problems), hints, the 2-error scaffold step-down, and warm feedback.
 */
export function PlayScreen({ kind }: { kind: SessionKind }) {
  const router = useRouter();
  const theme = useTheme();
  const session = useAppStore((s) => s.session);
  const currentItem = useAppStore((s) => s.currentItem);
  const answer = useAppStore((s) => s.answer);
  const useHint = useAppStore((s) => s.useHint);
  const stepDown = useAppStore((s) => s.stepDownToScaffold);
  const endSession = useAppStore((s) => s.endSession);

  const [revealed, setRevealed] = useState<{ value: number; correct: boolean } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wrongStreak, setWrongStreak] = useState(0);

  const item = currentItem();
  const content = useMemo(
    () => makeContentProvider(session ? deriveSeed(1, session.id) : 1),
    [session?.id],
  );

  // When the session finishes, hand off to the celebration screen.
  useEffect(() => {
    if (session && session.index >= session.items.length) {
      endSession(false).then(() => router.replace('/(child)/celebrate'));
    }
  }, [session, endSession, router]);

  if (!session || !item) {
    return (
      <Screen>
        <RTLText variant="title" center>
          {t('reward.sessionDone')}
        </RTLText>
      </Screen>
    );
  }

  const scaffolded = item.kind === 'scaffolded' || wrongStreak >= 2 || session.currentScaffolded;
  const isTransfer = item.kind === 'transfer';
  const transfer = isTransfer ? content.transfer(item.a, item.b, 'word') : null;
  const correctAnswer = transfer ? transfer.answer : item.product;

  const options = useMemo(() => {
    const rng = makeRng(item.a * 1000 + item.b * 7 + session.index);
    const distractors = makeDistractors(rng, item.a, item.b, 3).map((d) =>
      transfer ? Math.max(0, d - (item.product - correctAnswer)) : d,
    );
    return shuffle(rng, Array.from(new Set([correctAnswer, ...distractors])).slice(0, 4));
  }, [item.a, item.b, session.index, correctAnswer, transfer, item.product]);

  const hint = content.hint(item.a, item.b);

  function onChoose(value: number) {
    if (revealed) return;
    const correct = value === correctAnswer;
    setRevealed({ value, correct });
    if (!correct) {
      const ws = wrongStreak + 1;
      setWrongStreak(ws);
      if (ws >= 2) stepDown();
    }
  }

  async function next() {
    if (!revealed) return;
    await answer({ correct: revealed.correct, rawValue: revealed.value, latencyMs: 0 });
    setRevealed(null);
    setShowHint(false);
    if (revealed.correct) setWrongStreak(0);
  }

  return (
    <Screen scroll>
      <ProgressBar
        current={session.index}
        total={session.items.length}
        accessibilityLabel={t('lesson.progress', { current: session.index + 1, total: session.items.length })}
      />
      <RTLText variant="caption" center color={theme.palette.inkSoft} style={styles.counter}>
        {t('lesson.progress', { current: session.index + 1, total: session.items.length })}
      </RTLText>

      <View style={styles.body}>
        {isTransfer && transfer ? (
          <View style={[styles.problemCard, { borderColor: theme.palette.border }]}>
            <RTLText variant="heading">{transfer.text}</RTLText>
          </View>
        ) : (
          <FactPrompt
            a={item.a}
            b={item.b}
            question={t('lesson.prompt.product', { expr: `${item.a} × ${item.b}` })}
          />
        )}

        {scaffolded || showHint ? (
          <HintCard hint={hint} a={item.a} b={item.b} showScaffold={scaffolded} />
        ) : (
          <Button icon="💡" label={t('lesson.hint.button')} tone="secondary" onPress={() => { setShowHint(true); useHint(); }} />
        )}

        <AnswerChoices options={options} onChoose={onChoose} revealed={revealed} disabled={!!revealed} />

        {revealed ? (
          <>
            <FeedbackBanner
              kind={revealed.correct ? 'correct' : 'wrong'}
              message={revealed.correct ? content.success(showHint, item.factId) : content.error(item.factId)}
            />
            <Button
              label={revealed.correct ? t('common.continue') : t('fb.tryAgain')}
              tone={revealed.correct ? 'success' : 'primary'}
              big
              onPress={revealed.correct ? next : () => setRevealed(null)}
            />
          </>
        ) : null}
      </View>

      <Button label={t('common.close')} tone="ghost" onPress={() => endSession(true).then(() => router.replace('/(child)/home'))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  counter: { marginTop: 8 },
  body: { flex: 1, gap: 20, marginTop: 16 },
  problemCard: { borderWidth: 2, borderRadius: 16, padding: 20 },
});
