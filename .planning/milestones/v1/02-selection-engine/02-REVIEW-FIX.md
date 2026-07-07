---
phase: 02-selection-engine
fixed_at: 2026-07-05T17:51:00Z
review_path: .planning/phases/02-selection-engine/02-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report — Selection Engine

Summary: 9 in-scope findings (2 critical + 7 warning), all fixed. The 6 Info findings (IN-01..IN-06) are out of scope, not skipped. Full suite: 82 tests pass, 0 fail (baseline 80; +2 from the WR-01 and WR-03 test additions).

## Fixed Issues

- **CR-01** — `2f773b9`: picomatch `dot:true` so dot-prefixed paths (`.github/`, `.env`) fire, plus a `.github/workflows/deploy.yml` regression test. (Under-injection guard — the #1 project risk.)
- **CR-02** — `5ef8da7`: `src/cli/commands/select.ts` budget-overflow path now sets `process.exitCode = 1` instead of `process.exit(1)`, so a piped stdout audit artifact drains fully before exit. Stderr overflow message kept.
- **WR-01** — `f164628`: `src/select/select.ts` empty-triggers branch now runs `matchExclude` first, so an exclude-only rule is skipped `out-of-scope-by-trigger` (detail `matched-then-excluded`) for a matching signal and still fires always-in-phase otherwise. `passesAllGatesIndep` in `select.property.test.ts` updated to match; new unit test in `select.test.ts`.
- **WR-02 / WR-03** — `7036967`: `src/select/eval-harness.ts aggregate()` now throws on an expected id absent from the index (kills vacuous `criticalRecall===1.0`) and throws on a duplicate case name. Uniqueness assertion added to `eval-fixtures.test.ts`.
- **WR-06** — `278d96c`: `SkippedRule` extended with optional `scope?`/`sourceFile?` (`src/types.ts`); superseded skips in `select.ts` now carry the loser's own provenance (severity stays the winner's, by necessity, and is documented). Provenance asserted in `skip-reasons.test.ts`.
- **WR-04 / WR-05** — `7a3616c`: `src/cli/commands/select.ts readIndex` now validates parsed JSON via `validateIndex` (fail-loud, mirroring `validateSignal`) and implements the documented directory→`buildIndex` fallback via `statSync().isDirectory()`, retiring the dead import.
- **WR-07** — `1e59b3e`: `--budget` now requires a non-negative integer (throws otherwise); `readConfigBudget` applies the same guard, treating a bad `token_budget` as absent rather than a spurious overflow.

## Deferred (out of scope — Info tier)

IN-01 (duplicated `DEFAULT_TOKEN_BUDGET`), IN-02 (`--format` not validated), IN-03 (whitespace-only keyword wildcard), IN-04 (`domainName()` `lastIndexOf` fragility), IN-05 (stale `SelectionResult` doc comment), IN-06 (harness doc claim about validation). These are low-severity polish/documentation items; not fixed under `critical_warning` scope.

## Verification

- `npm test`: 82 pass / 0 fail. Recall gate holds: `recall{critical=1.000, high=1.000}`.
- Locked semantics preserved: matching never narrowed (WR-01 errs toward over-injection), budget never truncates, `select()` stays pure/deterministic, output stays sorted by id.

_Iteration 1 (fixer). Re-review confirmation appended by the --auto loop._
