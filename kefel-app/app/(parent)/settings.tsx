import React, { useState } from 'react';
import { View, Switch, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, RTLText, Button } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { useAppStore } from '@/features/store/appStore';

/** Settings + privacy controls: the parent's full control surface. */
export default function Settings() {
  const router = useRouter();
  const theme = useTheme();
  const parent = useAppStore((s) => s.parent);
  const setAnalyticsEnabled = useAppStore((s) => s.setAnalyticsEnabled);
  const setSyncEnabled = useAppStore((s) => s.setSyncEnabled);
  const deleteChildData = useAppStore((s) => s.deleteChildData);
  const resetProgress = useAppStore((s) => s.resetProgress);

  const [analytics, setAnalytics] = useState(parent?.consent.analyticsEnabled ?? false);
  const [sync, setSync] = useState(parent?.consent.syncEnabled ?? false);

  const confirmDestructive = (message: string, action: () => void) =>
    Alert.alert(t('settings.title'), message, [
      { text: t('common.no'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: action },
    ]);

  return (
    <Screen variant="adult" scroll>
      <RTLText variant="title">{t('settings.title')}</RTLText>

      {/* Local-only is the default posture and is always on unless sync is enabled. */}
      <Row
        title={t('settings.localOnly')}
        desc={t('settings.localOnly.desc')}
        value={!sync}
        disabled
      />
      <Row
        title={t('settings.sync')}
        desc={t('settings.sync.desc')}
        value={sync}
        onChange={(v) => {
          setSync(v);
          setSyncEnabled(v);
        }}
      />
      <Row
        title={t('settings.analytics')}
        desc={t('settings.analytics.desc')}
        value={analytics}
        onChange={(v) => {
          setAnalytics(v);
          setAnalyticsEnabled(v);
        }}
      />

      <View style={styles.divider} />

      <Button
        label={t('settings.privacyPolicy')}
        tone="secondary"
        onPress={() => router.push('/(parent)/privacy')}
      />

      <View style={styles.divider} />

      <Button
        label={t('settings.resetProgress')}
        tone="secondary"
        onPress={() => confirmDestructive(t('settings.deleteData.confirm'), resetProgress)}
      />
      <Button
        label={t('settings.deleteData')}
        tone="primary"
        style={{ backgroundColor: theme.palette.danger }}
        onPress={() =>
          confirmDestructive(t('settings.deleteData.confirm'), () => {
            deleteChildData().then(() => router.replace('/onboarding'));
          })
        }
      />
    </Screen>
  );
}

function Row({
  title,
  desc,
  value,
  onChange,
  disabled,
}: {
  title: string;
  desc: string;
  value: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderColor: theme.palette.border }]}>
      <Switch value={value} onValueChange={onChange} disabled={disabled} />
      <View style={{ flex: 1 }}>
        <RTLText variant="label">{title}</RTLText>
        <RTLText variant="caption" color={theme.palette.inkSoft}>
          {desc}
        </RTLText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, marginVertical: 6 },
  divider: { height: 16 },
});
