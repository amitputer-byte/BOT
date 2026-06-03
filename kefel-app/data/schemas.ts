/**
 * Single source of truth for the domain model.
 *
 * Every persisted/synced entity is defined as a Zod schema and its TypeScript
 * type is inferred from it, so validation and types can never drift. These
 * schemas are also used to validate anything coming back from Firestore sync.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

export const FactId = z.string().regex(/^\d+x\d+$/); // canonical e.g. "3x4"
export type FactId = z.infer<typeof FactId>;

export const Operand = z.number().int().min(0).max(10);

export const MasteryStatus = z.enum([
  'new',
  'learning',
  'practicing',
  'strong',
  'mastered',
  'at_risk',
]);
export type MasteryStatus = z.infer<typeof MasteryStatus>;

/** Curriculum families in teaching order (see docs/learning-model.md). */
export const FactFamily = z.enum([
  'x0',
  'x1',
  'x2',
  'x10',
  'x5',
  'x4',
  'x3',
  'x6',
  'x9',
  'x7',
  'x8',
]);
export type FactFamily = z.infer<typeof FactFamily>;

export const StrategyKey = z.enum([
  'equal_groups',
  'repeated_addition',
  'array',
  'identity_zero', // x0
  'identity_one', // x1
  'doubling', // x2
  'place_value_ten', // x10
  'fives', // x5
  'double_double', // x4
  'decompose_known', // x3 / x6 / x7 / x8
  'five_plus_n', // x6
  'ten_minus_n', // x9
  'commutative',
]);
export type StrategyKey = z.infer<typeof StrategyKey>;

/* ------------------------------------------------------------------ */
/* 1. ChildProfile  (pseudonymous — no real name / no PII required)    */
/* ------------------------------------------------------------------ */

export const AvatarId = z.enum(['fox', 'owl', 'cat', 'panda', 'dragon', 'robot', 'bunny', 'star']);

export const ChildProfile = z.object({
  id: z.string(), // local UUID, never an email
  nickname: z.string().min(1).max(20), // chosen nickname, not a real name
  avatar: AvatarId,
  createdAt: z.number(),
  // Tunables surfaced to the parent, with child-safe defaults.
  audioInstructions: z.boolean().default(true),
  reducedMotion: z.boolean().default(false),
  dailyGoalActivities: z.number().int().min(1).max(10).default(3),
});
export type ChildProfile = z.infer<typeof ChildProfile>;

/* ------------------------------------------------------------------ */
/* 2. ParentProfile                                                    */
/* ------------------------------------------------------------------ */

export const ParentProfile = z.object({
  id: z.string(),
  // Only present when cloud sync is explicitly enabled by the parent.
  authUid: z.string().nullable().default(null),
  email: z.string().email().nullable().default(null),
  consent: z.object({
    privacyAcceptedAt: z.number().nullable().default(null),
    analyticsEnabled: z.boolean().default(false), // privacy-by-default: OFF
    syncEnabled: z.boolean().default(false), // local-only by default
  }),
  // PIN-less gate: a simple math challenge guards the adult area (see ParentGate).
  createdAt: z.number(),
});
export type ParentProfile = z.infer<typeof ParentProfile>;

/* ------------------------------------------------------------------ */
/* 3. FactCard  (static definition of a multiplication fact)           */
/* ------------------------------------------------------------------ */

export const FactCard = z.object({
  id: FactId,
  a: Operand,
  b: Operand,
  product: z.number().int().min(0).max(100),
  /** Canonical orientation collapses commutative pairs (a <= b). */
  canonicalId: FactId,
  isCanonical: z.boolean(),
  family: FactFamily,
  strategies: z.array(StrategyKey).min(1),
  /** Teaching order index; lower unlocks earlier. */
  introOrder: z.number().int().min(0),
});
export type FactCard = z.infer<typeof FactCard>;

/* ------------------------------------------------------------------ */
/* 4. AttemptRecord                                                     */
/* ------------------------------------------------------------------ */

export const AttemptOutcome = z.enum(['correct', 'incorrect', 'timeout', 'skipped']);

export const AttemptRecord = z.object({
  id: z.string(),
  childId: z.string(),
  factId: FactId, // canonical id the attempt counts toward
  shownA: Operand, // actual orientation shown to the child
  shownB: Operand,
  outcome: AttemptOutcome,
  usedHint: z.boolean(),
  scaffolded: z.boolean(), // visual scaffold was active (step-down)
  isTransferItem: z.boolean(), // word problem / missing factor / division
  latencyMs: z.number().int().nonnegative(),
  sessionId: z.string(),
  activity: z.string(), // e.g. "lesson", "review", "garden_arrays"
  at: z.number(),
});
export type AttemptRecord = z.infer<typeof AttemptRecord>;
export type AttemptOutcome = z.infer<typeof AttemptOutcome>;

/* ------------------------------------------------------------------ */
/* 5. MasteryState  (per-fact, per-child learning state + KPIs)        */
/* ------------------------------------------------------------------ */

