import React, { useMemo, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { Screen, RTLText, Button } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/services/i18n';
import { makeGateChallenge, verifyGate } from '@/services/parentGate';
import { makeRng } from '@/lib/random';

/**
 * Parent area layout. A math challenge gate stands between the child area and
 * everything adult (dashboard, privacy, settings). The gate state lives here so
 * it re-locks whenever the parent leaves and re-enters the section.
 */
export default function ParentLayout() {
  const theme = useTheme();
  const challenge = useMemo(() => makeGateChallenge(makeRng(Date.now())), []);
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <Slot />;

  return (
    <Screen variant="adult">
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
            if (verifyGate(challenge, Number(value))) setUnlocked(true);
            else setError(true);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  input: { borderWidth: 2, borderRadius: 16, fontSize: 28, padding: 16, minHeight: 64 },
});
