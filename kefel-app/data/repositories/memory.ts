/**
 * In-memory repository.
 *
 * Used by unit/component tests and as a safe fallback. Mirrors the SQLite
 * implementation's semantics exactly so behaviour is identical in both.
 */
import type { Repository } from './types';
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

export class MemoryRepository implements Repository {
  private child: ChildProfile | null = null;
  private parent: ParentProfile | null = null;
  private mastery = new Map<string, MasteryState>(); // key: childId|factId
  private attempts: AttemptRecord[] = [];
  private sessions: SessionSummary[] = [];
  private rewards = new Map<string, RewardInventory>();
  private badges: Badge[] = [];
  private streaks = new Map<string, StreakState>();
  private goals = new Map<string, DailyGoal>(); // key: childId|dayKey

  private key(childId: string, factId: string) {
    return `${childId}|${factId}`;
  }

  async init() {
    /* nothing to initialise */
  }

  async getChild() {
    return this.child;
  }
  async saveChild(child: ChildProfile) {
    this.child = child;
  }
  async getParent() {
    return this.parent;
  }
  async saveParent(parent: ParentProfile) {
    this.parent = parent;
  }

  async getMastery(childId: string) {
    return [...this.mastery.values()].filter((m) => m.childId === childId);
  }
  async upsertMastery(state: MasteryState) {
    this.mastery.set(this.key(state.childId, state.factId), state);
  }
  async upsertManyMastery(states: MasteryState[]) {
    for (const s of states) await this.upsertMastery(s);
  }

  async appendAttempt(attempt: AttemptRecord) {
    this.attempts.push(attempt);
  }
  async getAttempts(childId: string, sinceMs = 0) {
    return this.attempts.filter((a) => a.childId === childId && a.at >= sinceMs);
  }

  async saveSession(summary: SessionSummary) {
    const i = this.sessions.findIndex((s) => s.id === summary.id);
    if (i >= 0) this.sessions[i] = summary;
    else this.sessions.push(summary);
  }
  async getSessions(childId: string, limit = 50) {
    return this.sessions
      .filter((s) => s.childId === childId)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  async getRewards(childId: string) {
    return this.rewards.get(childId) ?? null;
  }
  async saveRewards(inv: RewardInventory) {
    this.rewards.set(inv.childId, inv);
  }
  async getBadges(childId: string) {
    return this.badges.filter((b) => b.childId === childId);
  }
  async addBadge(badge: Badge) {
    if (!this.badges.some((b) => b.childId === badge.childId && b.id === badge.id)) {
      this.badges.push(badge);
    }
  }
  async getStreak(childId: string) {
    return this.streaks.get(childId) ?? null;
  }
  async saveStreak(streak: StreakState) {
    this.streaks.set(streak.childId, streak);
  }
  async getDailyGoal(childId: string, dayKey: string) {
    return this.goals.get(`${childId}|${dayKey}`) ?? null;
  }
  async saveDailyGoal(goal: DailyGoal) {
    this.goals.set(`${goal.childId}|${goal.dayKey}`, goal);
  }

  async deleteChildData(childId: string) {
    this.child = null;
    this.mastery.clear();
    this.attempts = this.attempts.filter((a) => a.childId !== childId);
    this.sessions = this.sessions.filter((s) => s.childId !== childId);
    this.rewards.delete(childId);
    this.badges = this.badges.filter((b) => b.childId !== childId);
    this.streaks.delete(childId);
  }
  async resetProgress(childId: string) {
    for (const k of [...this.mastery.keys()]) {
      if (k.startsWith(`${childId}|`)) this.mastery.delete(k);
    }
    this.attempts = this.attempts.filter((a) => a.childId !== childId);
    this.sessions = this.sessions.filter((s) => s.childId !== childId);
    this.badges = this.badges.filter((b) => b.childId !== childId);
    this.rewards.delete(childId);
  }
}
