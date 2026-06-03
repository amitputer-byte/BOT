import React, { useMemo, useState } from 'react';
import { View, TextInput, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, RTLText, Button, Avatar, AVATAR_IDS, AnswerChoices, FactPrompt } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { useAppStore } from '@/features/store/appStore';
import { makeGateChallenge, verifyGate } from '@/services/parentGate';
import { makeRng } from '@/lib/random';
import { baselineProbes, seedFromBaseline, type BaselineResult } from '@/features/onboarding/baseline';
import { makeDistractors } from '@/features/engine/difficulty';
import { shuffle } from '@/lib/random';
import type { ChildProfile, ParentProfile } from '@/data/schemas';

type Step = 'gate' | 'consent' | 'nickname' | 'avatar' | 'baseline' | 'tutorial' | 'done';

const newId = () => `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

export default function Onboarding() {
  const router = useRouter();
  const theme = useTheme();
  const { completeOnboarding, seedBaseline, setAnalyticsEnabled } = useAppStore.getState();

  const [step, setStep] = useState<Step>('gate');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<ChildProfile['avatar']>('fox');
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);
  const [childId] = useState(newId());

  const challenge = useMemo(() => makeGateChallenge(makeRng(Date.now())), []);
  const probes = useMemo(() => baselineProbes(), []);
  const [baselineResults, setBaselineResults] = useState<BaselineResult[]>([]);
  const [probeIndex, setProbeIndex] = useState(0);

  async function finish() {
    const now = Date.now();
    const child: ChildProfile = {
      id: childId,
      nickname: nickname.trim() || 'כוכב',
      avatar,
      createdAt: now,
      audioInstructions: true,
      reducedMotion: false,
      dailyGoalActivities: 3,
    };
    const parent: ParentProfile = {
      id: newId(),
      authUid: null,
      email: null,
      consent: { privacyAcceptedAt: now, analyticsEnabled: analyticsOptIn, syncEnabled: false },
      createdAt: now,
    };
    await completeOnboarding(child, parent);
    if (analyticsOptIn) await setAnalyticsEnabled(true);
    if (baselineResults.length) {
      await seedBaseline(seedFromBaseline(childId, baselineResults, now));
    }
    router.replace('/(child)/home');
  }

  return (
    <Screen scroll variant="child">
      {step === 'gate' && <GateStep challenge={challenge} onPass={() => setStep('consent')} />}
      {step === 'consent' && (
        <ConsentStep
          analyticsOptIn={analyticsOptIn}
          setAnalyticsOptIn={setAnalyticsOptIn}
          onNext={() => setStep('nickname')}
        />
      )}
      {step === 'nickname' && (
        <View style={styles.center}>
          <RTLText variant="title" center>
            {t('onb.nick.title')}
          </RTLText>
          <RTLText variant="body" center color={theme.palette.inkSoft}>
            {t('onb.nick.hint')}
          </RTLText>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder={t('onb.nick.placeholder')}
            accessibilityLabel={t('onb.nick.title')}
            style={[styles.input, { borderColor: theme.palette.border, color: theme.palette.ink }]}
            textAlign="right"
            maxLength={20}
          />
          <Button label={t('common.next')} onPress={() => setStep('avatar')} big />
        </View>
      )}
      {step === 'avatar' && (
        <View style={styles.center}>
          <RTLText variant="title" center>
            {t('onb.avatar.title')}
          </RTLText>
          <View style={styles.avatarGrid}>
            {AVATAR_IDS.map((id) => (
              <Avatar key={id} id={id} selected={avatar === id} onPress={() => setAvatar(id)} />
            ))}
          </View>
          <Button label={t('common.next')} onPress={() => setStep('baseline')} big />
        </View>
      )}
      {step === 'baseline' && (
        <BaselineStep
          probe={probes[probeIndex]!}
          index={probeIndex}
          total={probes.length}
          onAnswer={(correct, latencyMs) => {
            const next = [...baselineResults, { factId: probes[probeIndex]!.factId, correct, latencyMs }];
            setBaselineResults(next);
            if (probeIndex + 1 >= probes.length) setStep('tutorial');
            else setProbeIndex(probeIndex + 1);
          }}
        />
      )}
      {step === 'tutorial' && <TutorialStep onDone={finish} />}
    </Screen>
  );
}

function GateStep({
  challenge,
  onPass,
}: {
  challenge: ReturnType<typeof makeGateChallenge>;
  onPass: () => void;
}) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  return (
    <View style={styles.center}>
      <RTLText variant="title" center>
        {t('onb.gate.title')}
      </RTLText>
      <RTLText variant="body" center>
        {t('onb.gate.subtitle')}
      </RTLText>
      <RTLText variant="numeral" center>
        {challenge.prompt}
      </RTLText>
      <TextInput
        value={value}
        onChangeText={setValue}
        keyboardType="number-pad"
        accessibilityLabel={t('onb.gate.subtitle')}
        style={[styles.input, { borderColor: error ? theme.palette.danger : theme.palette.border }]}
        textAlign="center"
      />
      {error ? (
        <RTLText variant="label" center color={theme.palette.danger}>
          {t('onb.gate.error')}
        </RTLText>
      ) : null}
      <Button
        label={t('common.continue')}
        big
        onPress={() => {
          if (verifyGate(challenge, Number(value))) onPass();
          else setError(true);
        }}
      />
    </View>
  );
}

function ConsentStep({
  analyticsOptIn,
  setAnalyticsOptIn,
  onNext,
}: {
  analyticsOptIn: boolean;
  setAnalyticsOptIn: (v: boolean) => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <RTLText variant="title" center>
        {t('onb.consent.title')}
      </RTLText>
      <RTLText variant="body">{t('onb.consent.body')}</RTLText>
      <View style={[styles.row, { borderColor: theme.palette.border }]}>
        <Switch value={analyticsOptIn} onValueChange={setAnalyticsOptIn} />
        <RTLText variant="label" style={{ flex: 1 }}>
          {t('settings.analytics')}
        </RTLText>
      </View>
      <RTLText variant="caption" color={theme.palette.inkSoft}>
        {t('onb.consent.localOnly')}
      </RTLText>
      <Button label={t('onb.consent.accept')} big tone="success" onPress={onNext} />
    </View>
  );
}

function BaselineStep({
  probe,
  index,
  total,
  onAnswer,
}: {
  probe: { factId: string; a: number; b: number };
  index: number;
  total: number;
  onAnswer: (correct: boolean, latencyMs: number) => void;
}) {
  const startedAt = useMemo(() => Date.now(), [probe.factId]);
  const options = useMemo(() => {
    const rng = makeRng(probe.a * 100 + probe.b);
    return shuffle(rng, [probe.a * probe.b, ...makeDistractors(rng, probe.a, probe.b, 3)]);
  }, [probe.a, probe.b]);
  return (
    <View style={styles.center}>
      <RTLText variant="heading" center>
        {t('onb.baseline.title')}
      </RTLText>
      <RTLText variant="caption" center>
        {t('lesson.progress', { current: index + 1, total })}
      </RTLText>
      <FactPrompt a={probe.a} b={probe.b} audioEnabled={false} />
      <AnswerChoices
        options={options}
        onChoose={(v) => onAnswer(v === probe.a * probe.b, Date.now() - startedAt)}
      />
    </View>
  );
}

function TutorialStep({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  // Guaranteed success: 2×2 with the correct answer always present + reachable.
  const [solved, setSolved] = useState(false);
  return (
    <View style={styles.center}>
      <RTLText variant="title" center>
        {t('onb.tutorial.title')}
      </RTLText>
      <FactPrompt a={2} b={2} audioEnabled={false} question={t('lesson.prompt.product', { expr: '2 × 2' })} />
      {!solved ? (
        <AnswerChoices options={[4, 3, 5]} onChoose={(v) => setSolved(v === 4)} />
      ) : (
        <>
          <RTLText variant="heading" center color={theme.palette.grass}>
            {t('onb.tutorial.win')}
          </RTLText>
          <Button label={t('common.start')} big tone="success" onPress={onDone} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, gap: 20, justifyContent: 'center' },
  input: {
    borderWidth: 2,
    borderRadius: 16,
    fontSize: 28,
    padding: 16,
    minHeight: 64,
  },
  avatarGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12 },
});
