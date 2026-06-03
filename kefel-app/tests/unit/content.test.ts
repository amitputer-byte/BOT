import { makeContentProvider } from '@/content/contentBank';
import { hintForFact } from '@/content/he/hints';
import { strategiesFor } from '@/features/engine/facts';

describe('content provider', () => {
  it('produces deterministic content for a fixed session seed', () => {
    const a = makeContentProvider(123);
    const b = makeContentProvider(123);
    expect(a.success(false, '3x4')).toBe(b.success(false, '3x4'));
    expect(a.transfer(3, 4, 'word').text).toBe(b.transfer(3, 4, 'word').text);
  });

  it('generates a word problem with the correct answer', () => {
    const p = makeContentProvider(7).transfer(6, 7, 'word');
    expect(p.answer).toBe(42);
    expect(p.text.length).toBeGreaterThan(10);
  });

  it('division transfer returns the inverse factor', () => {
    const p = makeContentProvider(7).transfer(4, 8, 'division');
    expect(p.answer).toBe(4);
  });

  it('uses the family strategy for hints, not just arrays', () => {
    const h = hintForFact(9, 9, strategiesFor(9, 9));
    expect(h.nudge).toContain('10'); // ×9 strategy: 10n - n
  });

  it('produces a doubling hint for ×2 facts (2×7 = double 7)', () => {
    const h = hintForFact(2, 7, strategiesFor(2, 7));
    expect(h.worked).toContain('14'); // 7 + 7 = 14
  });
});
