import {
  getFlags,
  applyFlagOverrides,
  assertSafeExperiment,
  DEFAULT_FLAGS,
} from '@/services/remoteConfig';

describe('experiment guardrails', () => {
  it('exposes safe defaults', () => {
    expect(getFlags().dailyPathLength).toBe(DEFAULT_FLAGS.dailyPathLength);
  });

  it('allows overriding learning/UX flags', () => {
    const f = applyFlagOverrides({ dailyPathLength: 5, celebrationIntensity: 'calm' });
    expect(f.dailyPathLength).toBe(5);
    expect(f.celebrationIntensity).toBe('calm');
  });

  it('refuses to experiment on privacy/consent surfaces', () => {
    expect(() => assertSafeExperiment('analyticsEnabled')).toThrow();
    expect(() => assertSafeExperiment('syncEnabled')).toThrow();
    expect(() => assertSafeExperiment('scarcityNudge')).toThrow();
    expect(() => applyFlagOverrides({ syncEnabled: true } as never)).toThrow();
  });

  it('rejects unknown experiment keys', () => {
    expect(() => assertSafeExperiment('somethingRandom')).toThrow();
  });
});
