/**
 * Analytics sink.
 *
 * - Privacy-by-default: disabled until the parent explicitly opts in.
 * - Local-first: events buffer locally; they are only forwarded to Firebase
 *   Analytics when BOTH analytics consent and cloud sync are enabled.
 * - Pseudonymous: only a local childId is ever attached.
 *
 * The transport is injected so tests can assert on emitted events and so the
 * Firebase dependency stays at the edge.
 */
import type {
  AnalyticsEventName,
  AnalyticsEventMap,
  TypedAnalyticsEvent,
} from '@/analytics/events';

export interface AnalyticsTransport {
  send(event: TypedAnalyticsEvent): void;
}

export interface AnalyticsConfig {
  enabled: boolean;
  childId: string | null;
  transport?: AnalyticsTransport;
}

/** No-op transport used in local-only mode and tests. */
export const nullTransport: AnalyticsTransport = { send: () => undefined };

export class Analytics {
  private enabled: boolean;
  private childId: string | null;
  private transport: AnalyticsTransport;
  /** Small ring buffer kept for the parent "what is collected" transparency view. */
  private readonly recent: TypedAnalyticsEvent[] = [];
  private static readonly RECENT_LIMIT = 50;

  constructor(config: AnalyticsConfig) {
    this.enabled = config.enabled;
    this.childId = config.childId;
    this.transport = config.transport ?? nullTransport;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setChildId(childId: string | null): void {
    this.childId = childId;
  }

  track<K extends AnalyticsEventName>(name: K, params: AnalyticsEventMap[K]): void {
    if (!this.enabled) return; // hard gate — nothing leaves the device
    const event = { name, params, at: Date.now(), childId: this.childId } as TypedAnalyticsEvent;
    this.recent.push(event);
    if (this.recent.length > Analytics.RECENT_LIMIT) this.recent.shift();
    this.transport.send(event);
  }

  /** Read-only view for the privacy/transparency screen. */
  recentEvents(): readonly TypedAnalyticsEvent[] {
    return this.recent;
  }
}

let _instance: Analytics | null = null;

export function initAnalytics(config: AnalyticsConfig): Analytics {
  _instance = new Analytics(config);
  return _instance;
}

export function analytics(): Analytics {
  if (!_instance) _instance = new Analytics({ enabled: false, childId: null });
  return _instance;
}
