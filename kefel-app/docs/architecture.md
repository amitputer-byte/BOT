# Architecture

## Principles

1. **Pure engine, impure edges.** Everything pedagogically important lives in
   `features/engine` and `lib` as pure, deterministic functions with no React or
   Expo imports. They are 100% unit-tested and reproducible under a seed.
2. **Data-driven content.** All Hebrew strings, hints, word problems, strategies,
   badges and cosmetics live in `content/` as typed TS objects — no content is
   hard-coded inside components.
3. **Repository boundary.** The store talks only to a `Repository` interface.
   SQLite (device) and in-memory (tests / fallback) implementations are byte-for-
   byte interchangeable.
4. **Privacy at the edge.** Firebase is dynamically imported and only initialised
   when a parent enables sync. Analytics is hard-gated by consent.

## Layers

```
            ┌─────────────────────────────────────────────┐
   UI       │ app/ (Expo Router)  ·  components/  ·  theme/ │
            └───────────────▲─────────────────────────────┘
                            │ selectors / actions
            ┌───────────────┴─────────────────────────────┐
  State     │ features/store/appStore.ts  (Zustand)        │
            └───────▲───────────────▲─────────────▲────────┘
                    │               │             │
        ┌───────────┴──┐   ┌────────┴───────┐  ┌──┴───────────────┐
 Domain │ engine/      │   │ rewards/       │  │ parent/report.ts │  (all pure)
        │ facts        │   │ streak/stars   │  └──────────────────┘
        │ scheduler    │   └────────────────┘
        │ mastery      │
        │ difficulty   │   ┌────────────────────────────────────┐
        │ sessionBuild │   │ content/ (Hebrew banks + i18n)      │
        └──────────────┘   └────────────────────────────────────┘
                    │
        ┌───────────┴─────────────────────────────────────────────┐
 Infra  │ data/ (Zod schemas, repositories, sqlite, migrations)    │
        │ services/ (analytics, firebase, remoteConfig, runtime)   │
        └─────────────────────────────────────────────────────────┘
```

## Key modules

| Module | Responsibility |
| --- | --- |
| `features/engine/facts.ts` | Canonical fact deck (66 facts), families, strategies, intro order. |
| `features/engine/scheduler.ts` | Interval ladder, due calc, lapse handling. |
| `features/engine/mastery.ts` | `gradeAttempt` — the per-answer state machine + KPIs. |
| `features/engine/difficulty.ts` | Fragility score, distractors, orientation. |
| `features/engine/sessionBuilder.ts` | Composes a session from the mix + pools. |
| `features/lesson/processAnswer.ts` | Pure answer pipeline (attempt + grade + stars). |
| `features/rewards/rewards.ts` | Stars + forgiving weekly streak. |
| `features/parent/report.ts` | KPI aggregation → `ParentReportSnapshot`. |
| `features/store/appStore.ts` | Orchestration: engine ⇄ repo ⇄ analytics ⇄ rewards. |
| `data/repositories/*` | Persistence (interface + sqlite + memory). |
| `services/*` | Analytics sink, Firebase edge, remote-config flags, i18n. |

## Determinism & seeding

`lib/random.ts` provides a `mulberry32` PRNG. Sessions, distractors, content
variation and games all derive seeds from a base + string key, so the same input
always yields the same output. This makes the engine testable and keeps A/B
variants reproducible. Engine functions take an explicit `now` (epoch ms) rather
than reading the clock.

## RTL strategy

- `app/_layout.tsx` calls `I18nManager.forceRTL(true)` at module load.
- `lib/rtl.ts` wraps LTR fragments (numbers, `a × b`) in Unicode isolates
  (`LRI…PDI`) so math never reflows inside Hebrew sentences.
- `services/i18n.ts` auto-isolates numeric interpolations.
- Components use `flexDirection: 'row-reverse'` and `writingDirection: 'rtl'`.

## State flow for one answer

1. UI calls `store.answer({correct, …})`.
2. `processAnswer` runs `gradeAttempt` (mastery + scheduler) → next state.
3. Store persists the attempt + mastery via the repository.
4. Stars awarded; mastery/lapse/badge events emitted to analytics (if consented).
5. Store advances the session; UI re-renders from the new state.
