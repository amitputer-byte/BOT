import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, RTLText } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { PRIVACY_SECTIONS } from '@/content/he/privacy';

/** Plain-language Hebrew privacy summary, reachable from the adult area. */
export default function Privacy() {
  const theme = useTheme();
  return (
    <Screen variant="adult" scroll>
      <RTLText variant="title">{t('settings.privacyPolicy')}</RTLText>
      {PRIVACY_SECTIONS.map((s) => (
        <View key={s.title} style={[styles.section, { borderColor: theme.palette.border }]}>
          <RTLText variant="heading" color={theme.palette.sky}>
            {s.title}
          </RTLText>
          <RTLText variant="body">{s.body}</RTLText>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8, marginVertical: 8 },
});
