# Privacy & safety

Privacy-by-default is a product requirement, not a setting. The app is designed
so a child can learn the entire multiplication table without any personal data
ever leaving the device.

## Posture

- **Local-first.** All data lives in on-device SQLite. Cloud sync is **off by
  default** and only turns on if a parent explicitly enables it.
- **No child PII.** No email/password child login. The child profile is
  pseudonymous: a chosen **nickname** (explicitly "not a real name"), an emoji
  avatar, and a locally-generated UUID. Nothing else identifies the child.
- **No sensitive sensors or data.** The app requests **no** camera, microphone,
  geolocation, contacts, photos, or biometric permissions (`app.json` declares an
  empty Android permission list).
- **No dark patterns.** No ads, no behavioral targeting, no chat, no social feed,
  no public leaderboards, no purchase hooks, no scarcity pressure.

## Parent controls (Settings → Privacy)

| Control | Effect |
| --- | --- |
| Local-only mode | Default on; reflects "sync off". |
| Sync on/off | Enables/disables optional Firebase sync; emits `sync_enabled/disabled`. |
| Analytics on/off | Off by default; hard-gates the analytics sink. |
| Reset progress | Clears mastery/attempts/sessions/rewards; keeps the profile. |
| Delete child data | Wipes everything for the child and returns to onboarding. |

A plain-language Hebrew summary lives at `content/he/privacy.ts` and is shown on
the **Privacy** screen, reachable from the adult area. It explains, in parent
language: what is collected, where it is stored, what is **not** collected,
anonymous-usage opt-in, and how to delete everything.

## Data minimization

Only data needed for learning and reporting is stored: profile, per-fact mastery,
an append-only attempt log, session summaries, rewards/streak. The SQLite schema
(`data/db.ts`) contains no free-text or contact fields.

## Adult/child separation

The adult area (`app/(parent)`) sits behind a **math gate** — a 2-digit ×
1-digit problem regenerated on every entry (`services/parentGate.ts`). There is
no stored PIN to leak or reset. The child area is gate-free so the child never
needs an adult to re-enter after onboarding.

## Auth (only when sync is enabled)

Parent-only, passwordless **email-link** sign-in via Firebase Auth
(`services/firebase.ts`). The child never authenticates. Auth tokens, when
present, are intended for `expo-secure-store`.

## Experiment guardrails

`services/remoteConfig.ts` will **throw** if any experiment targets a
privacy/consent/scarcity/nudge surface. Only learning/UX parameters are
experimentable. Enforced by `tests/unit/experiments.test.ts`.
