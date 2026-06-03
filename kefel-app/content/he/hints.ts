/**
 * Strategy-based hint bank (Hebrew).
 *
 * Each entry turns a fact into a short, concrete worked-thinking hint that
 * teaches the family STRATEGY rather than just giving the answer. The lesson
 * engine picks the hint matching the fact's family, then steps down to a
 * visual scaffold if the child is still stuck.
 */
import type { StrategyKey } from '@/data/schemas';
import { ltr, equation } from '@/lib/rtl';

export interface Hint {
  /** One-line nudge shown first. */
  nudge: string;
  /** Worked step revealed if the child taps "show me". */
  worked: string;
}

type HintFn = (a: number, b: number) => Hint;

/** Pick the larger operand as the "group count" for friendlier phrasing. */
function order(a: number, b: number): [number, number] {
  return a >= b ? [a, b] : [b, a];
}

export const HINTS: Record<StrategyKey, HintFn> = {
  equal_groups: (a, b) => {
    const [g, n] = order(a, b);
    return {
      nudge: `יש ${ltr(g)} קבוצות, ובכל אחת ${ltr(n)}.`,
      worked: `נספור ${ltr(g)} קבוצות של ${ltr(n)} ונקבל ${ltr(a * b)}.`,
    };
  },
  repeated_addition: (a, b) => {
    const [g, n] = order(a, b);
    return {
      nudge: `אפשר לחבר ${ltr(n)} שוב ושוב, ${ltr(g)} פעמים.`,
      worked: `${ltr(`${Array.from({ length: Math.min(g, 5) }, () => n).join(' + ')}${g > 5 ? ' + ...' : ''}`)} = ${ltr(a * b)}.`,
    };
  },
  array: (a, b) => ({
    nudge: `דמיינו לוח עם ${ltr(a)} שורות ו-${ltr(b)} עמודות.`,
    worked: `סופרים את כל המשבצות בלוח ${ltr(`${a}×${b}`)} ויש ${ltr(a * b)}.`,
  }),
  identity_zero: (a, b) => ({
    nudge: 'כל מספר כפול אפס הוא אפס.',
    worked: equation(a, b, 0),
  }),
  identity_one: (a, b) => {
    const keep = a === 1 ? b : a;
    return {
      nudge: 'כל מספר כפול אחד נשאר אותו דבר.',
      worked: `${ltr(`${a} × ${b}`)} = ${ltr(keep)}.`,
    };
  },
  doubling: (a, b) => {
    const n = a === 2 ? b : a;
    return {
      nudge: `כפל ב-2 זה פשוט להכפיל: ${ltr(n)} ועוד ${ltr(n)}.`,
      worked: `${ltr(`${n} + ${n}`)} = ${ltr(a * b)}.`,
    };
  },
  place_value_ten: (a, b) => {
    const n = a === 10 ? b : a;
    return {
      nudge: `כפל ב-10? פשוט מוסיפים אפס.`,
      worked: `${ltr(n)} הופך ל-${ltr(a * b)}.`,
    };
  },
  fives: (a, b) => {
    const n = a === 5 ? b : a;
    return {
      nudge: `כפולות של 5 מסתיימות ב-0 או ב-5. ספרו: 5, 10, 15...`,
      worked: `${ltr(n)} קפיצות של 5 מגיעות ל-${ltr(a * b)}.`,
    };
  },
  double_double: (a, b) => {
    const n = a === 4 ? b : a;
    return {
      nudge: `כפל ב-4 זה להכפיל פעמיים: קודם כפול 2, ואז שוב כפול 2.`,
      worked: `${ltr(n)} ➝ ${ltr(n * 2)} ➝ ${ltr(a * b)}.`,
    };
  },
  decompose_known: (a, b) => {
    const [g, n] = order(a, b);
    const split = Math.max(2, g - 1);
    return {
      nudge: `פרקו לתרגיל שאתם כבר יודעים, ואז הוסיפו עוד קבוצה.`,
      worked: `${ltr(`${split} × ${n}`)} = ${ltr(split * n)}, ועוד ${ltr(n)} = ${ltr(a * b)}.`,
    };
  },
  five_plus_n: (a, b) => {
    const n = a === 6 ? b : a;
    return {
      nudge: `6 זה 5 ועוד 1. חשבו כפול 5 ואז הוסיפו עוד קבוצה.`,
      worked: `${ltr(`5 × ${n}`)} = ${ltr(5 * n)}, ועוד ${ltr(n)} = ${ltr(a * b)}.`,
    };
  },
  ten_minus_n: (a, b) => {
    const n = a === 9 ? b : a;
    return {
      nudge: `9 זה כמעט 10. חשבו כפול 10 ואז הורידו קבוצה אחת.`,
      worked: `${ltr(`10 × ${n}`)} = ${ltr(10 * n)}, פחות ${ltr(n)} = ${ltr(a * b)}.`,
    };
  },
  commutative: (a, b) => ({
    nudge: `${ltr(`${a} × ${b}`)} זה אותו דבר כמו ${ltr(`${b} × ${a}`)}.`,
    worked: `הסדר לא משנה — התשובה היא ${ltr(a * b)}.`,
  }),
};

/** Resolve the best hint for a fact given its strategy preference order. */
export function hintForFact(a: number, b: number, strategies: StrategyKey[]): Hint {
  // Prefer the family strategy (last meaningful one) over generic array/groups.
  const preferred =
    strategies.find((s) => s !== 'array' && s !== 'equal_groups' && s !== 'commutative') ??
    strategies[0]!;
  return HINTS[preferred](a, b);
}
