/**
 * Persistence boundary. The store talks only to this interface, so the SQLite
 * engine, the in-memory test double, and a future sync adapter are all
 * swappable without touching app logic.
 */
import type {
  ChildProfile,
  ParentProfile,
  MasteryState,
  AttemptRecord,
  SessionSummary,
  RewardInventory,
  Badge,
  StreakState,
  DailyGoal,
} from '@/data/schemas';

export interface Repository {
  init(): Promise<void>;

  // Profiles
  getChild(): Promise<ChildProfile | null>;
  saveChild(child: ChildProfile): Promise<void>;
  getParent(): Promise<ParentProfile | null>;
  saveParent(parent: ParentProfile): Promise<void>;

  // Mastery (per fact)
  getMastery(childId: string): Promise<MasteryState[]>;
  upsertMastery(state: MasteryState): Promise<void>;
  upsertManyMastery(states: MasteryState[]): Promise<void>;

  // Attempts (append-only log)
  appendAttempt(attempt: AttemptRecord): Promise<void>;
  getAttempts(childId: string, sinceMs?: number): Promise<AttemptRecord[]>;

  // Sessions
  saveSession(summary: SessionSummary): Promise<void>;
  getSessions(childId: string, limit?: number): Promise<SessionSummary[]>;

  // Rewards / streak / goals
  getRewards(childId: string): Promise<RewardInventory | null>;
  saveRewards(inv: RewardInventory): Promise<void>;
  getBadges(childId: string): Promise<Badge[]>;
  addBadge(badge: Badge): Promise<void>;
  getStreak(childId: string): Promise<StreakState | null>;
  saveStreak(streak: StreakState): Promise<void>;
  getDailyGoal(childId: string, dayKey: string): Promise<DailyGoal | null>;
  saveDailyGoal(goal: DailyGoal): Promise<void>;

  // Privacy controls
  deleteChildData(childId: string): Promise<void>;
  resetProgress(childId: string): Promise<void>;
}
