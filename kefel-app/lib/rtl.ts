/**
 * RTL + mixed-direction text helpers.
 *
 * Hebrew UI is fully RTL, but math expressions and standalone numbers are
 * inherently LTR. To keep "3 × 4 = 12" from visually reordering when embedded
 * in a Hebrew sentence, we wrap LTR fragments in Unicode isolates.
 */

// Unicode bidi isolate controls.
const LRI = '⁦'; // LEFT-TO-RIGHT ISOLATE
const PDI = '⁩'; // POP DIRECTIONAL ISOLATE
const RLM = '‏'; // RIGHT-TO-LEFT MARK

/** Isolate an LTR fragment (number / math expression) inside RTL text. */
export function ltr(fragment: string | number): string {
  return `${LRI}${fragment}${PDI}`;
}

/** Render a multiplication expression as a stable LTR-isolated string. */
export function expr(a: number, b: number): string {
  return ltr(`${a} × ${b}`);
}

/** Render a full equation "a × b = c", isolated so it never reflows. */
export function equation(a: number, b: number, c: number): string {
  return ltr(`${a} × ${b} = ${c}`);
}

/** Force a trailing RTL mark so punctuation after an LTR run stays put. */
export function rtlAnchor(text: string): string {
  return `${text}${RLM}`;
}

/** Hebrew uses Western-Arabic numerals; expose a hook for future locales. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('he-IL').format(n);
}
