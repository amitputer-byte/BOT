import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { RTLText } from './RTLText';
import { Button } from './Button';
import { StarCount } from './StarCount';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { getFlags } from '@/services/remoteConfig';

interface CelebrationProps {
  stars: number;
  badgeLabel?: string | null;
  onDone: () => void;
}

/**
 * Short, SKIPPABLE celebration. Honors reduced-motion (static) and the
 * celebrationIntensity experiment flag (calm/standard/festive). Never flashes.
 */
export function Celebration({ stars, badgeLabel, onDone }: CelebrationProps) {
  const theme = useTheme();
  const intensity = getFlags().celebrationIntensity;
  const glyph = intensity === 'calm' ? '🌟' : intensity === 'festive' ? '🎉✨🎊' : '🎉';

  // Auto-dismiss after a short beat unless the user skips first.
  useEffect(() => {
    const ms = theme.reducedMotion ? 600 : theme.motion.celebrate;
    const timer = setTimeout(onDone, ms + 1500);
    return () => clearTimeout(timer);
  }, [onDone, theme.reducedMotion, theme.motion.celebrate]);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.palette.paper }]}>
      <RTLText variant="display" center>
        {glyph}
      </RTLText>
      <RTLText variant="title" center color={theme.palette.grass}>
        {t('reward.sessionDone')}
      </RTLText>
      <StarCount stars={stars} />
      {badgeLabel ? (
        <RTLText variant="heading" center color={theme.palette.plum}>
          🏅 {t('reward.badgeEarned', { badge: badgeLabel })}
        </RTLText>
      ) : null}
      <Button label={t('common.done')} tone="success" big onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, padding: 24 },
});
