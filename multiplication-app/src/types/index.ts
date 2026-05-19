export type AvatarId = 'fox' | 'cat' | 'bear' | 'rabbit' | 'owl' | 'penguin' | 'dragon' | 'unicorn';

export interface Profile {
  id: string;
  name: string;
  avatar: AvatarId;
  createdAt: number;
}

export interface TableProgress {
  correct: number;
  attempted: number;
  bestStreak: number;
}

export interface AdventureProgress {
  currentLevel: number;
  stars: Record<number, 1 | 2 | 3>;
}

export interface Progress {
  profileId: string;
  totalCorrect: number;
  totalAttempted: number;
  byTable: Record<number, TableProgress>;
  achievements: string[];
  adventureProgress: AdventureProgress;
  dailyStreak: number;
  lastPlayedDate: string;
  questionWeights: Record<string, number>;
}

export interface Settings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Question {
  multiplicand: number;
  multiplier: number;
  correctAnswer: number;
  options: number[];
}
