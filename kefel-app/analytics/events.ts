/**
 * Analytics event taxonomy — fully typed.
 *
 * Privacy posture: events carry only a pseudonymous childId (never PII), are
 * OFF by default, and are dropped entirely unless the parent opts in. Each
 * event name maps to a typed parameter shape so call sites can't drift.
 */
import type { FactFamily, MasteryStatus } from '@/data/schemas';

export type AnalyticsParamValue = string | number | boolean;

export interface AnalyticsEventMap {
  app_open: { coldStart: boolean };
  onboarding_started: Record<string, never>;
  onboarding_completed: { durationMs: number; avatar: string };
  baseline_completed: { itemsAnswered: number; correct: number };
  lesson_started: { sessionId: string; itemsPlanned: number };
  lesson_completed: { sessionId: string; correct: number; total: number; durationMs: number };
  review_started: { sessionId: string; dueCount: number };
  review_completed: { sessionId: string; correct: number; total: number };
  fact_answered: {
    factId: string;
    family: FactFamily;
    correct: boolean;
    usedHint: boolean;
    scaffolded: boolean;
    isTransfer: boolean;
    latencyMs: number;
    activity: string;
  };
  hint_used: { factId: string; family: FactFamily; strategy: string };
  fact_mastered: { factId: string; family: FactFamily; attempts: number };
  lapse_detected: { factId: string; from: MasteryStatus; to: MasteryStatus };
  reward_earned: { kind: 'stars' | 'badge'; amount: number; id: string };
  streak_updated: { weeklyCount: number; shieldUsed: boolean };
  parent_dashboard_viewed: { masteredFacts: number; dueToday: number };
  privacy_setting_changed: { setting: string; enabled: boolean };
  sync_enabled: { trigger: string };
  sync_disabled: { trigger: string };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

/** A discriminated, type-safe event envelope. */
export type TypedAnalyticsEvent = {
  [K in AnalyticsEventName]: {
    name: K;
    params: AnalyticsEventMap[K];
    at: number;
    childId: string | null;
  };
}[AnalyticsEventName];

/** All event names, used by docs generation and admin tooling. */
export const ALL_EVENT_NAMES: AnalyticsEventName[] = [
  'app_open',
  'onboarding_started',
  'onboarding_completed',
  'baseline_completed',
  'lesson_started',
  'lesson_completed',
  'review_started',
  'review_completed',
  'fact_answered',
  'hint_used',
  'fact_mastered',
  'lapse_detected',
  'reward_earned',
  'streak_updated',
  'parent_dashboard_viewed',
  'privacy_setting_changed',
  'sync_enabled',
  'sync_disabled',
];

/** Hebrew labels for the admin/parent-facing analytics view (no English ids in UI). */
export const EVENT_LABELS_HE: Record<AnalyticsEventName, string> = {
  app_open: 'פתיחת אפליקציה',
  onboarding_started: 'תחילת הגדרה',
  onboarding_completed: 'סיום הגדרה',
  baseline_completed: 'סיום בדיקת פתיחה',
  lesson_started: 'תחילת שיעור',
  lesson_completed: 'סיום שיעור',
  review_started: 'תחילת חזרה',
  review_completed: 'סיום חזרה',
  fact_answered: 'מענה על תרגיל',
  hint_used: 'שימוש ברמז',
  fact_mastered: 'שליטה בעובדה',
  lapse_detected: 'זוהתה נסיגה',
  reward_earned: 'זכייה בפרס',
  streak_updated: 'עדכון רצף',
  parent_dashboard_viewed: 'צפייה בלוח הורים',
  privacy_setting_changed: 'שינוי הגדרת פרטיות',
  sync_enabled: 'הפעלת סנכרון',
  sync_disabled: 'כיבוי סנכרון',
};
