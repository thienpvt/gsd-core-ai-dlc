---
phase: 02-selection-engine
reviewed: 2026-07-05T18:33:00Z
depth: deep
iteration: 2
files_reviewed: 8
files_reviewed_list:
  - src/select/select.ts
  - src/select/tokens.ts
  - src/select/validate-signal.ts
  - src/select/eval-harness.ts
  - src/cli/commands/select.ts
  - src/cli/index.ts
  - src/schema/task-signal.schema.json
  - src/types.ts
findings:
  critical: 0
  warning: 0
  info: 6
  total: 6
status: clean
---

# Phase 2: Code Review Report — Selection Engine (iteration 2, re-review)

**Depth:** deep (cross-file re-verification after fixes)
**Status:** clean — all 2 Critical + 7 Warning from iteration 1 resolved; only the 6 deliberately-deferred Info items persist.

## Re-review outcome

Iteration 1 found 2 Critical + 7 Warning + 6 Info. All 9 in-scope (Critical + Warning) findings were fixed across commits `2f773b9`, `5ef8da7`, `f164628`, `7036967`, `278d96c`, `7a3616c`, `1e59b3e`. This re-review confirms each fix is correct and introduced no new Critical/Warning regression. The full suite is 82 tests green (baseline 80 + WR-01 and WR-03 test additions), and the core-value recall gate holds: `microRecall=1.000 recall{critical=1.000, high=1.000, medium=1.000, low=1.000}`.

### Resolved (verified)

- **CR-01** (`2f773b9`) — `matchPaths` compiles with `picomatch(glob, { dot: true })`; dot-prefixed paths (`.github/`, `.env`) now fire. Regression test `paths axis dotfiles (CR-01)` passes. Under-injection vector closed.
- **CR-02** (`5ef8da7`) — budget-overflow CLI path uses `process.exitCode = 1` (not `process.exit(1)`), so a piped stdout audit artifact drains fully before exit. Matches the safe idiom already in `cli/index.ts:39`.
- **WR-01** (`f164628`) — empty-triggers branch consults `matchExclude` first (D-02 exclude-wins), so an exclude-only rule is skipped `out-of-scope-by-trigger` (detail `matched-then-excluded`) for a matching signal. **No-regression verified:** `matchExclude(undefined)` returns `false` (select.ts:137), so an empty-triggers rule with no exclude still fires always-in-phase (explicit test passes). `passesAllGatesIndep` in the property test updated to mirror the check — the cross-check stays honest.
- **WR-02 / WR-03** (`7036967`) — `eval-harness.ts aggregate()` throws on an expected id absent from the index (kills vacuous `criticalRecall===1.0`) and on a duplicate case name. Uniqueness assertion added to `eval-fixtures.test.ts` and passes. No false-trip on the real corpus (recall gate green).
- **WR-04 / WR-05** (`7a3616c`) — `readIndex` validates parsed JSON via `validateIndex` (fail-loud, mirroring `validateSignal`) and implements the documented directory→`buildIndex` fallback via `statSync().isDirectory()`; dead import retired.
- **WR-06** (`278d96c`) — `SkippedRule` extended with optional `scope?`/`sourceFile?`; superseded skips carry the loser's own provenance (`scope: loser.scope, sourceFile: loser.sourceFile`); severity stays the winner's by necessity and is documented. Determinism/sort and total-accounting invariants preserved.
- **WR-07** (`1e59b3e`) — `--budget` and `readConfigBudget` require a non-negative integer; a nonsensical value is rejected/treated-as-absent rather than turned into a spurious overflow.

## Persisting Info (deferred — out of scope for critical_warning fixing)

These 6 low-severity items were deliberately not fixed under the `critical_warning` scope. They are polish/documentation items, tracked for a future pass:

- **IN-01** — `DEFAULT_TOKEN_BUDGET = 2000` duplicated in `select.ts` and `cli/commands/select.ts` (drift risk).
- **IN-02** — `--format` not validated; a non-`text` value silently falls back to JSON.
- **IN-03** — a whitespace-only trigger keyword becomes a match-everything wildcard after `trim()` (over-injection, safe direction).
- **IN-04** — `domainName()` uses `lastIndexOf("domain")`; fragile for a domain literally named `domain`.
- **IN-05** — stale `SelectionResult` doc comment in `types.ts` (says core leaves budget fields unset; it now populates them).
- **IN-06** — `select()` doc claims "CLI/harness boundary validates" but `runCases` passes cast-only fixture signals.

## Cross-file confirmation (deep pass)

- **Determinism (SEL-01):** no clock/`Math.random`/Set-order dependence in `select()`; both output arrays sorted by id. WR-06's added fields do not perturb sort order (sort key is `id`).
- **Under-injection (#1 risk):** WR-01 errs toward over-injection; CR-01 widens path matching; no fix narrows matching.
- **Never-truncate budget (SEL-05):** core still never slices `selected`; CLI emits the full result and only sets a non-zero exit code.
- **Recall gate integrity:** WR-02/03 self-defending throws do not false-trip; `criticalRecall === 1.0`, `highRecall === 1.0`.

---

_Reviewed: 2026-07-05T18:33:00Z (iteration 2)_
_Reviewer: Claude (gsd-code-reviewer re-review; verdict persisted by orchestrator after the re-review agent hit repeated upstream errors — confirmed against the fix diffs and the full 82-test suite + recall-gate output)_
_Depth: deep_
