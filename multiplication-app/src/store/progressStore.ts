import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Progress, Question } from '../types';
import { checkAchievements } from '../lib/achievements';

function createEmptyProgress(profileId: string): Progress {
  return {
    profileId,
    totalCorrect: 0,
    totalAttempted: 0,
    byTable: {},
    achievements: [],
    adventureProgress: { currentLevel: 0, stars: {} },
    dailyStreak: 0,
    lastPlayedDate: '',
    questionWeights: {},
  };
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

interface ProgressStore {
  progress: Record<string, Progress>;
  getProgress: (profileId: string) => Progress;
  recordAnswer: (profileId: string, question: Question, correct: boolean, timeMs: number) => void;
  unlockAchievement: (profileId: string, achievementId: string) => void;
  updateAdventureProgress: (profileId: string, level: number, stars: 1 | 2 | 3) => void;
  checkAndUpdateStreak: (profileId: string) => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      getProgress: (profileId: string): Progress => {
        const { progress } = get();
        return progress[profileId] ?? createEmptyProgress(profileId);
      },

      recordAnswer: (profileId: string, question: Question, correct: boolean, _timeMs: number) => {
        set((state) => {
          const existing = state.progress[profileId] ?? createEmptyProgress(profileId);
          const key = `${question.multiplicand}x${question.multiplier}`;

          // Update table progress
          const tableEntry = existing.byTable[question.multiplicand] ?? {
            correct: 0,
            attempted: 0,
            bestStreak: 0,
          };

          // Track current streak per question key in weights map
          // Use questionWeights to also store current streak per-table prefix
          const currentStreak = (existing.questionWeights[`_streak_${question.multiplicand}`] ?? 0);
          const newStreak = correct ? currentStreak + 1 : 0;
          const newBestStreak = Math.max(tableEntry.bestStreak, newStreak);

          const updatedTableEntry = {
            correct: tableEntry.correct + (correct ? 1 : 0),
            attempted: tableEntry.attempted + 1,
            bestStreak: newBestStreak,
          };

          // Update question weight: higher weight = ask more often (for mistakes)
          const currentWeight = existing.questionWeights[key] ?? 1;
          const newWeight = correct
            ? Math.max(0.5, currentWeight * 0.8)
            : Math.min(5, currentWeight * 1.5);

          const updatedProgress: Progress = {
            ...existing,
            totalCorrect: existing.totalCorrect + (correct ? 1 : 0),
            totalAttempted: existing.totalAttempted + 1,
            byTable: {
              ...existing.byTable,
              [question.multiplicand]: updatedTableEntry,
            },
            questionWeights: {
              ...existing.questionWeights,
              [key]: newWeight,
              [`_streak_${question.multiplicand}`]: newStreak,
            },
          };

          // Check for new achievements
          const newAchievements = checkAchievements(updatedProgress);
          if (newAchievements.length > 0) {
            updatedProgress.achievements = [
              ...updatedProgress.achievements,
              ...newAchievements,
            ];
          }

          return {
            progress: {
              ...state.progress,
              [profileId]: updatedProgress,
            },
          };
        });
      },

      unlockAchievement: (profileId: string, achievementId: string) => {
        set((state) => {
          const existing = state.progress[profileId] ?? createEmptyProgress(profileId);
          if (existing.achievements.includes(achievementId)) return state;
          return {
            progress: {
              ...state.progress,
              [profileId]: {
                ...existing,
                achievements: [...existing.achievements, achievementId],
              },
            },
          };
        });
      },

      updateAdventureProgress: (profileId: string, level: number, stars: 1 | 2 | 3) => {
        set((state) => {
          const existing = state.progress[profileId] ?? createEmptyProgress(profileId);
          const currentStars = existing.adventureProgress.stars[level] ?? 0;
          const bestStars = Math.max(currentStars, stars) as 1 | 2 | 3;

          const updatedProgress: Progress = {
            ...existing,
            adventureProgress: {
              currentLevel: Math.max(existing.adventureProgress.currentLevel, level),
              stars: {
                ...existing.adventureProgress.stars,
                [level]: bestStars,
              },
            },
          };

          const newAchievements = checkAchievements(updatedProgress);
          if (newAchievements.length > 0) {
            updatedProgress.achievements = [
              ...updatedProgress.achievements,
              ...newAchievements,
            ];
          }

          return {
            progress: {
              ...state.progress,
              [profileId]: updatedProgress,
            },
          };
        });
      },

      checkAndUpdateStreak: (profileId: string) => {
        set((state) => {
          const existing = state.progress[profileId] ?? createEmptyProgress(profileId);
          const today = getTodayDateString();

          if (existing.lastPlayedDate === today) return state;

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          const newStreak =
            existing.lastPlayedDate === yesterdayStr
              ? existing.dailyStreak + 1
              : 1;

          return {
            progress: {
              ...state.progress,
              [profileId]: {
                ...existing,
                dailyStreak: newStreak,
                lastPlayedDate: today,
              },
            },
          };
        });
      },
    }),
    {
      name: 'kfali-progress',
    }
  )
);
