import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RTLText } from './RTLText';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { ltr } from '@/lib/rtl';

/** The single soft currency display. Star glyph + number, accessible label. */
export function StarCount({ stars }: { stars: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={t('a11y.starCount', { count: stars })}
      style={[styles.pill, { backgroundColor: theme.palette.sun, borderRadius: theme.radius.pill }]}
    >
      <RTLText variant="heading" color={theme.palette.ink}>
        ⭐ {ltr(stars)}
      </RTLText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 6, alignSelf: 'flex-start' },
});
