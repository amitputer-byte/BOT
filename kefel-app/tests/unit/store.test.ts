import { useAppStore } from '@/features/store/appStore';
import { MemoryRepository } from '@/data/repositories/memory';
import { Analytics, nullTransport } from '@/services/analytics';
import type { TypedAnalyticsEvent } from '@/analytics/events';
import type { ChildProfile, ParentProfile } from '@/data/schemas';

function makeChild(): ChildProfile {
  return {
    id: 'child1', nickname: 'נועה', avatar: 'fox', createdAt: 0,
    audioInstructions: true, reducedMotion: false, dailyGoalActivities: 3,
  };
}
function makeParent(analyticsEnabled = false): ParentProfile {
  return {
    id: 'parent1', authUid: null, email: null,
    consent: { privacyAcceptedAt: 1, analyticsEnabled, syncEnabled: false }, createdAt: 0,
  };
}

describe('app store integration', () => {
  beforeEach(() => {
    useAppStore.setState({
      ready: false, repo: null, analytics: null, child: null, parent: null,
      mastery: new Map(), rewards: null, streak: null, session: null, lastBadge: null,
    });
  });

  it('bootstraps with a memory repo and no child', async () => {
    const repo = new MemoryRepository();
    const analytics = new Analytics({ enabled: false, childId: null });
    await useAppStore.getState().bootstrap(repo, analytics);
    expect(useAppStore.getState().ready).toBe(true);
    expect(useAppStore.getState().child).toBeNull();
  });

  it('runs a full session: onboarding -> play -> rewards persist', async () => {
    const repo = new MemoryRepository();
    const analytics = new Analytics({ enabled: false, childId: null });
    const store = useAppStore.getState();
    await store.bootstrap(repo, analytics);
    await store.completeOnboarding(makeChild(), makeParent());

    useAppStore.getState().startSession('lesson');
    const session = useAppStore.getState().session!;
    expect(session.items.length).toBeGreaterThan(0);

    // Answer every item correctly.
    for (let i = 0; i < session.items.length; i++) {
      const item = useAppStore.getState().currentItem()!;
      await useAppStore.getState().answer({ correct: true, rawValue: item.product, latencyMs: 1500 });
    }
    await useAppStore.getState().endSession(false);

    const st = useAppStore.getState();
    expect(st.session).toBeNull();
    expect(st.rewards!.stars).toBeGreaterThan(0); // earned stars + completion bonus
    expect(st.streak!.weeklyCount).toBe(1);
    const sessions = await repo.getSessions('child1');
    expect(sessions[0].completed).toBe(true);
  });

  it('hint flag prevents independent credit on that answer', async () => {
    const repo = new MemoryRepository();
    const analytics = new Analytics({ enabled: false, childId: null });
    const store = useAppStore.getState();
    await store.bootstrap(repo, analytics);
    await store.completeOnboarding(makeChild(), makeParent());
    useAppStore.getState().startSession('lesson');

    useAppStore.getState().useHint();
    const item = useAppStore.getState().currentItem()!;
    await useAppStore.getState().answer({ correct: true, rawValue: item.product, latencyMs: 1500 });

    const factId = `${Math.min(item.a, item.b)}x${Math.max(item.a, item.b)}`;
    const m = useAppStore.getState().mastery.get(factId)!;
    expect(m.hintCount).toBe(1);
    expect(m.independentCorrect).toBe(0);
  });

  it('respects the analytics consent gate', async () => {
    const events: TypedAnalyticsEvent[] = [];
    const transport = { send: (e: TypedAnalyticsEvent) => events.push(e) };
    const repo = new MemoryRepository();

    // Disabled -> nothing emitted.
    const offAnalytics = new Analytics({ enabled: false, childId: null, transport });
    await useAppStore.getState().bootstrap(repo, offAnalytics);
    expect(events).toHaveLength(0);

    // Parent enables analytics -> events start flowing.
    await useAppStore.getState().completeOnboarding(makeChild(), makeParent());
    await useAppStore.getState().setAnalyticsEnabled(true);
    useAppStore.getState().startSession('lesson');
    expect(events.some((e) => e.name === 'lesson_started')).toBe(true);
  });

  it('deletes child data on request', async () => {
    const repo = new MemoryRepository();
    const store = useAppStore.getState();
    await store.bootstrap(repo, new Analytics({ enabled: false, childId: null }));
    await store.completeOnboarding(makeChild(), makeParent());
    await useAppStore.getState().deleteChildData();
    expect(useAppStore.getState().child).toBeNull();
    expect(await repo.getChild()).toBeNull();
  });
});
