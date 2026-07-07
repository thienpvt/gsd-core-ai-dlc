---
phase: 02-selection-engine
verified: 2026-07-05T18:42:41Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 2: Selection Engine Verification Report

**Phase Goal:** Given a task's signals plus the current phase and scope config, the engine deterministically returns exactly the matching rules with a reason for each, proven against a labeled eval set and held within a per-request token budget.
**Verified:** 2026-07-05T18:42:41Z
**Status:** passed
**Re-verification:** No — initial verification

## Mode note

The roadmap tags this phase `mode: mvp`, but the phase goal is a technical contract, not a User Story (`As a ..., I want to ..., so that ...`). Rather than refuse on the User-Story format guard, I verified goal-backward against the roadmap's five explicit, machine-verifiable success criteria (the contract) plus each PLAN's frontmatter truths — all confirmed against the actual codebase with a clean build, a 82/82 test run, and an end-to-end CLI exercise I ran myself.

## Goal Achievement

### Observable Truths (roadmap success criteria — the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `governance select` returns rule ids each with a reason; identical inputs always produce identical output (determinism) | VERIFIED | Ran CLI end-to-end: 3 selected rules each with `matchedAxis`/`matchedValue`, 8 skipped each with a `reason`. `select.test.ts` determinism test asserts byte-identical JSON on repeat (pass). Property invariant 2 proves stable byte-identical ordering across 30 generated corpora (pass). |
| 2 | For every candidate rule, output records selected-or-skipped and why (observability) | VERIFIED | CLI output accounts for all 11 candidates (10 winners + 1 superseded loser) as 3 selected + 8 skipped. `total accounting` test asserts selected+skipped === winners + Σ superseded. `observability` test asserts every selected has a valid axis+non-empty value, every skip a valid reason enum. |
| 3 | Labeled (task, phase) → expected-rules eval set runs, reports recall/precision, critical=100% / high>=0.9 | VERIFIED | `recall.test.ts` CORE-VALUE GATE asserts `criticalRecall === 1.0` and `highRecall >= 0.9` (pass). Observed test-run report line: `microPrecision=1.000 microRecall=1.000 recall{critical=1.000, high=1.000, medium=1.000, low=1.000}`. 12 labeled cases in `eval-cases.json`; `eval-harness.ts` computes micro recall/precision + ground-truth-severity-partitioned recall; precision reported never gated. |
| 4 | Budget overflow surfaces a loud signal, verifiable by a test that trips the budget | VERIFIED | Ran CLI with `--budget 1`: exit code 1, stderr `budget exceeded: used 74 tokens > limit 1 (offenders: ...)`, stdout still complete (1885 bytes, ends `}`, `budgetExceeded: true`, all 3 selected rules incl. 2 criticals present — no truncation). `tokens.test.ts` budget-trip test + `select.smoke.test.ts` Case B both pass. |
| 5 | fast-check property tests confirm core invariants (selected ⊆ triggered; ordering stable) | VERIFIED | `select.property.test.ts` — 4 invariants all pass across 30 generated corpora: (1) selected⊆triggered (independently re-derived), (2) stable ordering, (3) total accounting, (4) exclude-wins. Invariants 1 + 2 are exactly the two named in the criterion. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

