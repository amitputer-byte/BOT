import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { RTLText } from './RTLText';
import { useTheme } from '@/theme/ThemeProvider';
import type { ChildProfile } from '@/data/schemas';

type AvatarId = ChildProfile['avatar'];

const GLYPH: Record<AvatarId, string> = {
  fox: '🦊',
  owl: '🦉',
  cat: '🐱',
  panda: '🐼',
  dragon: '🐲',
  robot: '🤖',
  bunny: '🐰',
  star: '🌟',
};

export const AVATAR_IDS = Object.keys(GLYPH) as AvatarId[];

interface AvatarProps {
  id: AvatarId;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
}

/** Friendly emoji avatar — no photos, no camera, fully offline. */
export function Avatar({ id, size = 64, selected = false, onPress }: AvatarProps) {
  const theme = useTheme();
  const body = (
    <View
      accessibilityLabel={`דמות ${id}`}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.palette.paperAlt,
          borderColor: selected ? theme.palette.sky : theme.palette.border,
          borderWidth: selected ? 4 : 2,
        },
      ]}
    >
      <RTLText style={{ fontSize: size * 0.5 }} center>
        {GLYPH[id]}
      </RTLText>
    </View>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={8}
    >
      {body}
    </Pressable>
  ) : (
    body
  );
}
