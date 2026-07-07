---
phase: 02-selection-engine
plan: 02
subsystem: selection-engine
tags: [select, pure-function, trigger-matching, skip-reasons, determinism, ajv-validation, picomatch, tdd]

requires:
  - phase: 01-rule-pack-format-index
    provides: buildIndex, RuleIndex/RuleIndexRecord/Triggers/TriggerExclude/TaskType/Severity/Phase/Scope types, resolvePrecedence (D-11 superseded[]), Ajv 2020 validate.ts harness
  - phase: 02-selection-engine
    plan: 01
    provides: controlled eval-rules corpus (10 winners + 1 superseded loser), 12 labeled ground-truth cases, integrity test
provides:
  - "Pure select(index, signal, config) core implementing the fixed phase -> scope -> trigger -> superseded gate pipeline, classifying every candidate as selected (matchedAxis + matchedValue) or skipped (AUDIT-02-aligned reason)"
  - "Phase 2 selection type set added alongside the Phase 1 contract (TaskSignal, SelectionConfig, SkipReason, MatchedAxis, SelectedRule, SkippedRule, SelectionResult) — nothing redefined"
  - "task-signal.schema.json + validateSignal (Ajv draft 2020-12) — a malformed signal fails loud instead of silently under-injecting"
affects: [02-03, selection-engine, recall-gate, cli-select, phase-3-inject, phase-5-audit]

tech-stack:
  added: []
  patterns:
    - "Pure selection core: no new Date()/Math.random/I/O in select(); output arrays sorted by id ascending (single documented key) so ordering never depends on upstream index order (Pitfalls 1, 7)"
    - "First-failing-gate skip-reason assignment in a fixed gate order (phase -> scope -> trigger) makes each skip reason deterministic and AUDIT-02-aligned"
    - "Result records constructed field-by-field (mirrors build.ts toRecord whitelist) — never spread an input-ordered object, so key order is deterministic"
    - "Domain sub-name derived from record.sourceFile (domain/<name>/, D-10) since the record carries scope 'domain' but not the sub-name; enterprise + project always candidates"
    - "validateSignal mirrors src/schema/validate.ts (Ajv 2020 compile-once + joined errors); kept OUT of select() so the core stays pure over an already-typed TaskSignal — validation is the CLI/harness boundary's job (02-03)"

key-files:
  created:
    - src/schema/task-signal.schema.json
    - src/select/validate-signal.ts
    - src/select/select.ts
    - src/select/select.test.ts
    - src/select/skip-reasons.test.ts
  modified:
    - src/types.ts

key-decisions:
  - "matchedValue for an always-in-phase (D-03 empty-triggers) selection is the literal string 'always-in-phase' — a non-empty, audit-meaningful value that keeps the observability invariant (every selected rule has a non-empty matchedValue) true without inventing a fake axis value"
  - "Multi-axis matches record the FIRST matching axis in the fixed order taskType -> keywords -> paths (documented, deterministic) rather than all matches — keeps SelectedRule single-valued and the output stable"
  - "Domain subscription uses exact string equality on the sourceFile-derived sub-name (picomatch is available but exact-match is sufficient for v1 and simpler to audit)"
  - "keywords axis matches when the trigger keyword is a case-insensitive substring of a signal keyword (trigger = needle, signal = free text), and matchedValue records the SIGNAL keyword (the concrete value the audit names)"
  - "Superseded losers inherit the winner's severity (the SupersededRecord carries none) so the skip record stays shape-complete"

patterns-established:
  - "Deterministic pure-core selection: identical (index, signal, config) -> byte-identical JSON, proven by a repeat-call test; a leaked clock/random would fail the build (T-2-NONDET mitigation)"
  - "Fail-loud input validation at the boundary: validateSignal rejects a malformed TaskSignal via Ajv 2020 before select() ever runs, closing the silent-empty-selection footgun (T-2-BADSIGNAL mitigation)"
  - "Total-accounting observability: selected + skipped === winners + Σ superseded, so no candidate can silently vanish (SEL-04)"

