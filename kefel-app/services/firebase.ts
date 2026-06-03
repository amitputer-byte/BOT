/**
 * Firebase edge wiring (optional, lazy, parent-controlled).
 *
 * Firebase is initialised ONLY when the parent enables cloud sync. In local-only
 * mode nothing here is imported at runtime. Auth is parent-only and passwordless
 * (email link). Config comes from app config / env, never hard-coded secrets.
 */
import type { TypedAnalyticsEvent } from '@/analytics/events';
import type { AnalyticsTransport } from './analytics';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  measurementId?: string;
}

let initialized = false;

/**
 * Initialise Firebase lazily. Returns false (and stays offline) if config is
 * absent, so the app degrades gracefully to local-only.
 */
export async function ensureFirebase(config: FirebaseConfig | null): Promise<boolean> {
  if (initialized) return true;
  if (!config?.apiKey) return false;
  // Dynamic import keeps Firebase out of the local-only bundle path.
  const { initializeApp, getApps } = await import('firebase/app');
  if (getApps().length === 0) initializeApp(config);
  initialized = true;
  return true;
}

/** Send a passwordless sign-in link to the parent's email. */
export async function sendParentSignInLink(email: string, redirectUrl: string): Promise<void> {
  const { getAuth, sendSignInLinkToEmail } = await import('firebase/auth');
  await sendSignInLinkToEmail(getAuth(), email, {
    url: redirectUrl,
    handleCodeInApp: true,
  });
}

/** A Firebase Analytics transport, used only when consent + sync are on. */
export function firebaseAnalyticsTransport(): AnalyticsTransport {
  return {
    async send(event: TypedAnalyticsEvent) {
      try {
        const { getAnalytics, logEvent } = await import('firebase/analytics');
        logEvent(getAnalytics(), event.name, event.params as Record<string, unknown>);
      } catch {
        // Never let analytics failures affect the child experience.
      }
    },
  };
}
