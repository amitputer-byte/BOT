# Assumptions & honest gaps

Decisions made under ambiguity (per the workflow: make the safest reasonable
assumption, record it, continue), plus an honest list of what is and isn't done.

## Product / pedagogy assumptions

1. **App name**: "כפל קסם" (Kefel Kesem / "Multiplication Magic"). Chosen as a
   warm, non-babyish Hebrew name; trivially changeable in `app.json` + `ui.ts`.
2. **Fact family = earliest-introduced operand.** `2×7` is a ×2 ("double 7")
   fact, `0×7` a ×0 fact. This models real acquisition order; an alternative
   (harder-operand) model was rejected because it would delay trivial facts.
   See `docs/learning-model.md`.
3. **Canonical-only mastery** (66 facts, `a ≤ b`); both orientations are shown in
   the UI but credit accrues to one canonical id.
4. **Mastery thresholds** (e.g. interval index ≥ 3 for `strong`, ≥ top + transfer
   for `mastered`, `independentCorrect` counts) are reasonable defaults, centralised
   in `mastery.ts`/`scheduler.ts` and easy to tune.
5. **Parent gate** is a 2-digit × 1-digit math challenge rather than a PIN — no
   secret to store/leak/reset, and child-resistant by design.
6. **Baseline** probes the easiest families (×1/×2/×10) with 4 items to seed a
   realistic starting picture; it is intentionally short and pressure-free.

## Privacy assumptions

7. Analytics and sync are **off by default**; analytics requires *both* consent
   and sync to actually transmit.
8. Firebase config is expected via app config/env (`services/firebase.ts`); no
   secrets are committed. Without config the app stays fully local.

## Implementation completeness — done

- ✅ Pure engine (facts, scheduler, mastery, difficulty, session builder) — tested.
- ✅ All 11 Zod schemas + repository interface + SQLite + in-memory impls.
- ✅ Hebrew content banks (UI, hints, feedback, word problems, tutorial, parent
  summary, privacy) + bidi-safe i18n.
- ✅ Rewards + forgiving streak; reward catalogue & badges.
- ✅ Zustand store orchestrating engine/repo/rewards/analytics — integration-tested.
- ✅ Typed analytics taxonomy + consent-gated sink; experiment guardrails.
- ✅ Parent report aggregation (KPIs/heatmap/recommendation/export) — tested.
- ✅ Screens: onboarding, child home, lesson, review, celebration, parent gate,
  dashboard, settings, privacy.
- ✅ Mini-games: Garden Arrays, Balloon Pop, Multiplication Train, Magic Lab.
- ✅ 69 passing unit tests; component + e2e suites authored.

## Implementation completeness — deferred / partial (honest)

1. **Component & e2e suites are not executed here.** They require the full Expo/RN
   toolchain + emulator, which the build sandbox lacks. They are written against
   real components and shipped Hebrew strings, but treat them as un-run until you
   execute them locally/CI.
2. **Cloud sync is wired at the edges, not end-to-end.** `firebase.ts` lazily
   initialises and exposes auth + an analytics transport; a full Firestore
   read/write/merge sync adapter and Cloud Functions for server-side aggregation
   are **stubs/intentionally out of scope** for this pass. The repository boundary
   is ready for a `FirestoreRepository` to slot in.
3. **Cosmetic shop is modeled but has no purchase screen.** `RewardInventory`,
   `COSMETICS`, costs, and equip slots exist; a shop UI to spend stars is not built.
4. **expo-secure-store** is referenced for parent tokens but only exercised once a
   real Firebase auth flow is added.
5. **Audio** uses `expo-speech` TTS for instruction replay; no recorded VO assets
   are bundled.
6. **Detox e2e** uses Hebrew-text matchers; adding stable `testID`s would make it
   more robust and is recommended before wiring CI.
7. **Reduced-motion** is honoured in the celebration; animated transitions
   elsewhere are kept minimal/static rather than custom-animated.
8. **Assets** (icons, splash, fonts) are not included; default Expo assets apply.

None of the deferred items block the acceptance criteria that depend on the
learning engine, offline local-only operation, scheduling, scaffolding, parent
reporting, privacy controls, or PII-free onboarding — all of which are implemented
and (for logic) tested.
