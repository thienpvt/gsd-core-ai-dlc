---
phase: 17-coverage-parser-binding-gateadapter
plan: 01
subsystem: enforcement
tags: [coverage, jacoco, lcov, gate-adapter, java-spring, fail-closed]

requires:
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: GateAdapter interface, runAdapter schema boundary, seven-stub registries
  - phase: 08-remaining-gate-hooks
    provides: verify-gate-hook deriveRuleGateStatuses finding-id matching
provides:
  - parseJacoco pure parser (sole report-root LINE counter)
  - parseLcov pure parser (LF/LH aggregate across end_of_record)
  - createCoverageAdapter factory (name coverage-report, 8 MiB ceiling)
  - 13 focused JaCoCo/LCOV fixtures under test/fixtures/coverage/
affects:
  - 17-02 binding rule + inventory
  - 18 verify/ship wire + consumer docs

tech-stack:
  added: []
  patterns:
    - "Factory-closed real GateAdapter (config not on GateRequest)"
    - "Structure-aware JaCoCo root LINE scan; no DOM/DTD/entity"
    - "Integer cross-multiplication threshold covered*100 >= total*70"
    - "Fail-closed valid GateResult for all operational error classes"

key-files:
  created:
    - src/enforcement/parse-jacoco.ts
    - src/enforcement/parse-lcov.ts
    - src/enforcement/coverage-report.ts
    - src/enforcement/parse-jacoco.test.ts
    - src/enforcement/parse-lcov.test.ts
    - src/enforcement/coverage-report.test.ts
    - test/fixtures/coverage/jacoco/pass-70.xml
    - test/fixtures/coverage/jacoco/fail-below-70.xml
    - test/fixtures/coverage/jacoco/zero-lines.xml
    - test/fixtures/coverage/jacoco/malformed-structure.xml
    - test/fixtures/coverage/jacoco/malformed-dtd.xml
    - test/fixtures/coverage/jacoco/duplicate-root-line.xml
    - test/fixtures/coverage/jacoco/negative-counter.xml
    - test/fixtures/coverage/lcov/pass-70.info
    - test/fixtures/coverage/lcov/fail-below-70.info
    - test/fixtures/coverage/lcov/zero-lines.info
    - test/fixtures/coverage/lcov/malformed.info
    - test/fixtures/coverage/lcov/duplicate-lf.info
    - test/fixtures/coverage/lcov/lh-gt-lf.info
  modified:
    - .gitignore

key-decisions:
  - "Adapter is factory-only createCoverageAdapter; never registered into STUB_NAMES/ADAPTERS/ECHO_ADAPTERS"
  - "Finding id frozen as java-spring-unit-line-coverage:coverage-report for deriveRuleGateStatuses"
  - "MAX_COVERAGE_REPORT_BYTES = 8 MiB; oversized proved via temp ftruncateSync, no committed blob"
  - ".gitignore coverage/ narrowed to /coverage/ so test/fixtures/coverage/ can be tracked"

patterns-established:
  - "Pure parsers throw; adapter maps operational errors to status fail GateResult"
  - "Lexical then realpath containment mirrors detail-path escapesRoot"
  - "Suffix-only format inference (.xml / .info / .lcov); unknown fails closed"

requirements-completed: [JAVA-COV-02, JAVA-COV-03]

coverage:
  - id: D1
    description: "parseJacoco returns sole report-root LINE {covered,total}; rejects DTD/entity, duplicate/negative/missing root counters, malformed structure"
    requirement: JAVA-COV-02
    verification:
      - kind: unit
        ref: "src/enforcement/parse-jacoco.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "parseLcov aggregates LF/LH across complete records; rejects duplicates, incomplete, LH>LF, non-integer"
    requirement: JAVA-COV-02
    verification:
      - kind: unit
        ref: "src/enforcement/parse-lcov.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "createCoverageAdapter fails closed through runAdapter for missing/low/malformed/path/size/format; pass at exactly 70%"
    requirement: JAVA-COV-03
    verification:
      - kind: unit
        ref: "src/enforcement/coverage-report.test.ts"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-12
status: complete
---

# Phase 17 Plan 01: Coverage Parser + Binding GateAdapter Summary

**Pure JaCoCo/LCOV line parsers and factory-built `coverage-report` GateAdapter with fail-closed 70% unit-line threshold through `runAdapter`.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-12T14:30:03Z
- **Completed:** 2026-07-12T14:33:39Z
- **Tasks:** 3/3
- **Files modified:** 20 (1 `.gitignore` + 6 `src` + 13 fixtures)

## Accomplishments

