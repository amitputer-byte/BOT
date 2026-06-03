/**
 * Feature flags + A/B experiment hooks.
 *
 * Defaults are local and safe; Firebase Remote Config can override them when
 * sync is enabled. GUARDRAIL: experiments may never touch privacy defaults or
 * introduce manipulative nudges — only the learning/UX parameters below are
 * exposed, and `assertSafeExperiment` enforces it.
 */
export interface ExperimentFlags {
  /** Daily path length (items per session). */
  dailyPathLength: number;
  /** Order in which hints escalate. */
  hintOrder: 'strategy_first' | 'visual_first';
  /** How often cosmetic rewards surface. */
  rewardCadence: 'per_session' | 'per_milestone';
  /** Which call-to-action the home screen leads with. */
  homeCtaPriority: 'review_first' | 'play_first';
  /** Celebration animation intensity (always short + skippable). */
  celebrationIntensity: 'calm' | 'standard' | 'festive';
}

export const DEFAULT_FLAGS: ExperimentFlags = {
  dailyPathLength: 8,
  hintOrder: 'strategy_first',
  rewardCadence: 'per_session',
  homeCtaPriority: 'review_first',
  celebrationIntensity: 'standard',
};

/** Keys that are legal to experiment on. Anything else is rejected. */
const EXPERIMENTABLE_KEYS = new Set<keyof ExperimentFlags>([
  'dailyPathLength',
  'hintOrder',
  'rewardCadence',
  'homeCtaPriority',
  'celebrationIntensity',
]);

/** Forbidden surfaces — never run experiments here. */
const FORBIDDEN_EXPERIMENT_AREAS = [
  'analyticsEnabled',
  'syncEnabled',
  'localOnly',
  'consent',
  'dataRetention',
  'scarcity',
  'nudge',
];

export function assertSafeExperiment(key: string): void {
  if (FORBIDDEN_EXPERIMENT_AREAS.some((bad) => key.toLowerCase().includes(bad))) {
    throw new Error(`Refusing to experiment on protected area: ${key}`);
  }
  if (!EXPERIMENTABLE_KEYS.has(key as keyof ExperimentFlags)) {
    throw new Error(`Unknown experiment key: ${key}`);
  }
}

let _flags: ExperimentFlags = { ...DEFAULT_FLAGS };

export function getFlags(): ExperimentFlags {
  return _flags;
}

/** Apply overrides (e.g. from Remote Config), validating each key first. */
export function applyFlagOverrides(overrides: Partial<ExperimentFlags>): ExperimentFlags {
  for (const key of Object.keys(overrides)) assertSafeExperiment(key);
  _flags = { ..._flags, ...overrides };
  return _flags;
}
