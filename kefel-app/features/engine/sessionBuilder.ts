/**
 * Session composer.
 *
 * Builds the ordered list of items for a 5–10 minute session from the child's
 * mastery states, using the default mix (60% due reviews, 20% fragile, 10% new,
 * 10% easy wins) with graceful fallback when a pool is short. New facts are
 * gated by the curriculum's introduction order so families unlock in sequence.
 */
import type { FactCard, MasteryState } from '@/data/schemas';
import { factDeck } from './facts';
import { isDue, overdueDays } from './scheduler';
import { fragility, isFragile, isEasyWin, chooseOrientation } from './difficulty';
import type { Rng } from '@/lib/random';
import { shuffle } from '@/lib/random';
import type { EpochMs } from '@/lib/time';

export type ItemKind = 'retrieval' | 'scaffolded' | 'transfer';
export type ItemSource = 'due' | 'fragile' | 'new' | 'easy';

export interface SessionItem {
  factId: string;
  a: number; // shown orientation
  b: number;
  product: number;
  kind: ItemKind;
  source: ItemSource;
}

export interface SessionMix {
  due: number;
  fragile: number;
  new: number;
  easy: number;
}

export const DEFAULT_MIX: SessionMix = { due: 0.6, fragile: 0.2, new: 0.1, easy: 0.1 };

export interface BuildConfig {
  targetItems: number; // experiment-tunable daily path length
  mix?: SessionMix;
  /** How many brand-new facts may be introduced in a single session. */
  maxNewFacts?: number;
  /** Fraction of due/fragile items that should be transfer items, 0..1. */
  transferRatio?: number;
}

type StateMap = Map<string, MasteryState>;

function stateFor(states: StateMap, card: FactCard): MasteryState | undefined {
  return states.get(card.id);
}

/**
 * Eligible new facts: status `new`, in introduction order, but only once the
 * immediately-preceding facts are at least `practicing` (prerequisite gate).
 */
function eligibleNew(deck: FactCard[], states: StateMap, limit: number): FactCard[] {
  const out: FactCard[] = [];
  for (const card of deck) {
    const st = states.get(card.id);
    if (st && st.status !== 'new') continue;
    // Gate: don't introduce a fact while earlier facts are still untouched-new.
    const earlierUnlearned = deck
      .filter((c) => c.introOrder < card.introOrder)
      .some((c) => {
        const s = states.get(c.id);
        return !s || s.status === 'new' || s.status === 'learning';
      });
    if (earlierUnlearned && out.length === 0 && st && st.status === 'new') {
      // Allow the very first frontier fact through even at a cold start.
    }
    if (!earlierUnlearned || out.length < 1) {
      out.push(card);
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

function toItem(
  card: FactCard,
  source: ItemSource,
  kind: ItemKind,
  rng: Rng,
): SessionItem {
  const [a, b] = chooseOrientation(rng, card.a, card.b);
  return { factId: card.id, a, b, product: card.product, kind, source };
}

export function buildSession(
  states: StateMap,
  now: EpochMs,
  rng: Rng,
  config: BuildConfig,
): SessionItem[] {
  const deck = factDeck();
  const mix = config.mix ?? DEFAULT_MIX;
  const maxNew = config.maxNewFacts ?? 2;
  const transferRatio = config.transferRatio ?? 0.2;
  const target = Math.max(1, config.targetItems);

  // Partition the deck into candidate pools.
  const duePool = deck
    .filter((c) => {
      const s = stateFor(states, c);
      return s ? isDue(s, now) : false;
    })
    .sort((x, y) => overdueDays(states.get(y.id)!, now) - overdueDays(states.get(x.id)!, now));

  const fragilePool = deck
    .filter((c) => {
      const s = stateFor(states, c);
      return s ? isFragile(s) && !isDue(s, now) : false;
    })
    .sort((x, y) => fragility(states.get(y.id)!) - fragility(states.get(x.id)!));

  const easyPool = shuffle(
    rng,
    deck.filter((c) => {
      const s = stateFor(states, c);
      return s ? isEasyWin(s) && !isDue(s, now) : false;
    }),
  );

  const newPool = eligibleNew(deck, states, maxNew);

  const want = {
    due: Math.round(target * mix.due),
    fragile: Math.round(target * mix.fragile),
    new: Math.min(maxNew, Math.round(target * mix.new)),
    easy: Math.round(target * mix.easy),
  };

  const items: SessionItem[] = [];
  const used = new Set<string>();
  const take = (pool: FactCard[], n: number, source: ItemSource) => {
    for (const card of pool) {
      if (items.length >= target || (items.filter((i) => i.source === source).length >= n)) break;
      if (used.has(card.id)) continue;
      used.add(card.id);
      const s = states.get(card.id);
      // Step down to a scaffold automatically when the fact is shaky.
      const kind: ItemKind = s && s.consecutiveErrors >= 2 ? 'scaffolded' : 'retrieval';
      items.push(toItem(card, source, kind, rng));
    }
  };

  take(duePool, want.due, 'due');
  take(fragilePool, want.fragile, 'fragile');
  take(newPool, want.new, 'new');
  take(easyPool, want.easy, 'easy');

  // Backfill any shortfall from remaining due -> fragile -> easy -> new.
  for (const [pool, source] of [
    [duePool, 'due'],
    [fragilePool, 'fragile'],
    [easyPool, 'easy'],
    [newPool, 'new'],
  ] as const) {
    if (items.length >= target) break;
    take(pool, target, source);
  }

  // Promote a share of established items to transfer items (word problem /
  // missing factor / division) — never new or scaffolded ones.
  const transferTarget = Math.round(items.length * transferRatio);
  let promoted = 0;
  for (const it of items) {
    if (promoted >= transferTarget) break;
    if (it.source === 'new' || it.kind === 'scaffolded') continue;
    const s = states.get(it.factId);
    if (s && (s.status === 'strong' || s.status === 'practicing' || s.status === 'mastered')) {
      it.kind = 'transfer';
      promoted++;
    }
  }

  // Interleave sources so the child isn't hit with a wall of one type.
  return interleave(items, rng);
}

/** Light interleave: keep scaffolded/new items from clustering. */
function interleave(items: SessionItem[], rng: Rng): SessionItem[] {
  return shuffle(rng, items).sort((a, b) => {
    // Easy wins first as a warm-up, transfer items toward the end.
    const rank = (i: SessionItem) =>
      i.source === 'easy' ? 0 : i.kind === 'transfer' ? 2 : 1;
    return rank(a) - rank(b);
  });
}
