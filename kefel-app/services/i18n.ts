/**
 * Minimal, dependency-free localization resolver.
 *
 * The child experience is Hebrew-only and the parent experience is Hebrew by
 * default, so we ship a single `he` dictionary. The resolver is structured so
 * additional locales could be added without touching call sites. Numbers
 * interpolated into Hebrew strings are bidi-isolated automatically.
 */
import { ltr } from '@/lib/rtl';
import { he } from '@/content/he/ui';

export type Locale = 'he';
export const DEFAULT_LOCALE: Locale = 'he';
export const DIRECTION: 'rtl' = 'rtl';

const DICTS: Record<Locale, Record<string, string>> = { he };

type Vars = Record<string, string | number>;

/** Resolve a dotted key with `{var}` interpolation; numbers are LTR-isolated. */
export function t(key: string, vars?: Vars, locale: Locale = DEFAULT_LOCALE): string {
  const template = DICTS[locale][key];
  if (template === undefined) {
    // Surface missing keys loudly in dev rather than shipping an English id.
    if (__DEV__) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    if (v === undefined) return `{${name}}`;
    return typeof v === 'number' ? ltr(v) : String(v);
  });
}

/** Check a key exists (used by tests that assert full coverage). */
export function hasKey(key: string, locale: Locale = DEFAULT_LOCALE): boolean {
  return key in DICTS[locale];
}
