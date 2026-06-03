# Learning model

## Curriculum progression

Facts are introduced in family order, each family carrying a concrete strategy:

| # | Family | Strategy | Notes |
| --- | --- | --- | --- |
| 1 | concept | equal groups + repeated addition | tutorial |
| 2 | concept | arrays / area | tutorial + Garden Arrays |
| 3 | ×0 | `identity_zero` | anything × 0 = 0 |
| 4 | ×1 | `identity_one` | identity |
| 5 | ×2 | `doubling` | "double it" |
| 6 | ×10 | `place_value_ten` | append a zero |
| 7 | ×5 | `fives` | skip-count by 5 |
| 8 | ×4 | `double_double` | double twice |
| 9 | ×3 | `decompose_known` | known fact + one group |
| 10 | — | `commutative` | a×b = b×a (canonical collapse) |
| 11 | ×6 | `five_plus_n` | 5×n + n |
| 12 | ×9 | `ten_minus_n` | 10×n − n |
| 13 | ×7, ×8 | `decompose_known` / `double_double` | harder families |
| 14 | mixed | retrieval + transfer | missing factor, division, word problems |

### Family assignment (important nuance)

A fact's **family is its earliest-introduced operand**, not the harder one. So
`2×7` is taught during **×2** ("double 7"), and `0×7` trivially during **×0** —
neither waits for ×7. Only facts where *both* operands are hard (e.g. `7×8`) land
in a late family. This matches how children actually acquire the table and is
enforced in `facts.ts` + covered by `tests/unit/facts.test.ts`.

We track **canonical facts only** (`a ≤ b`, 66 facts). Both operand orders are
practiced in the UI, but mastery accrues to the single canonical id.

## Per-fact mastery state machine

```
new ──first attempt──▶ learning ──1 independent correct──▶ practicing
practicing ──reach 7-day interval, 2+ independent──▶ strong
strong ──reach 30-day interval + transfer success──▶ mastered
(strong|mastered) ──miss on a due fact──▶ at_risk ──relearn──▶ practicing
```

Tracked per fact (`MasteryState`): attempts, correct, **independentCorrect**,
hintCount, medianLatencyMs, transferSuccess, lapseCount, consecutive
independent/errors, intervalIndex, lastSeenAt, nextDueAt, rolling latencies.

### Promotion rules (non-negotiable)

- **A hint or scaffold never counts as independent.** Only no-hint, no-scaffold
  correct answers advance the interval ladder and the `independentCorrect` KPI.
- **Independent retrieval must be spaced.** The interval ladder
  (`[same-session, 1, 3, 7, 14, 30]` days) is the spacing mechanism; advancement
  requires surviving each step.
- **Transfer gate.** A fact cannot become `mastered` without ≥1 correct transfer
  item (word problem / missing factor / division).
- **Lapses demote + reschedule.** A miss on a scheduled fact drops the interval
  two steps, increments `lapseCount`, and moves strong/mastered facts to
  `at_risk`.

## Spaced repetition

`scheduler.ts` — independent correct → `intervalIndex + 1`; hinted success →
hold; miss → `intervalIndex − 2`. `nextDueAt = now + ladder[index]`. Index 0 is a
same-session revisit (~8 min) so a shaky fact reappears before the session ends.

## Adaptive difficulty & session mix

`sessionBuilder.ts` composes each session as **60% due / 20% fragile / 10% new /
10% easy wins**, with graceful backfill when a pool is short. New facts are gated
by introduction order (prerequisites first). ~20% of established items are
promoted to transfer items. Easy wins lead (warm-up); transfer items trail.

`difficulty.ts` computes a 0–1 **fragility** score from error rate, recent
errors, at-risk status, hint dependence, latency, and lapses. After **2
consecutive errors** on a fact, the session/UI steps it down to a **visual
scaffold** (array + worked strategy).

## KPIs

Per-fact KPIs feed product KPIs in `parent/report.ts`: mixed-review accuracy,
7-/30-day retention, transfer accuracy, hint dependence, session completion,
streak participation, frustration-quit rate, time spent — all surfaced in the
parent dashboard and (with consent) analytics.
