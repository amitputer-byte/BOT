/**
 * Deterministic content selector.
 *
 * Wraps the Hebrew banks behind a seeded picker so repeated play feels fresh
 * yet reproducible (important for tests and A/B parity). All runtime content is
 * template-driven — no LLM/generative calls in production.
 */
import { pick, deriveSeed, makeRng, type Rng } from '@/lib/random';
import {
  SUCCESS_LINES,
  SUCCESS_WITH_HINT_LINES,
  ERROR_LINES,
  SCAFFOLD_LINES,
  ENCOURAGE_LINES,
} from './he/feedback';
import { hintForFact, type Hint } from './he/hints';
import {
  makeWordProblem,
  makeMissingFactorProblem,
  makeDivisionProblem,
  type WordProblem,
} from './he/wordProblems';
import { strategiesFor } from '@/features/engine/facts';

export type TransferKind = 'word' | 'missing_factor' | 'division';

/** A per-session content provider seeded for reproducible variety. */
export function makeContentProvider(sessionSeed: number) {
  const seeded = (key: string): Rng => makeRng(deriveSeed(sessionSeed, key));

  return {
    success(usedHint: boolean, key = ''): string {
      const rng = seeded(`success:${key}`);
      return pick(rng, usedHint ? SUCCESS_WITH_HINT_LINES : SUCCESS_LINES);
    },
    error(key = ''): string {
      return pick(seeded(`error:${key}`), ERROR_LINES);
    },
    scaffoldIntro(key = ''): string {
      return pick(seeded(`scaffold:${key}`), SCAFFOLD_LINES);
    },
    encourage(key = ''): string {
      return pick(seeded(`encourage:${key}`), ENCOURAGE_LINES);
    },
    hint(a: number, b: number): Hint {
      return hintForFact(a, b, strategiesFor(a, b));
    },
    transfer(a: number, b: number, kind: TransferKind): WordProblem {
      const rng = seeded(`transfer:${a}x${b}:${kind}`);
      if (kind === 'missing_factor') return makeMissingFactorProblem(rng, a, b);
      if (kind === 'division') return makeDivisionProblem(rng, a, b);
      return makeWordProblem(rng, a, b);
    },
  };
}

export type ContentProvider = ReturnType<typeof makeContentProvider>;
