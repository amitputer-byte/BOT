import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, RTLText, Button, StarCount, Avatar } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { useAppStore } from '@/features/store/appStore';
import { isDue } from '@/features/engine/scheduler';
import { getFlags } from '@/services/remoteConfig';

/** Child home / map: greeting, today's goal, one clear next step. */
export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const child = useAppStore((s) => s.child);
  const rewards = useAppStore((s) => s.rewards);
  const streak = useAppStore((s) => s.streak);
  const mastery = useAppStore((s) => s.mastery);
  const startSession = useAppStore((s) => s.startSession);

  const dueCount = useMemo(() => {
    const now = Date.now();
    return [...mastery.values()].filter((m) => isDue(m, now)).length;
  }, [mastery]);

  if (!child) return null;
  const playFirst = getFlags().homeCtaPriority === 'play_first';

  const go = (kind: 'lesson' | 'review') => {
    startSession(kind);
    router.push(kind === 'review' ? '/(child)/review' : '/(child)/lesson');
  };

  const PlayBtn = (
    <Button icon="🎮" label={t('home.startSession')} tone="success" big onPress={() => go('lesson')} />
  );
  const ReviewBtn =
    dueCount > 0 ? (
      <Button icon="🔁" label={t('home.review.due', { count: dueCount })} big onPress={() => go('review')} />
    ) : (
      <RTLText variant="body" center color={theme.palette.grass}>
        ✅ {t('home.allCaughtUp')}
      </RTLText>
    );

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar id={child.avatar} size={56} />
        <View style={{ flex: 1 }}>
          <RTLText variant="title">{t('home.greeting', { nick: child.nickname })}</RTLText>
          {streak && streak.weeklyCount > 0 ? (
            <RTLText variant="caption" color={theme.palette.inkSoft}>
              🔥 {t('home.streak', { count: streak.weeklyCount })}
            </RTLText>
          ) : null}
        </View>
        <StarCount stars={rewards?.stars ?? 0} />
      </View>

      <View style={styles.center}>
        <RTLText variant="heading" center color={theme.palette.inkSoft}>
          {t('home.todayGoal', { count: child.dailyGoalActivities })}
        </RTLText>
        {playFirst ? (
          <>
            {PlayBtn}
            {ReviewBtn}
          </>
        ) : (
          <>
            {ReviewBtn}
            {PlayBtn}
          </>
        )}
      </View>

      <Button label={t('home.parentArea')} tone="ghost" onPress={() => router.push('/(parent)')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  center: { flex: 1, justifyContent: 'center', gap: 20 },
});
