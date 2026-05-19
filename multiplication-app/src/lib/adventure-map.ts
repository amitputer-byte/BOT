import type { AdventureProgress } from '../types';

export interface WorldConfig {
  id: number;
  name: string;
  emoji: string;
  bgColor: string;
  levels: LevelConfig[];
}

export interface LevelConfig {
  id: number;
  worldId: number;
  name: string;
  tables: number[];
  questionCount: number;
  isBoss: boolean;
  requiredCorrectStreak?: number;
}

export const WORLDS: WorldConfig[] = [
  {
    id: 1,
    name: 'יער הכפלים',
    emoji: '🌲',
    bgColor: 'bg-green-100',
    levels: [
      { id: 1, worldId: 1, name: 'שביל הבוקר', tables: [2], questionCount: 5, isBoss: false },
      { id: 2, worldId: 1, name: 'הפינה הסודית', tables: [2, 3], questionCount: 6, isBoss: false },
      { id: 3, worldId: 1, name: 'שומר היער', tables: [2, 3], questionCount: 8, isBoss: true, requiredCorrectStreak: 5 },
    ],
  },
  {
    id: 2,
    name: 'חוף המכפלות',
    emoji: '🏖️',
    bgColor: 'bg-blue-100',
    levels: [
      { id: 4, worldId: 2, name: 'גלי הבוקר', tables: [4], questionCount: 5, isBoss: false },
      { id: 5, worldId: 2, name: 'אוצר הצדפות', tables: [4, 5], questionCount: 6, isBoss: false },
      { id: 6, worldId: 2, name: 'הדג הגדול', tables: [4, 5], questionCount: 8, isBoss: true, requiredCorrectStreak: 5 },
    ],
  },
  {
    id: 3,
    name: 'מערת הניבים',
    emoji: '🦇',
    bgColor: 'bg-purple-100',
    levels: [
      { id: 7, worldId: 3, name: 'כניסה לחושך', tables: [6], questionCount: 5, isBoss: false },
      { id: 8, worldId: 3, name: 'הפטריות הזוהרות', tables: [6, 7], questionCount: 7, isBoss: false },
      { id: 9, worldId: 3, name: 'עטלף הניבים', tables: [6, 7], questionCount: 8, isBoss: true, requiredCorrectStreak: 5 },
    ],
  },
  {
    id: 4,
    name: 'הר השמש',
    emoji: '🌋',
    bgColor: 'bg-orange-100',
    levels: [
      { id: 10, worldId: 4, name: 'מדרון הלהבות', tables: [8], questionCount: 6, isBoss: false },
      { id: 11, worldId: 4, name: 'מרומי ההר', tables: [8, 9], questionCount: 7, isBoss: false },
      { id: 12, worldId: 4, name: 'ענק האש', tables: [8, 9], questionCount: 8, isBoss: true, requiredCorrectStreak: 5 },
    ],
  },
  {
    id: 5,
    name: 'טירת האלוף',
    emoji: '🏰',
    bgColor: 'bg-yellow-100',
    levels: [
      { id: 13, worldId: 5, name: 'שערי הטירה', tables: [10, 2, 3], questionCount: 6, isBoss: false },
      { id: 14, worldId: 5, name: 'אולם הניצחון', tables: [4, 5, 6, 7, 8, 9, 10], questionCount: 7, isBoss: false },
      { id: 15, worldId: 5, name: 'מלך הכפלים', tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], questionCount: 10, isBoss: true, requiredCorrectStreak: 5 },
    ],
  },
];

export const ALL_LEVELS: LevelConfig[] = WORLDS.flatMap((w) => w.levels);

export function getLevelConfig(levelId: number): LevelConfig {
  const level = ALL_LEVELS.find((l) => l.id === levelId);
  if (!level) throw new Error(`Level ${levelId} not found`);
  return level;
}

export function getWorldForLevel(levelId: number): WorldConfig {
  const world = WORLDS.find((w) => w.levels.some((l) => l.id === levelId));
  if (!world) throw new Error(`World for level ${levelId} not found`);
  return world;
}

export function isLevelUnlocked(levelId: number, adventureProgress: AdventureProgress): boolean {
  // Level 1 always unlocked
  if (levelId === 1) return true;
  // A level is unlocked if the previous level has been completed (stars > 0)
  // OR if currentLevel >= levelId - 1 (already passed it)
  const prevLevelStars = adventureProgress.stars[levelId - 1] ?? 0;
  return prevLevelStars > 0 || adventureProgress.currentLevel >= levelId;
}

export function getNextLevel(currentLevelId: number): LevelConfig | null {
  const nextId = currentLevelId + 1;
  return ALL_LEVELS.find((l) => l.id === nextId) ?? null;
}
