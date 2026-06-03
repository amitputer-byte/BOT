/**
 * Global app store (Zustand).
 *
 * Orchestrates the pure engine, the repository, rewards, and analytics. The
 * repository and analytics sink are injected via `bootstrap`, so the store has
 * no hard Expo dependency and can be driven in tests with the memory repo.
 */
import { create } from 'zustand';
import type {
  ChildProfile,
  ParentProfile,
  MasteryState,
  SessionSummary,
  RewardInventory,
  StreakState,
} from '@/data/schemas';
import type { Repository } from '@/data/repositories/types';
import type { Analytics } from '@/services/analytics';
import {
  buildSession,
  type SessionItem,
  type BuildConfig,
} from '@/features/engine/sessionBuilder';
import { factById } from '@/features/engine/facts';
import { processAnswer, type AnswerInput } from '@/features/lesson/processAnswer';
import { updateStreak } from '@/features/rewards/rewards';
import { STAR_AWARDS, FAMILY_BADGE } from '@/content/rewards';
import { getFlags } from '@/services/remoteConfig';
import { makeRng, deriveSeed } from '@/lib/random';
import { dayKey } from '@/lib/time';

let uid = 0;
const newId = (prefix: string) => `${prefix}_${Date.now()}_${uid++}`;

export type SessionKind = 'lesson' | 'review';

interface SessionRuntime {
  id: string;
  kind: SessionKind;
  items: SessionItem[];
  index: number;
  correct: number;
  hintsUsed: number;
  starsEarned: number;
  factsMastered: string[];
  startedAt: number;
  /** per-item flags for the current question */
  currentHintUsed: boolean;
  currentScaffolded: boolean;
  questionStartedAt: number;
}

export interface AppState {
  ready: boolean;
  repo: Repository | null;
  analytics: Analytics | null;
  child: ChildProfile | null;
  parent: ParentProfile | null;
  mastery: Map<string, MasteryState>;
  rewards: RewardInventory | null;
  streak: StreakState | null;
  session: SessionRuntime | null;
  lastBadge: string | null;

  bootstrap: (repo: Repository, analytics: Analytics) => Promise<void>;
  completeOnboarding: (child: ChildProfile, parent: ParentProfile) => Promise<void>;
  startSession: (kind: SessionKind) => void;
  useHint: () => void;
  stepDownToScaffold: () => void;
  answer: (input: Omit<AnswerInput, 'scaffolded' | 'usedHint'>) => Promise<void>;
  endSession: (quitEarly?: boolean) => Promise<void>;
  currentItem: () => SessionItem | null;

  // privacy controls
  setAnalyticsEnabled: (enabled: boolean) => Promise<void>;
  setSyncEnabled: (enabled: boolean) => Promise<void>;
  deleteChildData: () => Promise<void>;
  resetProgress: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  repo: null,
  analytics: null,
  child: null,
  parent: null,
  mastery: new Map(),
  rewards: null,
  streak: null,
  session: null,
  lastBadge: null,

  async bootstrap(repo, analytics) {
    await repo.init();
    const child = await repo.getChild();
    const parent = await repo.getParent();
    const mastery = new Map<string, MasteryState>();
    if (child) {
      for (const m of await repo.getMastery(child.id)) mastery.set(m.factId, m);
    }
    const rewards = child ? await repo.getRewards(child.id) : null;
    const streak = child ? await repo.getStreak(child.id) : null;
    analytics.setEnabled(parent?.consent.analyticsEnabled ?? false);
    analytics.setChildId(child?.id ?? null);
    analytics.track('app_open', { coldStart: true });
    set({ ready: true, repo, analytics, child, parent, mastery, rewards, streak });
  },

  async completeOnboarding(child, parent) {
    const { repo } = get();
    if (!repo) throw new Error('store not bootstrapped');
    await repo.saveChild(child);
    await repo.saveParent(parent);
    const rewards: RewardInventory = {
      childId: child.id,
      stars: 0,
      unlockedCosmetics: [],
      equippedCosmetics: {},
    };
    await repo.saveRewards(rewards);
    set({ child, parent, rewards });
    get().analytics?.track('onboarding_completed', {
      durationMs: 0,
      avatar: child.avatar,
    });
  },

