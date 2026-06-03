import { t, hasKey } from '@/services/i18n';
import { ltr, expr, equation, formatNumber } from '@/lib/rtl';
import { he } from '@/content/he/ui';

describe('i18n + RTL helpers', () => {
  it('resolves a known key', () => {
    expect(t('common.next')).toBe('הבא');
  });

  it('interpolates and bidi-isolates numbers in Hebrew text', () => {
    const out = t('home.todayGoal', { count: 3 });
    expect(out).toContain('המטרה');
    // The number must be wrapped in LRI...PDI isolates.
    expect(out).toContain('⁦');
    expect(out).toContain('⁩');
    expect(out).toContain('3');
  });

  it('returns the key (not English) for a missing string', () => {
    expect(hasKey('does.not.exist')).toBe(false);
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('isolates math expressions so they do not reflow', () => {
    expect(expr(3, 4)).toBe('⁦3 × 4⁩');
    expect(equation(3, 4, 12)).toBe('⁦3 × 4 = 12⁩');
    expect(ltr(42)).toBe('⁦42⁩');
  });

  it('has no obviously-English values in the Hebrew UI dictionary', () => {
    // Every UI string should contain at least one Hebrew character.
    const hebrew = /[֐-׿]/;
    const offenders = Object.entries(he).filter(
      ([, v]) => !hebrew.test(v) && !/^[\d\sא-ת×=?!.\-⭐🔊💡🏅✓✕👀🎮🔁🔥✅✨🎉🎊🌟]+$/u.test(v),
    );
    expect(offenders).toEqual([]);
  });

  it('formats numbers via the he-IL locale', () => {
    expect(formatNumber(1000)).toMatch(/1.?000/);
  });
});