export const MasteryState = z.object({
  childId: z.string(),
  factId: FactId,
  status: MasteryStatus,
  // KPIs required by the spec.
  attempts: z.number().int().nonnegative().default(0),
  correct: z.number().int().nonnegative().default(0),
  independentCorrect: z.number().int().nonnegative().default(0), // no hint, no scaffold
  hintCount: z.number().int().nonnegative().default(0),
  medianLatencyMs: z.number().nonnegative().default(0),
  transferSuccess: z.number().int().nonnegative().default(0),
  lapseCount: z.number().int().nonnegative().default(0),
  // Spaced-repetition bookkeeping.
  consecutiveIndependent: z.number().int().nonnegative().default(0),
  consecutiveErrors: z.number().int().nonnegative().default(0),
  intervalIndex: z.number().int().min(-1).default(-1), // -1 == not yet scheduled
  lastSeenAt: z.number().nullable().default(null),
  nextDueAt: z.number().nullable().default(null),
  recentLatenciesMs: z.array(z.number()).max(10).default([]), // rolling window
});
export type MasteryState = z.infer<typeof MasteryState>;

/* ------------------------------------------------------------------ */
/* 6. SessionSummary                                                   */
/* ------------------------------------------------------------------ */

export const SessionSummary = z.object({
  id: z.string(),
  childId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable().default(null),
  activities: z.array(z.string()).default([]),
  itemsPlanned: z.number().int().nonnegative(),
  itemsAnswered: z.number().int().nonnegative().default(0),
  correct: z.number().int().nonnegative().default(0),
  hintsUsed: z.number().int().nonnegative().default(0),
  starsEarned: z.number().int().nonnegative().default(0),
  completed: z.boolean().default(false),
  quitEarly: z.boolean().default(false), // contributes to frustration-quit KPI
  factsMastered: z.array(FactId).default([]),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

/* ------------------------------------------------------------------ */
/* 7. RewardInventory  (single soft currency + cosmetic unlocks)       */
/* ------------------------------------------------------------------ */

export const RewardInventory = z.object({
  childId: z.string(),
  stars: z.number().int().nonnegative().default(0), // the ONLY currency
  unlockedCosmetics: z.array(z.string()).default([]), // cosmetic ids only
  equippedCosmetics: z.record(z.string()).default({}), // slot -> cosmeticId
});
export type RewardInventory = z.infer<typeof RewardInventory>;

/* ------------------------------------------------------------------ */
/* 8. Badge                                                            */
/* ------------------------------------------------------------------ */

export const Badge = z.object({
  id: z.string(), // e.g. "master_x5", "array_expert", "commutative_hero"
  earnedAt: z.number(),
  childId: z.string(),
});
export type Badge = z.infer<typeof Badge>;

/* ------------------------------------------------------------------ */
/* 9. DailyGoal  (forgiving streak model)                              */
/* ------------------------------------------------------------------ */

export const DailyGoal = z.object({
  childId: z.string(),
  dayKey: z.string(), // YYYY-MM-DD (local)
  targetActivities: z.number().int().min(1),
  completedActivities: z.number().int().nonnegative().default(0),
  met: z.boolean().default(false),
});

export const StreakState = z.object({
  childId: z.string(),
  weeklyCount: z.number().int().nonnegative().default(0), // days active this week
  weekKey: z.string().default(''),
  shieldAvailable: z.boolean().default(true), // single forgiving recovery
  lastActiveDayKey: z.string().nullable().default(null),
  longestWeeklyCount: z.number().int().nonnegative().default(0),
});
export type DailyGoal = z.infer<typeof DailyGoal>;
export type StreakState = z.infer<typeof StreakState>;

/* ------------------------------------------------------------------ */
/* 10. AnalyticsEvent                                                  */
/* ------------------------------------------------------------------ */

export const AnalyticsEvent = z.object({
  name: z.string(),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  at: z.number(),
  childId: z.string().nullable().default(null), // pseudonymous id only
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEvent>;

/* ------------------------------------------------------------------ */
/* 11. ParentReportSnapshot                                            */
/* ------------------------------------------------------------------ */

export const ParentReportSnapshot = z.object({
  childId: z.string(),
  generatedAt: z.number(),
  totalFacts: z.number().int(),
  masteredFacts: z.number().int(),
  strongFacts: z.number().int(),
  fragileFacts: z.number().int(), // at_risk + practicing-with-errors
  dueToday: z.number().int(),
  mixedReviewAccuracy: z.number(), // 0..1
  retention7d: z.number(), // 0..1
  retention30d: z.number(), // 0..1
  transferAccuracy: z.number(), // 0..1
  hintDependence: z.number(), // 0..1 (hinted / attempts)
  sessionCompletionRate: z.number(), // 0..1
  streakParticipation: z.number(), // 0..1
  frustrationQuitRate: z.number(), // 0..1
  totalTimeMs: z.number().nonnegative(),
  recommendedNextAction: z.string(), // localized Hebrew string key resolved upstream
  heatmap: z.array(
    z.object({ a: Operand, b: Operand, status: MasteryStatus }),
  ),
});
export type ParentReportSnapshot = z.infer<typeof ParentReportSnapshot>;
