/**
 * App runtime composition root.
 *
 * Picks the persistence backend (SQLite on device) and wires analytics with the
 * parent's consent. Kept tiny and side-effect-light so it can be swapped for the
 * memory repo in tests/Storybook.
 */
import { SqliteRepository } from '@/data/repositories/sqlite';
import { MemoryRepository } from '@/data/repositories/memory';
import type { Repository } from '@/data/repositories/types';
import { Analytics, initAnalytics } from '@/services/analytics';

export interface Runtime {
  repo: Repository;
  analytics: Analytics;
}

let _runtime: Runtime | null = null;

export function createRuntime(useMemory = false): Runtime {
  if (_runtime) return _runtime;
  const repo: Repository = useMemory ? new MemoryRepository() : new SqliteRepository();
  // Disabled until the parent opts in during onboarding/settings.
  const analytics = initAnalytics({ enabled: false, childId: null });
  _runtime = { repo, analytics };
  return _runtime;
}
