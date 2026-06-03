# Analytics

Analytics is **off by default** and only flows when a parent opts in *and* sync
is enabled. Every event carries at most a pseudonymous `childId`. The taxonomy is
fully typed in `analytics/events.ts`; the sink in `services/analytics.ts`
hard-gates on consent and keeps a small local ring buffer for the parent
transparency view.

## Event taxonomy

| Event | Typed params |
| --- | --- |
| `app_open` | `coldStart` |
| `onboarding_started` | — |
| `onboarding_completed` | `durationMs`, `avatar` |
| `baseline_completed` | `itemsAnswered`, `correct` |
| `lesson_started` | `sessionId`, `itemsPlanned` |
| `lesson_completed` | `sessionId`, `correct`, `total`, `durationMs` |
| `review_started` | `sessionId`, `dueCount` |
| `review_completed` | `sessionId`, `correct`, `total` |
| `fact_answered` | `factId`, `family`, `correct`, `usedHint`, `scaffolded`, `isTransfer`, `latencyMs`, `activity` |
| `hint_used` | `factId`, `family`, `strategy` |
| `fact_mastered` | `factId`, `family`, `attempts` |
| `lapse_detected` | `factId`, `from`, `to` |
| `reward_earned` | `kind` (`stars`\|`badge`), `amount`, `id` |
| `streak_updated` | `weeklyCount`, `shieldUsed` |
| `parent_dashboard_viewed` | `masteredFacts`, `dueToday` |
| `privacy_setting_changed` | `setting`, `enabled` |
| `sync_enabled` / `sync_disabled` | `trigger` |

Hebrew labels for an admin/parent-facing view are in `EVENT_LABELS_HE` (no raw
English identifiers are shown in any UI).

## Type safety

`AnalyticsEventMap` maps each event name to its param shape. `analytics.track(name, params)`
is generic over that map, so a wrong param shape is a compile error. The transport
is injected, which is how `tests/unit/store.test.ts` asserts the consent gate
(no events emitted while disabled; events flow after opt-in).

## A/B experiments

Experiment flags (`services/remoteConfig.ts`): `dailyPathLength`, `hintOrder`,
`rewardCadence`, `homeCtaPriority`, `celebrationIntensity`. Privacy/consent
surfaces are explicitly **non-experimentable** and rejected at runtime.
