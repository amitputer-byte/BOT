# Testing

## Test pyramid

| Layer | Tooling | Location | Runs offline here? |
| --- | --- | --- | --- |
| Unit (engine/logic) | Jest + ts-jest (node) | `tests/unit` | ✅ yes |
| Component (RTL/screens) | Jest-expo + RNTL | `tests/component` | needs RN toolchain |
| End-to-end (flows) | Detox | `tests/e2e` | needs a device build |

`jest.config.js` defines two projects (`engine`, `component`). The pure unit
tests have **no React Native dependency** and are the fast inner loop.

## Unit coverage (69 tests, all passing)

| Suite | What it locks down |
| --- | --- |
| `facts.test.ts` | 66-fact deck, canonical collapse, family assignment, ordering. |
| `scheduler.test.ts` | Interval ladder, due/overdue, lapse accounting. |
| `mastery.test.ts` | State machine, hint≠independent, transfer gate, lapse demotion, scaffold trigger, latency. |
| `difficulty.test.ts` | Fragility ordering, distractor validity/determinism. |
| `sessionBuilder.test.ts` | Cold-start frontier, due priority, scaffold switch, determinism. |
| `rewards.test.ts` | Star awards, weekly streak, shield recovery, week reset. |
| `content.test.ts` | Deterministic content, correct word-problem answers, strategy hints. |
| `gameLogic.test.ts` | Fact picking, array validation, balloons, train pairs, lab challenge. |
| `report.test.ts` | KPI math, heatmap, recommendation, export shape. |
| `store.test.ts` | **Full integration**: onboarding → play → rewards → streak → consent gate → delete. |
| `i18n.test.ts` | Key resolution, number isolation, no-English-in-UI guard. |
| `experiments.test.ts` | Privacy guardrails reject protected experiment surfaces. |

### Running the engine tests

```bash
npm run test:unit
```

> The CI/dev machine needs `ts-jest`, `jest`, `typescript`, `@types/jest` and
> `zustand` (the latter for `store.test.ts`). They come in via `npm install`.

## Component tests (RTL)

`tests/component/rtl.test.tsx` (jest-expo) verifies right-alignment + RTL writing
direction, that `a × b` stays LTR-isolated inside the RTL layout, accessible star
labels, and **mixed-direction** Hebrew-sentence-plus-number rendering.

```bash
npm run test:component
```

## End-to-end (Detox)

`tests/e2e/flows.e2e.ts` covers every acceptance flow: onboarding, completing a
lesson, due review, reward unlock + celebration, parent-dashboard access through
the gate, local-only default, and sync enable/disable. Matchers use the shipped
Hebrew strings + accessibility labels.

```bash
detox build -c android.emu.debug
npm run e2e
```

## What is and isn't validated in this environment

- ✅ All pure logic ran green here (`69/69`).
- ⏳ Component + e2e suites are authored and configured but require the full
  Expo/RN toolchain and a device/emulator, which this sandbox does not provide.
  See `ASSUMPTIONS.md`.