requirements-completed: [SEL-01, SEL-04]

coverage:
  - id: D1
    description: "The pure select(index, signal, config) core: no clock/random/I/O, classifies EVERY candidate as selected (matchedAxis + matchedValue) or skipped (reason), byte-identical output for identical inputs, output sorted by id ascending"
    requirement: "SEL-01"
    verification:
      - kind: unit
        ref: "src/select/select.test.ts#determinism: two calls on identical (index, signal, config) are byte-identical JSON (SEL-01)"
        status: pass
      - kind: unit
        ref: "src/select/select.test.ts#sorted output: selected ids and skipped ids are each in ascending order (no upstream-order dependence)"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-01..D-04 trigger semantics reused verbatim: multi-axis OR-combine (D-02), empty triggers = always-in-phase (D-03), exclude-wins (D-02), taskType enum-equality + keywords case-insensitive substring + paths picomatch globs (D-04), each recording the correct matchedAxis + matchedValue"
    requirement: "SEL-01"
    verification:
      - kind: unit
        ref: "src/select/select.test.ts#keywords axis (D-04): a keyword signal selects input-validation with matchedAxis 'keywords'"
        status: pass
      - kind: unit
        ref: "src/select/select.test.ts#taskType axis (D-04): a test-type signal selects test-coverage with matchedAxis 'taskType'"
        status: pass
      - kind: unit
        ref: "src/select/select.test.ts#paths axis (D-04): a .tf path signal selects iac-review via picomatch with matchedAxis 'paths'"
        status: pass
      - kind: unit
        ref: "src/select/select.test.ts#OR-combine (D-02): a signal matching only ONE axis of api-contract still selects it"
        status: pass
      - kind: unit
        ref: "src/select/select.test.ts#always-in-phase (D-03): empty-triggers critical secrets-management fires for an unrelated in-phase signal"
        status: pass
    human_judgment: false
  - id: D3
    description: "SEL-04 full observability: every selected rule names a valid axis + non-empty value, every skipped rule a valid reason, and total accounting (selected + skipped === winners + Σ superseded) proves no candidate vanishes"
    requirement: "SEL-04"
    verification:
      - kind: unit
        ref: "src/select/select.test.ts#observability (SEL-04): every selected rule names a valid axis+value and every skip a valid reason"
        status: pass
      - kind: unit
        ref: "src/select/select.test.ts#total accounting (SEL-04): selected + skipped equals winners + Σ superseded (nothing vanishes)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each skip carries the exact AUDIT-02-aligned enum value chosen by the FIRST failing gate (phase -> scope -> trigger); superseded losers emitted from the winner's superseded[] (D-11), never re-matched"
    requirement: "SEL-04"
    verification:
      - kind: unit
        ref: "src/select/skip-reasons.test.ts#out-of-phase: ops-runbook (operations-only) is skipped for a construction signal"
        status: pass
      - kind: unit
        ref: "src/select/skip-reasons.test.ts#gate order: an out-of-phase AND non-matching rule is skipped out-of-phase (first failing gate wins)"
        status: pass
      - kind: unit
        ref: "src/select/skip-reasons.test.ts#out-of-scope: domain rule threat-model is skipped when 'security' is not subscribed"
        status: pass
      - kind: unit
        ref: "src/select/skip-reasons.test.ts#out-of-scope-by-trigger: an in-phase in-scope rule whose axes do not match is skipped by trigger"
        status: pass
      - kind: unit
        ref: "src/select/skip-reasons.test.ts#matched-then-excluded: logging-standard is skipped out-of-scope-by-trigger with a distinguishing detail"
        status: pass
      - kind: unit
        ref: "src/select/skip-reasons.test.ts#superseded: the enterprise data-retention loser is emitted from the winner's superseded[] (D-11), not re-matched"
        status: pass
    human_judgment: false
  - id: D5
    description: "A malformed TaskSignal (wrong types, missing axis, unknown taskType) is rejected loudly by an Ajv draft-2020-12 validation rather than silently selecting nothing (T-2-BADSIGNAL, Pitfall 8)"
    requirement: "SEL-01"
    verification:
      - kind: unit
        ref: "src/select/select.test.ts#validateSignal accepts a well-formed TaskSignal without throwing"
        status: pass
      - kind: unit
        ref: "src/select/select.test.ts#validateSignal rejects a malformed signal loudly (unknown taskType) — no silent under-injection"
        status: pass
      - kind: unit
        ref: "src/select/select.test.ts#validateSignal rejects a signal missing a required axis"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-05
