/**
 * SQLite-backed repository (expo-sqlite). Row<->domain mapping is explicit so
 * the boolean/JSON column conventions stay in one place.
 */
import type { Repository } from './types';
import { openDb, type DB } from '@/data/db';
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

const b = (v: boolean) => (v ? 1 : 0);
const fromB = (v: number | null) => v === 1;
const j = (v: unknown) => JSON.stringify(v ?? null);
const fromJ = <T>(v: string | null, fallback: T): T => (v ? (JSON.parse(v) as T) : fallback);

export class SqliteRepository implements Repository {
  private db!: DB;

  async init() {
    this.db = await openDb();
  }

  async getChild() {
    const r = await this.db.getFirstAsync<Record<string, unknown>>('SELECT * FROM child_profile LIMIT 1');
    if (!r) return null;
    return {
      id: r.id as string,
      nickname: r.nickname as string,
      avatar: r.avatar as ChildProfile['avatar'],
      createdAt: r.createdAt as number,
      audioInstructions: fromB(r.audioInstructions as number),
      reducedMotion: fromB(r.reducedMotion as number),
      dailyGoalActivities: r.dailyGoalActivities as number,
    };
  }
  async saveChild(c: ChildProfile) {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO child_profile
       (id,nickname,avatar,createdAt,audioInstructions,reducedMotion,dailyGoalActivities)
       VALUES (?,?,?,?,?,?,?)`,
      [c.id, c.nickname, c.avatar, c.createdAt, b(c.audioInstructions), b(c.reducedMotion), c.dailyGoalActivities],
    );
  }

  async getParent() {
    const r = await this.db.getFirstAsync<Record<string, unknown>>('SELECT * FROM parent_profile LIMIT 1');
    if (!r) return null;
    return {
      id: r.id as string,
      authUid: (r.authUid as string) ?? null,
      email: (r.email as string) ?? null,
      consent: {
        privacyAcceptedAt: (r.privacyAcceptedAt as number) ?? null,
        analyticsEnabled: fromB(r.analyticsEnabled as number),
        syncEnabled: fromB(r.syncEnabled as number),
      },
      createdAt: r.createdAt as number,
    };
  }
  async saveParent(p: ParentProfile) {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO parent_profile
       (id,authUid,email,privacyAcceptedAt,analyticsEnabled,syncEnabled,createdAt)
       VALUES (?,?,?,?,?,?,?)`,
      [p.id, p.authUid, p.email, p.consent.privacyAcceptedAt, b(p.consent.analyticsEnabled), b(p.consent.syncEnabled), p.createdAt],
    );
  }

  async getMastery(childId: string) {
    const rows = await this.db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM mastery WHERE childId = ?',
      [childId],
    );
    return rows.map((r) => ({
      childId: r.childId as string,
      factId: r.factId as string,
      status: r.status as MasteryState['status'],
      attempts: r.attempts as number,
      correct: r.correct as number,
      independentCorrect: r.independentCorrect as number,
      hintCount: r.hintCount as number,
      medianLatencyMs: r.medianLatencyMs as number,
      transferSuccess: r.transferSuccess as number,
      lapseCount: r.lapseCount as number,
      consecutiveIndependent: r.consecutiveIndependent as number,
      consecutiveErrors: r.consecutiveErrors as number,
      intervalIndex: r.intervalIndex as number,
      lastSeenAt: (r.lastSeenAt as number) ?? null,
      nextDueAt: (r.nextDueAt as number) ?? null,
      recentLatenciesMs: fromJ<number[]>(r.recentLatenciesMs as string, []),
    }));
  }
  async upsertMastery(m: MasteryState) {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO mastery
       (childId,factId,status,attempts,correct,independentCorrect,hintCount,medianLatencyMs,
        transferSuccess,lapseCount,consecutiveIndependent,consecutiveErrors,intervalIndex,
        lastSeenAt,nextDueAt,recentLatenciesMs)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [m.childId, m.factId, m.status, m.attempts, m.correct, m.independentCorrect, m.hintCount,
        m.medianLatencyMs, m.transferSuccess, m.lapseCount, m.consecutiveIndependent,
        m.consecutiveErrors, m.intervalIndex, m.lastSeenAt, m.nextDueAt, j(m.recentLatenciesMs)],
    );
  }
  async upsertManyMastery(states: MasteryState[]) {
    await this.db.withTransactionAsync(async () => {
      for (const s of states) await this.upsertMastery(s);
    });
  }

  async appendAttempt(a: AttemptRecord) {
    await this.db.runAsync(
      `INSERT INTO attempts
       (id,childId,factId,shownA,shownB,outcome,usedHint,scaffolded,isTransferItem,latencyMs,sessionId,activity,at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [a.id, a.childId, a.factId, a.shownA, a.shownB, a.outcome, b(a.usedHint), b(a.scaffolded),
        b(a.isTransferItem), a.latencyMs, a.sessionId, a.activity, a.at],
    );
  }
  async getAttempts(childId: string, sinceMs = 0) {
    const rows = await this.db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM attempts WHERE childId = ? AND at >= ? ORDER BY at ASC',
      [childId, sinceMs],
    );
    return rows.map((r) => ({
      id: r.id as string,
      childId: r.childId as string,
      factId: r.factId as string,
      shownA: r.shownA as number,
      shownB: r.shownB as number,
      outcome: r.outcome as AttemptRecord['outcome'],
      usedHint: fromB(r.usedHint as number),
      scaffolded: fromB(r.scaffolded as number),
      isTransferItem: fromB(r.isTransferItem as number),
      latencyMs: r.latencyMs as number,
      sessionId: r.sessionId as string,
      activity: r.activity as string,
      at: r.at as number,
    }));
  }

  async saveSession(s: SessionSummary) {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO sessions
       (id,childId,startedAt,endedAt,activities,itemsPlanned,itemsAnswered,correct,hintsUsed,starsEarned,completed,quitEarly,factsMastered)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [s.id, s.childId, s.startedAt, s.endedAt, j(s.activities), s.itemsPlanned, s.itemsAnswered,
        s.correct, s.hintsUsed, s.starsEarned, b(s.completed), b(s.quitEarly), j(s.factsMastered)],
    );
  }
  async getSessions(childId: string, limit = 50) {
    const rows = await this.db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM sessions WHERE childId = ? ORDER BY startedAt DESC LIMIT ?',
      [childId, limit],
    );
    return rows.map((r) => ({
      id: r.id as string,
      childId: r.childId as string,
      startedAt: r.startedAt as number,
      endedAt: (r.endedAt as number) ?? null,
      activities: fromJ<string[]>(r.activities as string, []),
      itemsPlanned: r.itemsPlanned as number,
      itemsAnswered: r.itemsAnswered as number,
      correct: r.correct as number,
      hintsUsed: r.hintsUsed as number,
      starsEarned: r.starsEarned as number,
      completed: fromB(r.completed as number),
      quitEarly: fromB(r.quitEarly as number),
      factsMastered: fromJ<string[]>(r.factsMastered as string, []),
    }));
  }

  async getRewards(childId: string) {
    const r = await this.db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM rewards WHERE childId = ?',
      [childId],
    );
    if (!r) return null;
    return {
      childId: r.childId as string,
      stars: r.stars as number,
      unlockedCosmetics: fromJ<string[]>(r.unlockedCosmetics as string, []),
      equippedCosmetics: fromJ<Record<string, string>>(r.equippedCosmetics as string, {}),
    };
  }
  async saveRewards(inv: RewardInventory) {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO rewards (childId,stars,unlockedCosmetics,equippedCosmetics) VALUES (?,?,?,?)',
      [inv.childId, inv.stars, j(inv.unlockedCosmetics), j(inv.equippedCosmetics)],
    );
  }
  async getBadges(childId: string) {
    const rows = await this.db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM badges WHERE childId = ?',
      [childId],
    );
    return rows.map((r) => ({ id: r.id as string, childId: r.childId as string, earnedAt: r.earnedAt as number }));
  }
  async addBadge(badge: Badge) {
    await this.db.runAsync('INSERT OR IGNORE INTO badges (childId,id,earnedAt) VALUES (?,?,?)', [
      badge.childId,
      badge.id,
      badge.earnedAt,
    ]);
  }
  async getStreak(childId: string) {
    const r = await this.db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM streak WHERE childId = ?',
      [childId],
    );
    if (!r) return null;
    return {
      childId: r.childId as string,
      weeklyCount: r.weeklyCount as number,
      weekKey: r.weekKey as string,
      shieldAvailable: fromB(r.shieldAvailable as number),
      lastActiveDayKey: (r.lastActiveDayKey as string) ?? null,
      longestWeeklyCount: r.longestWeeklyCount as number,
    };
  }
  async saveStreak(s: StreakState) {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO streak (childId,weeklyCount,weekKey,shieldAvailable,lastActiveDayKey,longestWeeklyCount) VALUES (?,?,?,?,?,?)',
      [s.childId, s.weeklyCount, s.weekKey, b(s.shieldAvailable), s.lastActiveDayKey, s.longestWeeklyCount],
    );
  }
  async getDailyGoal(childId: string, dayKey: string) {
    const r = await this.db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM daily_goal WHERE childId = ? AND dayKey = ?',
      [childId, dayKey],
    );
    if (!r) return null;
    return {
      childId: r.childId as string,
      dayKey: r.dayKey as string,
      targetActivities: r.targetActivities as number,
      completedActivities: r.completedActivities as number,
      met: fromB(r.met as number),
    };
  }
  async saveDailyGoal(g: DailyGoal) {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO daily_goal (childId,dayKey,targetActivities,completedActivities,met) VALUES (?,?,?,?,?)',
      [g.childId, g.dayKey, g.targetActivities, g.completedActivities, b(g.met)],
    );
  }

  async deleteChildData(childId: string) {
    await this.db.withTransactionAsync(async () => {
      for (const table of ['child_profile', 'mastery', 'attempts', 'sessions', 'rewards', 'badges', 'streak', 'daily_goal']) {
        const col = table === 'child_profile' ? 'id' : 'childId';
        await this.db.runAsync(`DELETE FROM ${table} WHERE ${col} = ?`, [childId]);
      }
    });
  }
  async resetProgress(childId: string) {
    await this.db.withTransactionAsync(async () => {
      for (const table of ['mastery', 'attempts', 'sessions', 'rewards', 'badges']) {
        await this.db.runAsync(`DELETE FROM ${table} WHERE childId = ?`, [childId]);
      }
    });
  }
}
