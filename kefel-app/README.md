# כפל קסם — Kefel Kesem

A Hebrew-first, RTL, offline-capable multiplication learning app for a 2nd-grade
child (ages 7–8). Concept-first → fluency → transfer, with adaptive difficulty,
spaced repetition, playful mini-games, and a privacy-by-default design.

> **Scope note for reviewers.** The learning brain (engine, scheduler, mastery
> model, adaptive selector, content banks, reporting, store) is fully
> implemented and **unit-tested (69 passing tests)**. The UI layer (screens,
> components, mini-games, parent area) is real, typed, and wired to that brain.
> Known gaps and deferred work are listed honestly in [`ASSUMPTIONS.md`](./ASSUMPTIONS.md).

## Features

- 🇮🇱 **Hebrew-only child experience**, full RTL, no niqqud, bidi-isolated numbers.
- 🧠 **Concept → fluency → transfer** curriculum: equal groups, arrays, ×0/×1,
  ×2, ×10, ×5, ×4 (double-double), ×3, commutativity, ×6, ×9, ×7/×8, mixed
  fluency, missing factor, inverse division, word problems.
- 🔁 **Spaced repetition** (same-session, 1, 3, 7, 14, 30 days) + per-fact mastery
  state machine (`new → learning → practicing → strong → mastered`, with
  `at_risk` for lapses).
- 🎯 **Adaptive difficulty**: fragility scoring, session mix (60% due / 20%
  fragile / 10% new / 10% easy), automatic scaffold step-down after 2 errors.
- 🎮 **Mini-games**: Garden Arrays, Balloon Pop, Multiplication Train, Magic Lab —
  each mapped to a learning outcome.
- ⭐ **Forgiving rewards**: one soft currency (stars), cosmetic-only unlocks,
  outcome-based badges, weekly self-healing streak. No monetization, no scarcity.
- 👪 **Parent dashboard**: mastery heatmap, retention, hint dependence, transfer,
  time, one recommended action, exportable summary.
- 🔒 **Privacy-by-default**: local-only by default, no PII, no ads/chat/social,
  no camera/mic/location/contacts. Optional parent-controlled cloud sync.

## Tech stack

Expo (React Native) + TypeScript · Expo Router · Zustand · React Query ·
expo-sqlite · expo-secure-store · Firebase (optional sync/auth/analytics/remote
config) · Zod · Jest + React Native Testing Library · Detox · ESLint + Prettier.

## Getting started

```bash
cd kefel-app
npm install
npm start            # Expo dev server (press i / a / w)
```

The app forces RTL and Hebrew on first frame and boots straight into onboarding
(parent gate → consent → nickname → avatar → baseline → tutorial → child home).
It is fully usable offline; cloud sync stays off until a parent enables it.

### Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm test` | Jest (engine unit + component projects) |
| `npm run test:unit` | Pure engine/logic tests (fast, node) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run e2e` | Detox end-to-end flows (needs a build) |

### Running the engine tests without the full RN toolchain

The pure engine/logic tests have no React Native dependencies. They are the
fastest way to validate the core:

```bash
npm run test:unit
```

## Project layout

```
app/         Expo Router routes (onboarding, (child), (parent))
features/    engine, lesson, review, games, rewards, onboarding, parent, store
components/  reusable RTL/accessible UI kit
content/     Hebrew content banks + i18n dictionary
data/        Zod schemas + repositories (sqlite + memory) + migrations
services/    analytics, firebase, remoteConfig, runtime, parentGate, i18n
analytics/   typed event taxonomy
theme/       design tokens + ThemeProvider
lib/         pure utilities (rng, time, rtl, math, a11y, result)
tests/       unit (node) · component (jest-expo) · e2e (detox)
docs/        architecture, learning-model, privacy, analytics, testing
```

See [`docs/architecture.md`](./docs/architecture.md) for the full picture.

## Documentation

- [Architecture](./docs/architecture.md)
- [Learning model](./docs/learning-model.md)
- [Privacy](./docs/privacy.md)
- [Analytics](./docs/analytics.md)
- [Testing](./docs/testing.md)
- [Assumptions & gaps](./ASSUMPTIONS.md)