status: complete
---

# Phase 2 Plan 02: Selection Engine Core (select + validateSignal) Summary

**The pure, deterministic `select(index, signal, config)` core — a fixed phase -> scope -> trigger -> superseded gate pipeline that classifies every index candidate as selected (with the axis + value that fired) or skipped (with an AUDIT-02-aligned reason), reusing Phase 1's D-01..D-04 trigger semantics verbatim, plus an Ajv-validated `TaskSignal` boundary that fails loud on a malformed signal.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-05
- **Tasks:** 2 (RED + GREEN)
- **Files touched:** 6 (5 created + src/types.ts modified)

## Accomplishments

- Built the project's Core Value: the pure `select()` function that reads Phase 1's `RuleIndex` (winners + `superseded[]`) and classifies EVERY candidate. It runs a fixed gate order — phase, then scope (domain subscription), then trigger — so the FIRST failing gate deterministically sets the skip reason from the AUDIT-02-aligned enum `out-of-phase | out-of-scope | out-of-scope-by-trigger | superseded`.
- Reused Phase 1's locked trigger semantics verbatim: multi-axis OR-combine (D-02), empty triggers `{}` = always-in-phase with `matchedAxis: "always-in-phase"` (D-03 — never read as "never fires"), exclude-wins over any positive match with a `matched-then-excluded` detail (D-02), and per-axis rules (D-04): taskType enum-equality, keywords case-insensitive substring (trigger is the needle in the signal), paths via picomatch globs.
- Emitted superseded losers from each winner's `superseded[]` (D-11) without re-matching them, and proved total accounting (selected + skipped === winners + Σ superseded) so no candidate can silently vanish.
- Kept the core deterministic and pure: no `new Date()`, no `Math.random`, no I/O; output arrays sorted by id ascending; records built field-by-field. A repeat-call test asserts byte-identical JSON, so a leaked clock/random would fail the build.
- Added the Phase 2 selection type set alongside the Phase 1 contract (redefining nothing) and a `task-signal.schema.json` + `validateSignal` (Ajv draft 2020-12, mirroring `src/schema/validate.ts`) so a malformed signal fails loud rather than silently under-injecting.
- Executed strictly test-first per active MVP+TDD: a RED `test(02-02)` commit (16/18 failing against throwing stubs) precedes the GREEN `feat(02-02)` implementation commit. Full suite ends 68/68 green.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Selection types + TaskSignal schema/validator + failing suites against stubs** - `20961e8` (test)
2. **Task 2 (GREEN): validateSignal + pure select() gate pipeline** - `a0673d1` (feat)

## Files Created/Modified

- `src/types.ts` - MODIFIED (additive only): added `TaskSignal`, `SelectionConfig`, `SkipReason`, `MatchedAxis`, `SelectedRule`, `SkippedRule`, `SelectionResult` alongside the Phase 1 set; the budget fields on `SelectionResult` are declared (for 02-03) but not computed here.
- `src/schema/task-signal.schema.json` - CREATED: draft 2020-12 schema, `additionalProperties: false`, required `[taskType, keywords, paths]`, taskType enum mirroring the frontmatter schema's 8 members.
- `src/select/validate-signal.ts` - CREATED: `validateSignal(signal): asserts signal is TaskSignal` — Ajv 2020 compile-once harness mirroring `src/schema/validate.ts`; throws a joined error on any violation.
- `src/select/select.ts` - CREATED: the pure `select(index, signal, config)` core — the fixed phase -> scope -> trigger -> superseded pipeline with D-01..D-04 trigger helpers, sorted-by-id output.
- `src/select/select.test.ts` - CREATED: unit suite — determinism, each D-04 axis, D-02 OR-combine, D-03 always-in-phase, observability, total accounting, sorted output, and the three validateSignal cases.
- `src/select/skip-reasons.test.ts` - CREATED: per-reason suite — out-of-phase, out-of-scope, out-of-scope-by-trigger (no-match + matched-then-excluded), superseded, and first-failing-gate order.

