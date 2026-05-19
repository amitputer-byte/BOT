import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '../types';

interface SettingsStore extends Settings {
  toggleSound: () => void;
  toggleMusic: () => void;
  setVolume: (v: number) => void;
  setDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.7,
      difficulty: 'medium' as const,

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      setVolume: (v: number) => set({ volume: Math.max(0, Math.min(1, v)) }),
      setDifficulty: (d: 'easy' | 'medium' | 'hard') => set({ difficulty: d }),
    }),
    {
      name: 'kfali-settings',
    }
  )
);
