/**
 * Word-problem templates (Hebrew) for transfer items.
 *
 * Deterministic generation: a template + a noun pair are chosen by seeded RNG
 * so the same fact yields varied but reproducible stories. Templates keep
 * reading load low and use concrete, child-familiar contexts (no scary themes).
 */
import { ltr } from '@/lib/rtl';
import { pick, type Rng } from '@/lib/random';

interface Context {
  /** container, e.g. "צלחות" (plates) */
  groups: string;
  /** items, e.g. "עוגיות" (cookies) */
  items: string;
  /** verb phrase connecting them */
  verb: string;
}

const CONTEXTS: Context[] = [
  { groups: 'צלחות', items: 'עוגיות', verb: 'על כל צלחת' },
  { groups: 'אגרטלים', items: 'פרחים', verb: 'בכל אגרטל' },
  { groups: 'קופסאות', items: 'עפרונות', verb: 'בכל קופסה' },
  { groups: 'שקיות', items: 'תפוחים', verb: 'בכל שקית' },
  { groups: 'אקווריומים', items: 'דגים', verb: 'בכל אקווריום' },
  { groups: 'מדפים', items: 'ספרים', verb: 'על כל מדף' },
  { groups: 'סלים', items: 'כדורים', verb: 'בכל סל' },
];

export interface WordProblem {
  text: string;
  answer: number;
}

/** Multiplication story: "g groups, n items each — how many in total?" */
export function makeWordProblem(rng: Rng, a: number, b: number): WordProblem {
  const groups = Math.max(a, b);
  const each = Math.min(a, b);
  const c = pick(rng, CONTEXTS);
  const text = `יש ${ltr(groups)} ${c.groups}, ו${c.verb} יש ${ltr(each)} ${c.items}. כמה ${c.items} יש בסך הכול?`;
  return { text, answer: a * b };
}

/** Missing-factor story: "n items per group, total t — how many groups?" */
export function makeMissingFactorProblem(rng: Rng, a: number, b: number): WordProblem {
  const each = Math.min(a, b) || 1;
  const groups = Math.max(a, b);
  const c = pick(rng, CONTEXTS);
  const total = a * b;
  const text = `יש ${ltr(total)} ${c.items} בסך הכול, ובכל קבוצה ${ltr(each)} ${c.items}. כמה קבוצות יש?`;
  return { text, answer: groups };
}

/** Division-as-inverse story to reinforce the inverse relation. */
export function makeDivisionProblem(rng: Rng, a: number, b: number): WordProblem {
  const groups = Math.max(a, b) || 1;
  const total = a * b;
  const c = pick(rng, CONTEXTS);
  const text = `מחלקים ${ltr(total)} ${c.items} שווה בשווה ל-${ltr(groups)} ${c.groups}. כמה ${c.items} ${c.verb}?`;
  return { text, answer: Math.min(a, b) };
}
