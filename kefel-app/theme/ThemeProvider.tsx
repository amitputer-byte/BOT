import React, { createContext, useContext, useMemo } from 'react';
import { useReducedMotionPref } from '@/lib/a11y';
import { palette, spacing, radius, typography, motion, TAP_TARGET } from './tokens';

export interface Theme {
  palette: typeof palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  motion: typeof motion;
  tapTarget: number;
  /** True when the OS asked us to minimize motion; celebrations become static. */
  reducedMotion: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotionPref();
  const value = useMemo<Theme>(
    () => ({ palette, spacing, radius, typography, motion, tapTarget: TAP_TARGET, reducedMotion }),
    [reducedMotion],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