Behavior-dependent truths (determinism invariant #1, never-truncate ordering #4) are each backed by a passing behavioral test and, for #4, a CLI run I executed — so they are VERIFIED on behavior, not on symbol presence alone.

### PLAN frontmatter truths (plan-specific detail, all mapped onto the contract)

| Plan | Truth | Status | Evidence |
|------|-------|--------|----------|
| 02-01 | Controlled eval corpus builds to 10 winners covering all severities/axes/exclude/empty/out-of-phase/domain/precedence | VERIFIED | 11 fixture files present under `test/fixtures/eval/eval-rules/`; `build-index` produced 10 rules; `eval-fixtures.test.ts` asserts exactly 10 winners + data-retention project winner with 1 superseded loser (pass). |
| 02-01 | Labeled case set with ~12 cases incl. empty-expected + a critical | VERIFIED | `eval-cases.json` has 12 cases incl. `empty-expected-silent-operations` (`expectedRuleIds: []`) and criticals `secrets-management`/`pci-scope`. |
| 02-01 | Ground-truth integrity proven before engine exists; dedicated fixture store not live aidlc-rules | VERIFIED | `eval-fixtures.test.ts` asserts every expectedRuleId resolves to a real winner id (pass); corpus lives under `test/fixtures/eval/`, isolated from `aidlc-rules/`. |
| 02-02 | Pure `select()` classifies every candidate; deterministic; no clock/random/IO | VERIFIED | `src/select/select.ts` — no `new Date()`/`Math.random`/fs; determinism test byte-identical (pass). |
| 02-02 | Gate order phase→scope→trigger, first failing gate; superseded from winner.superseded[] not re-matched | VERIFIED | `skip-reasons.test.ts` — out-of-phase, out-of-scope, out-of-scope-by-trigger (no-match + matched-then-excluded), superseded, and first-failing-gate order all pass. |
| 02-02 | D-01..D-04 trigger semantics reused (OR-combine, empty=always-in-phase, exclude-wins, per-axis) | VERIFIED | `select.test.ts` — keywords/taskType/paths axes, OR-combine, always-in-phase, dotfile paths (CR-01), exclude-only (WR-01) all pass. |
| 02-02 | Malformed TaskSignal rejected loudly (Ajv 2020) not silent empty selection | VERIFIED | `validate-signal.ts` compiles `task-signal.schema.json`; 3 validateSignal tests (accept good, reject unknown taskType, reject missing axis) pass. |
| 02-03 | estimateTokens=ceil(len/4) zero-dep; budget flags overflow + offenders; NEVER truncates | VERIFIED | `tokens.ts` + budget block in `select.ts`; `tokens.test.ts` asserts selected.length unchanged over-budget vs in-budget (pass). Confirmed via CLI. |
| 02-03 | `governance select` reads/validates signal, resolves budget (flag>config>2000), JSON output, non-zero exit on overflow | VERIFIED | `cli/commands/select.ts` wired into `cli/index.ts` dispatch; smoke test Cases A+B pass; ran both paths end-to-end. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `test/fixtures/eval/eval-rules/**` | 11-file controlled corpus | VERIFIED | All 11 files present across enterprise/domain/project tiers; builds to 10 winners. |
| `test/fixtures/eval/cases/eval-cases.json` | 12 labeled cases | VERIFIED | 12 fully-formed cases incl. empty-expected + critical. |
| `src/select/eval-fixtures.test.ts` | Ground-truth integrity | VERIFIED | Present; 6 integrity assertions pass (WR-02/03 self-defending throws included). |
| `src/select/select.ts` | Pure gate pipeline + budget | VERIFIED | Substantive (329 lines), wired (imported by CLI, harness, tests), no clock/random/IO. |
| `src/select/tokens.ts` | estimateTokens + PER_RULE_OVERHEAD | VERIFIED | `Math.ceil(len/4)` + `PER_RULE_OVERHEAD=6`, imported by select.ts. |
| `src/select/eval-harness.ts` | Pure recall/precision measurement | VERIFIED | scoreCase/runCases/aggregate; imported by recall.test.ts; self-defends on bad labels. |
| `src/select/recall.test.ts` | Build-gating core-value test | VERIFIED | Asserts criticalRecall===1.0 && highRecall>=0.9; passes. |
| `src/select/select.property.test.ts` | 4 fast-check invariants | VERIFIED | `import * as fc`, numRuns:30, real buildIndex temp corpora; all 4 pass. |
| `src/select/validate-signal.ts` | Ajv 2020 signal guard | VERIFIED | Compile-once harness mirroring validate.ts; wired into CLI. |
| `src/schema/task-signal.schema.json` | draft 2020-12 schema | VERIFIED | additionalProperties:false, required [taskType,keywords,paths], 8-member taskType enum. |
| `src/cli/commands/select.ts` | governance select command | VERIFIED | parseArgs allowPositionals:false, validateSignal, budget resolution, process.exitCode=1 on overflow. |
| `src/cli/index.ts` | dispatch wiring | VERIFIED | `case "select"` lazy-import present (line 17). |
| `src/types.ts` | Phase 2 selection types | VERIFIED | TaskSignal/SelectionConfig/SkipReason/MatchedAxis/SelectedRule/SkippedRule/SelectionResult added; Phase 1 types unchanged. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `cli/index.ts` | `cli/commands/select.ts` | dispatch `case "select"` lazy import | WIRED | grep-confirmed line 17; CLI runs end-to-end. |
| `cli/commands/select.ts` | `select/select.ts` | `select(index, signal, config)` | WIRED | Imported + called; CLI emits SelectionResult. |
| `cli/commands/select.ts` | `select/validate-signal.ts` | `validateSignal(signal)` before select | WIRED | Called on parsed input; malformed input throws. |
| `select/select.ts` | `select/tokens.ts` | `estimateTokens` + `PER_RULE_OVERHEAD` | WIRED | grep-confirmed line 23; budget sum uses both. |
| `select/eval-harness.ts` | `select/select.ts` | `runCases` calls `select()` | WIRED | Imported; recall gate measures real select output. |
| `select/recall.test.ts` | `select/eval-harness.ts` | `runCases` + `aggregate` | WIRED | Imported; drives the build-gating gate. |
| `validate-signal.ts` | `schema/task-signal.schema.json` | `ajv.compile(schema)` | WIRED | JSON import + compile; enum/required enforced. |
| `budgetExceeded` (core) | CLI exit code | `process.exitCode = 1` after emitting result | WIRED | Confirmed: exit 1 + full stdout on `--budget 1`. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Production build compiles | `npm run build` | tsc clean, no errors | PASS |
| Full test suite | `npm test` | tests 82, pass 82, fail 0 | PASS |
| build-index on eval corpus | `governance build-index --root test/fixtures/eval/eval-rules` | `wrote ... (10 rules)`, exit 0 | PASS |
| Normal selection emits per-rule reasons | `governance select --phase construction --domains payments` (piped signal) | exit 0, JSON: 3 selected w/ matchedAxis+value, 8 skipped w/ reason (incl. superseded provenance) | PASS |
| Budget overflow: loud signal, no truncation | `governance select ... --budget 1` | exit 1, stderr loud line, stdout complete valid JSON (1885 bytes, ends `}`), budgetExceeded true, 2 criticals still present | PASS |

### Probe Execution

No probes declared in PLANs/SUMMARYs and none found under `scripts/*/tests/probe-*.sh`. Not a migration/probe phase — probe execution not applicable.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEL-01 | 02-01, 02-02 | Deterministic matching returning exactly the matching rules + a reason for each | SATISFIED | Pure select() + determinism test + recall gate over labeled eval set. |
| SEL-04 | 02-02, 02-03 | Records why each candidate was selected or skipped (observability) | SATISFIED | matchedAxis/matchedValue on selected, reason enum on skipped; total-accounting proves none vanish; CLI emits full result. |
| SEL-05 | 02-03 | Per-request token budget + loud signal on overflow | SATISFIED | estimateTokens char/4, never-truncate budget, CLI non-zero exit + stderr on overflow. |

All 3 requirement IDs declared across the plans (SEL-01, SEL-04, SEL-05) match the REQUIREMENTS.md Phase 2 mapping. No orphaned requirements — REQUIREMENTS.md maps exactly SEL-01/04/05 to Phase 2, and all three are claimed by plans and satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No debt markers (TODO/FIXME/XXX/TBD/HACK/PLACEHOLDER) in any phase source file | Info | Clean — grep across `src/select`, `src/cli/commands/select.ts` found none. |

`return { matched: false }` in select.ts and `return undefined` in the CLI's `readConfigBudget` are legitimate control flow / defensive fallbacks, not stubs — each has a real populated path. The 6 Info items from 02-REVIEW.md (IN-01 DEFAULT_TOKEN_BUDGET duplicated 2000/2000; IN-02 --format not validated; IN-03 whitespace keyword wildcard — over-injection, safe direction; IN-04 domainName lastIndexOf edge case; IN-05 stale SelectionResult doc comment in types.ts; IN-06 select() doc vs runCases cast) are documented polish deferred out of the critical/warning scope; none block goal achievement or narrow matching toward under-injection.

### Human Verification Required

None. Every phase behavior is machine-checkable and was exercised: the pure core, the recall gate, the token-budget overflow, and the `governance select` CLI all have automated coverage plus an end-to-end CLI run performed during this verification. No `<verify><human-check>` blocks exist in any PLAN (0 in each).

### Gaps Summary

No gaps. All five roadmap success criteria are observably true in the codebase, all nine plan-level truths verify, all artifacts exist / are substantive / are wired, all key links connect, requirements SEL-01/04/05 are satisfied, the build is clean, and the full 82-test suite passes — including the CORE-VALUE recall gate (`criticalRecall === 1.0`, `highRecall === 1.0`), the never-truncate budget test, the four fast-check invariants, and the budget-overflow smoke test. The `governance select` CLI was exercised end-to-end in both the normal-selection and budget-overflow paths: the overflow case exits non-zero with a loud stderr signal while emitting the complete, untruncated SelectionResult (both critical rules retained) to stdout — the defining SEL-05 behavior.

---

_Verified: 2026-07-05T18:42:41Z_
_Verifier: Claude (gsd-verifier)_