## Decisions Made

- **`matchedValue` for an always-in-phase (D-03) selection is the literal `"always-in-phase"`** — a non-empty, audit-meaningful value that keeps the observability invariant (every selected rule has a non-empty `matchedValue`) true without inventing a fake axis value.
- **First-matching axis recorded, not all matches** — multi-axis matches record the first matching axis in the fixed order taskType -> keywords -> paths (documented, deterministic), keeping `SelectedRule` single-valued and the output stable.
- **Domain subscription uses exact string equality** on the `sourceFile`-derived sub-name; picomatch is available if a glob subscription is wanted later, but exact-match is sufficient for v1 and simpler to audit.
- **keywords match direction pinned:** the trigger keyword is a case-insensitive substring of a signal keyword (trigger = needle, signal = free text), and `matchedValue` records the SIGNAL keyword.
- **Superseded losers inherit the winner's severity** (the `SupersededRecord` carries none) so the skip record stays shape-complete.

## Deviations from Plan

None - plan executed exactly as written. Both RED and GREEN gate commits are present in the required order.

## TDD Gate Compliance

- RED gate: `20961e8` `test(02-02): ...` — added the failing suites first (16/18 failing against throwing stubs; the 2 trivially-passing assertions were `assert.throws(validateSignal)` cases satisfied by the throwing stub, which became real checks in GREEN).
- GREEN gate: `a0673d1` `feat(02-02): ...` — minimal implementation turning all 18 select/skip-reason assertions green.
- No REFACTOR commit was needed (implementation was clean on first green).
- MVP+TDD runtime gate satisfied: the `test(02-02)` RED commit precedes the `feat(02-02)` implementation commit; no `feat` landed before the test.

## Issues Encountered

None. `npm run build` (production tsconfig) and `npm test` (full suite, 68/68) both pass. No Phase 1 file behavior changed — the only edit to a Phase 1 file was additive types in `src/types.ts`.

## User Setup Required

None - no external service configuration required. `select()` is a pure function; `validateSignal` uses the already-installed Ajv 8.20.0 / ajv-formats 3.0.1.

## Next Phase Readiness

- 02-03 can now wire the token-budget flag (populating the pre-declared `SelectionResult.budgetExceeded`/`budget` fields), the recall/precision measurement over the 02-01 labeled cases (the behavioral pre-check already holds — running `select()` over each case yields its `expectedRuleIds`), the fast-check invariants (selected ⊆ triggered, stable ordering, total accounting, exclude-wins), and the `governance select` CLI wrapper that maps `budgetExceeded` -> non-zero exit and calls `validateSignal` at the boundary.
- The `SkipReason` enum is the seed Phase 5 AUDIT-02 RECONCILES (adds `explicitly-waived`) rather than inheriting verbatim.
- No blockers. SEL-01 (deterministic matching with per-rule reasons) and SEL-04 (every candidate selected/skipped with a reason) are satisfied by the core.

## Self-Check: PASSED

All 6 files verified present on disk (src/types.ts modified; task-signal.schema.json, validate-signal.ts, select.ts, select.test.ts, skip-reasons.test.ts created) plus 02-02-SUMMARY.md; both task commits (`20961e8` RED, `a0673d1` GREEN) verified in git history. Full suite green (68/68).

---
*Phase: 02-selection-engine*
*Completed: 2026-07-05*
