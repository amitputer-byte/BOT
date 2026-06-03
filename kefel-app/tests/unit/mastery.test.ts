import { initialMastery, gradeAttempt, type AttemptInput } from '@/features/engine/mastery';
import type { MasteryState } from '@/data/schemas';
import { DAY } from '@/lib/time';

const ATTEMPT: AttemptInput = {
  correct: true,
  usedHint: false,
  scaffolded: false,
  isTransferItem: false,
  latencyMs: 3000,
};

/** Drive a fact through N independent-correct attempts across spaced days. */
function driveIndependent(
  start: MasteryState,
  n: number,
  opts: Partial<AttemptInput> = {},
): MasteryState {
  let s = start;
  let t = 0;
  for (let i = 0; i < n; i++) {
    t += 2 * DAY;
    s = gradeAttempt(s, { ...ATTEMPT, ...opts }, t).next;
  }
  return s;
}

describe('mastery state machine', () => {
  it('starts new and moves to learning on first attempt', () => {
    const s0 = initialMastery('c', '3x4');
    expect(s0.status).toBe('new');
    const s1 = gradeAttempt(s0, { ...ATTEMPT, correct: false, latencyMs: 5000 }, 1000).next;
    expect(s1.status).toBe('learning');
    expect(s1.attempts).toBe(1);
  });

  it('reaches practicing after one independent correct', () => {
    const s = gradeAttempt(initialMastery('c', '3x4'), ATTEMPT, 1000).next;
    expect(s.status).toBe('practicing');
    expect(s.independentCorrect).toBe(1);
  });

  it('does NOT count hinted success as independent', () => {
    const s = gradeAttempt(initialMastery('c', '3x4'), { ...ATTEMPT, usedHint: true }, 1000).next;
    expect(s.independentCorrect).toBe(0);
    expect(s.hintCount).toBe(1);
    expect(s.status).toBe('learning'); // attempted but no independent retrieval yet
  });

  it('requires a transfer item before final mastery', () => {
    // Many independent retrievals but no transfer item -> tops out at strong.
    const strong = driveIndependent(initialMastery('c', '3x4'), 8);
    expect(strong.status).toBe('strong');
    expect(strong.intervalIndex).toBeGreaterThanOrEqual(5);

    // One transfer success unlocks mastered.
    const mastered = gradeAttempt(strong, { ...ATTEMPT, isTransferItem: true }, 100 * DAY);
    expect(mastered.next.status).toBe('mastered');
    expect(mastered.events.mastered).toBe(true);
  });

  it('demotes a strong fact to at_risk on a later miss and flags a lapse', () => {
    const strong = driveIndependent(initialMastery('c', '3x4'), 8);
    const lapse = gradeAttempt(strong, { ...ATTEMPT, correct: false, latencyMs: 8000 }, 200 * DAY);
    expect(lapse.next.status).toBe('at_risk');
    expect(lapse.events.lapsed).toBe(true);
    expect(lapse.next.lapseCount).toBe(1);
  });

  it('asks for a scaffold after two consecutive errors', () => {
    let s = gradeAttempt(initialMastery('c', '3x4'), { ...ATTEMPT, correct: false }, 1000).next;
    const r = gradeAttempt(s, { ...ATTEMPT, correct: false }, 2000);
    expect(r.next.consecutiveErrors).toBe(2);
    expect(r.events.shouldScaffoldNext).toBe(true);
  });

  it('tracks median latency over a rolling window', () => {
    let s = initialMastery('c', '3x4');
    for (const ms of [1000, 5000, 3000]) {
      s = gradeAttempt(s, { ...ATTEMPT, latencyMs: ms }, 1000).next;
    }
    expect(s.medianLatencyMs).toBe(3000);
  });
});
