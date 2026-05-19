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
  /** IDs of achievements newly unlocked — cleared after reading */
  newAchievements: string[];
  clearNewAchievements: () => void;
  initProgress: (profileId: string) => void;
  getProgress: (profileId: string) => Progress;
  recordAnswer: (profileId: string, question: Question, correct: boolean, timeMs: number) => void;
  unlockAchievement: (profileId: string, achievementId: string) => void;
  updateAdventureProgress: (profileId: string, level: number, stars: 1 | 2 | 3) => void;
  checkAndUpdateStreak: (profileId: string) => void;
  getTableStars: (profileId: string, table: number) => 0 | 1 | 2 | 3;
  resetProgress: (profileId: string) => void;
  getMasteredTables: (profileId: string) => number[];
  getOverallAccuracy: (profileId: string) => number;
  getBestStreak: (profileId: string) => number;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},
      newAchievements: [],

      clearNewAchievements: () => set({ newAchievements: [] }),

      initProgress: (profileId: string) => {
        const { progress } = get();
        if (!progress[profileId]) {
          set((state) => ({
            progress: {
              ...state.progress,
              [profileId]: createEmptyProgress(profileId),
            },
          }));
        }
      },

      getProgress: (profileId: string): Progress => {
        const { progress, initProgress } = get();
        if (!progress[profileId]) {
          initProgress(profileId);
          return createEmptyProgress(profileId);
        }
        return progress[profileId];
      },

      recordAnswer: (profileId: string, question: Question, correct: boolean, _timeMs: number) => {
        set((state) => {
          const existing = state.progress[profileId] ?? createEmptyProgress(profileId);
          const key = `${question.multiplicand}x${question.multiplier}`;

          const tableEntry = existing.byTable[question.multiplicand] ?? {
            correct: 0,
            attempted: 0,
            bestStreak: 0,
          };

          // Track current streak per-table using a special key
          const currentStreak = existing.questionWeights[`_streak_${question.multiplicand}`] ?? 0;
          const newStreak = correct ? currentStreak + 1 : 0;
          const newBestStreak = Math.max(tableEntry.bestStreak, newStreak);

          const updatedTableEntry = {
            correct: tableEntry.correct + (correct ? 1 : 0),
            attempted: tableEntry.attempted + 1,
            bestStreak: newBestStreak,
          };

          // Question weight: higher = ask more often (bad at this question)
          const currentWeight = existing.questionWeights[key] ?? 1;
          const newWeight = correct
            ? Math.max(0.5, currentWeight * 0.85)   // decrease slightly on correct
            : Math.min(5, currentWeight * 1.5);      // increase on wrong

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
          const freshAchievements = checkAchievements(updatedProgress);
          if (freshAchievements.length > 0) {
            updatedProgress.achievements = [
              ...updatedProgress.achievements,
              ...freshAchievements,
            ];
          }

          return {
            progress: {
              ...state.progress,
              [profileId]: updatedProgress,
            },
            newAchievements: [
              ...state.newAchievements,
              ...freshAchievements,
            ],
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

          const freshAdventureAchievements = checkAchievements(updatedProgress);
          if (freshAdventureAchievements.length > 0) {
            updatedProgress.achievements = [
              ...updatedProgress.achievements,
              ...freshAdventureAchievements,
            ];
          }

          return {
            progress: {
              ...state.progress,
              [profileId]: updatedProgress,
            },
            newAchievements: [
              ...state.newAchievements,
              ...freshAdventureAchievements,
            ],
          };
        });
      },

      checkAndUpdateStreak: (profileId: string) => {
        set((state) => {
          const existing = state.progress[profileId] ?? createEmptyProgress(profileId);
          const today = getTodayDateString();

          // Same day: no-op
          if (existing.lastPlayedDate === today) return state;

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          const newStreak =
            existing.lastPlayedDate === yesterdayStr
              ? existing.dailyStreak + 1  // consecutive day
              : 1;                         // missed a day: reset

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

      getTableStars: (profileId: string, table: number): 0 | 1 | 2 | 3 => {
        const { progress } = get();
        const p = progress[profileId];
        if (!p) return 0;
        const entry = p.byTable[table];
        if (!entry || entry.attempted === 0) return 0;
        const accuracy = entry.correct / entry.attempted;
        if (accuracy >= 0.9) return 3;
        if (accuracy >= 0.7) return 2;
        if (accuracy >= 0.5) return 1;
        return 0;
      },

      resetProgress: (profileId: string) => {
        set((state) => ({
          progress: {
            ...state.progress,
            [profileId]: createEmptyProgress(profileId),
          },
        }));
      },

      getMasteredTables: (profileId: string): number[] => {
        const { progress } = get();
        const p = progress[profileId];
        if (!p) return [];
        return [2, 3, 4, 5, 6, 7, 8, 9, 10].filter((table) => {
          const t = p.byTable[table];
          return t && t.attempted >= 10 && t.correct / t.attempted >= 0.9;
        });
      },

      getOverallAccuracy: (profileId: string): number => {
        const { progress } = get();
        const p = progress[profileId];
        if (!p || p.totalAttempted === 0) return 0;
        return Math.round((p.totalCorrect / p.totalAttempted) * 100);
      },

      getBestStreak: (profileId: string): number => {
        const { progress } = get();
        const p = progress[profileId];
        if (!p) return 0;
        return Object.values(p.byTable).reduce(
          (max, t) => Math.max(max, t.bestStreak),
          0,
        );
      },
    }),
    {
      name: 'kfali-progress',
    }
  )
);
