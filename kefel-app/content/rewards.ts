/**
 * Reward catalogue: one soft currency (stars), cosmetic-only unlocks, and
 * badges tied to LEARNING OUTCOMES. No monetization, no scarcity, no ranking.
 */
import type { FactFamily } from '@/data/schemas';

export interface BadgeDef {
  id: string;
  /** i18n key for the badge name. */
  labelKey: string;
  /** Human-readable rule (also documented in learning-model.md). */
  description: string;
}

export interface CosmeticDef {
  id: string;
  slot: 'hat' | 'pet' | 'background' | 'frame';
  labelKey: string;
  cost: number; // in stars
}

/** Badges unlocked by mastering a family or demonstrating a strategy skill. */
export const BADGES: BadgeDef[] = [
  { id: 'master_x5', labelKey: 'badge.master_x5', description: 'All ×5 facts mastered' },
  { id: 'master_x10', labelKey: 'badge.master_x10', description: 'All ×10 facts mastered' },
  { id: 'array_expert', labelKey: 'badge.array_expert', description: '20 array builds correct' },
  {
    id: 'commutative_hero',
    labelKey: 'badge.commutative_hero',
    description: 'Recognised 10 commutative pairs',
  },
  { id: 'doubling_star', labelKey: 'badge.doubling_star', description: 'All ×2 facts mastered' },
  {
    id: 'transfer_champ',
    labelKey: 'badge.transfer_champ',
    description: '15 transfer items correct',
  },
];

/** Map a mastered family to the badge it grants, if any. */
export const FAMILY_BADGE: Partial<Record<FactFamily, string>> = {
  x2: 'doubling_star',
  x5: 'master_x5',
  x10: 'master_x10',
};

/** Cosmetic-only shop items. Costs are gentle and never gate learning. */
export const COSMETICS: CosmeticDef[] = [
  { id: 'hat_wizard', slot: 'hat', labelKey: 'reward.cosmetic.hat_wizard', cost: 20 },
  { id: 'hat_crown', slot: 'hat', labelKey: 'reward.cosmetic.hat_crown', cost: 40 },
  { id: 'pet_dragon', slot: 'pet', labelKey: 'reward.cosmetic.pet_dragon', cost: 60 },
  { id: 'bg_galaxy', slot: 'background', labelKey: 'reward.cosmetic.bg_galaxy', cost: 30 },
  { id: 'frame_gold', slot: 'frame', labelKey: 'reward.cosmetic.frame_gold', cost: 50 },
];

/** Star awards per outcome — small, predictable, non-manipulative. */
export const STAR_AWARDS = {
  correctIndependent: 2,
  correctWithHint: 1,
  sessionComplete: 5,
  factMastered: 10,
  dailyGoalMet: 5,
} as const;