- Structure-aware JaCoCo root LINE counter parser; nested package/class counters ignored; DTD/entity rejected.
- LCOV LF/LH aggregation with complete-record integrity checks.
- Real `coverage-report` GateAdapter factory: 8 MiB cap, path containment, integer 70% gate, durable fail findings.
- Executor focused suite: 36/36 pass. Executor full suite: 558 pass / 0 fail / 3 skipped.

## Task Commits

Each scoped implementation commit was recovered from the executor's stale-base worktree and cherry-picked onto current `master`:

1. **Task 1: RED — fixtures + parser/adapter tests + not-implemented stubs** — `c74f898` (original `7f45827`)
2. **Task 2: GREEN — JaCoCo and LCOV line parsers** — `3cb8d88` (original `b3b3a6e`)
3. **Task 3: GREEN — createCoverageAdapter factory + fail-closed runAdapter matrix** — `1e2b3be` (original `462cd62`)

The executor's broad stale-base docs commit `e2641bf` was intentionally excluded.

## Files Created/Modified

- `src/enforcement/parse-jacoco.ts` — pure JaCoCo parser + `LineCounter`.
- `src/enforcement/parse-lcov.ts` — pure LCOV parser.
- `src/enforcement/coverage-report.ts` — `MAX_COVERAGE_REPORT_BYTES`, `createCoverageAdapter`, `COVERAGE_FINDING_ID`.
- `src/enforcement/parse-jacoco.test.ts` — 8 parser cases.
- `src/enforcement/parse-lcov.test.ts` — 9 parser cases.
- `src/enforcement/coverage-report.test.ts` — 19 runAdapter/security/registry cases.
- `test/fixtures/coverage/jacoco/*.xml` — 7 fixtures.
- `test/fixtures/coverage/lcov/*.info` — 6 fixtures.
- `.gitignore` — `/coverage/` root-only so fixtures track.

## Decisions Made

- Factory-only registration seam; `adapters.ts` untouched (`STUB_NAMES` size 7).
- Stable finding id `java-spring-unit-line-coverage:coverage-report`.
- Evidence path only when reportPath is safe project-relative.
- Oversized path proved with temp projectRoot + `ftruncateSync(MAX+1)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Fixtures blocked by `.gitignore` `coverage/`**
- **Found during:** Task 1 staging.
- **Fix:** Narrowed to `/coverage/` (root c8 output only).
- **Verification:** Fixture paths are tracked; root `coverage/` remains ignored.
- **Committed in:** `c74f898`.

**2. [Rule 1 - Bug] GateRequest matchedAxis type typo in test helper**
- **Found during:** Task 1 build:test.
- **Fix:** Corrected `matchedAxis: "path"` to `matchedAxis: "paths"`.
- **Verification:** `npm run build:test` succeeded.
- **Committed in:** `c74f898`.

**3. [Execution recovery] Executor worktree forked from stale `origin/HEAD`**
- **Found during:** Executor return metadata (`expected_base: b384127e`, orchestrator HEAD `8eb4fbf`).
- **Fix:** Inspected all four executor commits; cherry-picked only three scoped implementation commits. Excluded broad docs/tracking commit; rewrote this SUMMARY with current hashes.
- **Impact:** No stale planning/tracking overwrite; current-base history preserved.

## TDD Gate Compliance

1. RED commit: `c74f898 test(17-01): RED coverage parser and adapter contracts`.
2. Parser GREEN after RED: `3cb8d88 feat(17-01): implement JaCoCo and LCOV line parsers`.
3. Adapter GREEN after parser GREEN: `1e2b3be feat(17-01): implement coverage-report GateAdapter factory`.

RED proof: focused tests failed on deliberate `not implemented` stubs after compilation. GREEN proof: focused 36/36 pass.

## Test Results

| Suite | Result |
|-------|--------|
| parse-jacoco.test.js | 8 pass |
| parse-lcov.test.js | 9 pass |
| coverage-report.test.js | 19 pass |
| Focused total | 36 pass / 0 fail |
| Executor full `npm test` | 558 pass / 0 fail / 3 skipped |

## Known Stubs

None. Phase 18 owns consumer report-path configuration and automatic verify/ship selection.

## Threat Flags

None open from the plan threat model: lexical + canonical containment, 8 MiB bound, no DTD/entity processing, safe integers, suffix-only inference, safe evidence paths, and fail-closed valid results are implemented and tested.

## Self-Check: PASSED

- FOUND: all six enforcement source/test files.
- FOUND: all 13 fixtures.
- FOUND: current-base task commits `c74f898`, `3cb8d88`, `1e2b3be`.
- FOUND: `adapters.ts` unchanged; stub registry remains seven.
- FOUND: `package.json` dependencies unchanged.
