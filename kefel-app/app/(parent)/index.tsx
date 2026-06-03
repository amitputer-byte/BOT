import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, RTLText, Button } from '@/components';
import { Heatmap } from '@/components/Heatmap';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { useAppStore } from '@/features/store/appStore';
import { toExport } from '@/features/parent/report';
import type { ParentReportSnapshot } from '@/data/schemas';
import { ltr } from '@/lib/rtl';

/** Parent dashboard: heatmap, KPIs, due/fragile facts, one recommended action. */
export default function Dashboard() {
  const router = useRouter();
  const theme = useTheme();
  const getReport = useAppStore((s) => s.getReport);
  const [report, setReport] = useState<ParentReportSnapshot | null>(null);

  useEffect(() => {
    getReport().then(setReport);
  }, [getReport]);

  if (!report) {
    return (
      <Screen variant="adult">
        <ActivityIndicator size="large" color={theme.palette.sky} />
      </Screen>
    );
  }

  const pct = (n: number) => `${ltr(Math.round(n * 100))}%`;

  return (
    <Screen variant="adult" scroll>
      <RTLText variant="title">{t('parent.dash.title')}</RTLText>

      {/* Recommended next action — the single most useful insight. */}
      <View style={[styles.recommend, { backgroundColor: theme.palette.successBg, borderRadius: theme.radius.lg }]}>
        <RTLText variant="label" color={theme.palette.grassDark}>
          ✨ {t('parent.dash.recommend')}
        </RTLText>
        <RTLText variant="body">{report.recommendedNextAction}</RTLText>
      </View>

      <View style={styles.kpiRow}>
        <Kpi label={t('parent.dash.mastered')} value={`${ltr(report.masteredFacts)}/${ltr(report.totalFacts)}`} />
        <Kpi label={t('parent.dash.fragile')} value={ltr(report.fragileFacts)} tone="warn" />
        <Kpi label={t('parent.dash.dueToday')} value={ltr(report.dueToday)} />
      </View>
      <View style={styles.kpiRow}>
        <Kpi label={t('parent.dash.retention7')} value={pct(report.retention7d)} />
        <Kpi label={t('parent.dash.retention30')} value={pct(report.retention30d)} />
        <Kpi label={t('parent.dash.transfer')} value={pct(report.transferAccuracy)} />
      </View>
      <View style={styles.kpiRow}>
        <Kpi label={t('parent.dash.hintDependence')} value={pct(report.hintDependence)} />
        <Kpi label={t('parent.dash.timeSpent')} value={`${ltr(Math.round(report.totalTimeMs / 60000))} ${'דק'}`} />
        <Kpi label={t('home.streak', { count: '' }).trim()} value={pct(report.streakParticipation)} />
      </View>

      <RTLText variant="heading">{t('parent.dash.heatmap')}</RTLText>
      <Heatmap cells={report.heatmap} />

      <Button
        label={t('parent.dash.export')}
        tone="secondary"
        onPress={() => {
          // Export structure is logged; a real build writes it via expo-sharing.
          // eslint-disable-next-line no-console
          console.warn('export', JSON.stringify(toExport(report)));
        }}
      />
      <Button label={t('settings.title')} onPress={() => router.push('/(parent)/settings')} />
    </Screen>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  const theme = useTheme();
  return (
    <View style={[styles.kpi, { borderColor: theme.palette.border, borderRadius: theme.radius.md }]}>
      <RTLText variant="title" center color={tone === 'warn' ? theme.palette.warn : theme.palette.sky}>
        {value}
      </RTLText>
      <RTLText variant="caption" center color={theme.palette.inkSoft}>
        {label}
      </RTLText>
    </View>
  );
}

const styles = StyleSheet.create({
  recommend: { padding: 16, gap: 6, marginVertical: 12 },
  kpiRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 10 },
  kpi: { flex: 1, borderWidth: 1, padding: 12, gap: 4, alignItems: 'center' },
});