  startSession(kind) {
    const { mastery, child } = get();
    if (!child) return;
    const flags = getFlags();
    const id = newId('sess');
    const now = Date.now();
    const config: BuildConfig = { targetItems: flags.dailyPathLength };
    const rng = makeRng(deriveSeed(now, id));
    const items = buildSession(mastery, now, rng, config);
    const session: SessionRuntime = {
      id,
      kind,
      items,
      index: 0,
      correct: 0,
      hintsUsed: 0,
      starsEarned: 0,
      factsMastered: [],
      startedAt: now,
      currentHintUsed: false,
      currentScaffolded: false,
      questionStartedAt: now,
    };
    set({ session });
    const ev = kind === 'review' ? 'review_started' : 'lesson_started';
    if (ev === 'review_started') {
      get().analytics?.track('review_started', { sessionId: id, dueCount: items.length });
    } else {
      get().analytics?.track('lesson_started', { sessionId: id, itemsPlanned: items.length });
    }
  },

  currentItem() {
    const s = get().session;
    if (!s || s.index >= s.items.length) return null;
    return s.items[s.index] ?? null;
  },

  useHint() {
    const s = get().session;
    if (!s) return;
    set({ session: { ...s, currentHintUsed: true, hintsUsed: s.hintsUsed + 1 } });
    const item = get().currentItem();
    const card = item && factById(`${Math.min(item.a, item.b)}x${Math.max(item.a, item.b)}`);
    if (card) {
      get().analytics?.track('hint_used', {
        factId: card.id,
        family: card.family,
        strategy: card.strategies[card.strategies.length - 1] ?? 'array',
      });
    }
  },

  stepDownToScaffold() {
    const s = get().session;
    if (!s) return;
    set({ session: { ...s, currentScaffolded: true } });
  },

  async answer(input) {
    const { session, repo, child, mastery, rewards, analytics } = get();
    if (!session || !repo || !child) return;
    const item = session.items[session.index];
    if (!item) return;

    const now = Date.now();
    const result = processAnswer(
      mastery.get(`${Math.min(item.a, item.b)}x${Math.max(item.a, item.b)}`),
      item,
      {
        ...input,
        usedHint: session.currentHintUsed,
        scaffolded: session.currentScaffolded,
        latencyMs: now - session.questionStartedAt,
      },
      { childId: child.id, sessionId: session.id, now, newAttemptId: newId('att') },
    );

    // Persist attempt + mastery.
    await repo.appendAttempt(result.attempt);
    await repo.upsertMastery(result.nextMastery);
    const nextMastery = new Map(mastery);
    nextMastery.set(result.nextMastery.factId, result.nextMastery);

    // Rewards.
    let stars = (rewards?.stars ?? 0) + result.starsEarned;
    const factsMastered = [...session.factsMastered];
    const card = factById(result.nextMastery.factId);
    if (result.grade.events.mastered && card) {
      stars += STAR_AWARDS.factMastered;
      factsMastered.push(card.id);
      analytics?.track('fact_mastered', {
        factId: card.id,
        family: card.family,
        attempts: result.nextMastery.attempts,
      });
    }
    if (result.grade.events.lapsed && card) {
      analytics?.track('lapse_detected', { factId: card.id, from: 'strong', to: result.nextMastery.status });
    }
    const nextRewards: RewardInventory = {
      childId: child.id,
      stars,
      unlockedCosmetics: rewards?.unlockedCosmetics ?? [],
      equippedCosmetics: rewards?.equippedCosmetics ?? {},
    };
    await repo.saveRewards(nextRewards);

    analytics?.track('fact_answered', {
      factId: result.attempt.factId,
      family: card?.family ?? 'x0',
      correct: input.correct,
      usedHint: session.currentHintUsed,
      scaffolded: session.currentScaffolded,
      isTransfer: item.kind === 'transfer',
      latencyMs: result.attempt.latencyMs,
      activity: result.attempt.activity,
    });

    // Award family badge if the whole family is now mastered.
    await maybeAwardFamilyBadge(get, set, nextMastery, card?.family);

    // Advance.
    const nextIndex = session.index + 1;
    set({
      mastery: nextMastery,
      rewards: nextRewards,
      session: {
        ...session,
        index: nextIndex,
        correct: session.correct + (input.correct ? 1 : 0),
        starsEarned: session.starsEarned + result.starsEarned,
        factsMastered,
        currentHintUsed: false,
        currentScaffolded: false,
        questionStartedAt: Date.now(),
      },
    });
  },

  async endSession(quitEarly = false) {
    const { session, repo, child, analytics, streak } = get();
    if (!session || !repo || !child) return;
    const completed = !quitEarly && session.index >= session.items.length;
    const now = Date.now();

    let starsEarned = session.starsEarned;
    if (completed) starsEarned += STAR_AWARDS.sessionComplete;

    const summary: SessionSummary = {
      id: session.id,
      childId: child.id,
      startedAt: session.startedAt,
      endedAt: now,
      activities: [session.kind],
      itemsPlanned: session.items.length,
      itemsAnswered: session.index,
      correct: session.correct,
      hintsUsed: session.hintsUsed,
      starsEarned,
      completed,
      quitEarly,
      factsMastered: session.factsMastered,
    };
    await repo.saveSession(summary);

    // Streak + daily goal on a completed session.
    let nextStreak = streak;
    if (completed) {
      const base: StreakState = streak ?? {
        childId: child.id,
        weeklyCount: 0,
        weekKey: '',
        shieldAvailable: true,
        lastActiveDayKey: null,
        longestWeeklyCount: 0,
      };
      const upd = updateStreak(base, now);
      nextStreak = upd.next;
      await repo.saveStreak(nextStreak);
      if (upd.incremented) {
        analytics?.track('streak_updated', {
          weeklyCount: nextStreak.weeklyCount,
          shieldUsed: upd.shieldUsed,
        });
      }
      await repo.saveDailyGoal({
        childId: child.id,
        dayKey: dayKey(now),
        targetActivities: child.dailyGoalActivities,
        completedActivities: 1,
        met: true,
      });
    }

    if (session.kind === 'review') {
      analytics?.track('review_completed', {
        sessionId: session.id,
        correct: session.correct,
        total: session.items.length,
      });
    } else {
      analytics?.track('lesson_completed', {
        sessionId: session.id,
        correct: session.correct,
        total: session.items.length,
        durationMs: now - session.startedAt,
      });
    }

    set({ session: null, streak: nextStreak });
  },

  async setAnalyticsEnabled(enabled) {
    const { repo, parent, analytics } = get();
    if (!repo || !parent) return;
    const next = { ...parent, consent: { ...parent.consent, analyticsEnabled: enabled } };
    await repo.saveParent(next);
    analytics?.setEnabled(enabled);
    analytics?.track('privacy_setting_changed', { setting: 'analytics', enabled });
    set({ parent: next });
  },

  async setSyncEnabled(enabled) {
    const { repo, parent, analytics } = get();
    if (!repo || !parent) return;
    const next = { ...parent, consent: { ...parent.consent, syncEnabled: enabled } };
    await repo.saveParent(next);
    analytics?.track(enabled ? 'sync_enabled' : 'sync_disabled', { trigger: 'settings' });
    set({ parent: next });
  },

  async deleteChildData() {
    const { repo, child } = get();
    if (!repo || !child) return;
    await repo.deleteChildData(child.id);
    set({ child: null, mastery: new Map(), rewards: null, streak: null, session: null });
  },

  async resetProgress() {
    const { repo, child } = get();
    if (!repo || !child) return;
    await repo.resetProgress(child.id);
    set({ mastery: new Map(), rewards: { childId: child.id, stars: 0, unlockedCosmetics: [], equippedCosmetics: {} } });
  },
}));

/** Grant a family badge when every fact in that family reaches `mastered`. */
async function maybeAwardFamilyBadge(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  mastery: Map<string, MasteryState>,
  family: string | undefined,
) {
  if (!family) return;
  const badgeId = FAMILY_BADGE[family as keyof typeof FAMILY_BADGE];
  if (!badgeId) return;
  const { repo, child, analytics } = get();
  if (!repo || !child) return;
  const existing = await repo.getBadges(child.id);
  if (existing.some((b) => b.id === badgeId)) return;

  // Check all facts of this family are mastered.
  const { factDeck } = await import('@/features/engine/facts');
  const familyFacts = factDeck().filter((c) => c.family === family);
  const allMastered = familyFacts.every((c) => mastery.get(c.id)?.status === 'mastered');
  if (allMastered) {
    await repo.addBadge({ id: badgeId, childId: child.id, earnedAt: Date.now() });
    analytics?.track('reward_earned', { kind: 'badge', amount: 1, id: badgeId });
    set({ lastBadge: badgeId });
  }
}
