---
phase: 09-complete-audit-record-approval
plan: 02
subsystem: governance
tags: [json-schema, ajv, draft-2020-12, durable-store, test-evidence, tdd, tap]

# Dependency graph
requires:
  - phase: 08-remaining-gate-hooks
    provides: gate-evidence-store.ts durable-store template (atomicWriteFile + 4-rung loud-fail read ladder), paths.ts testEvidencePath helper
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: validate.ts pattern (Ajv 2020 + x-binding pre-compile), schema header convention
provides:
  - TestEvidenceRecord interface + writeTestEvidence/readTestEvidence durable store under .planning/governance/tests/{NN}.json
  - validateTestEvidence inline Ajv 2020 runtime validator (6th instance of validate.ts pattern)
  - test-evidence.schema.json (draft 2020-12, runner const, x-binding: binding)
  - parseTapSummary pure function (no I/O) — TAP summary block parser for node --test --test-reporter=tap stdout
affects: [09-03 (readTestEvidence folds tests_executed into v2 audit), 09-04 (verify:post hook captures real runner output via parseTapSummary)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Durable-store clone of gate-evidence-store.ts / approval-store.ts (atomic write + 4-rung loud-fail read ladder + assertXxx pre/post validation) — same pattern, third instance"
    - "6th instance of validate.ts pattern (validateFrontmatter → validateIndex → validateSignal → validateGateResult → validateApproval → validateTestEvidence): inline in test-evidence.ts (single consumer; inline by design per one-consumer rule)"
    - "Pure-function parser half (no codebase analog — 09-PATTERNS.md 'No Analog Found'): regex over TAP summary block, hard-fail on missing # tests N (D-04), lastIndex reset for determinism"

key-files:
  created:
    - src/schema/test-evidence.schema.json
    - src/governance/test-evidence.ts
    - src/governance/test-evidence.test.ts
  modified: []

key-decisions:
  - "D-01 reconciled: parser targets `node --test --test-reporter=tap` stdout (the actual npm test runner). No run-tests.cjs exists locally; D-01's file name referenced upstream gsd-core. The `# tests N` summary line is the parse target."
  - "D-04 guard on parseTapSummary is the narration-rejection boundary (D-03): model prose ('All tests passed.') has no `# tests N` line and throws. The guard is on the summary line, not any TAP-ish prefix — a fixture with `ok 1` but no summary block still hard-fails."
  - "Inline validateTestEvidence (not a sibling validate-test-evidence.ts) — single consumer, one-consumer rule. The pattern is identical to validate-approval.ts from Plan 01; extracting would couple sibling failures (one crash shouldn't take down sibling validators)."
  - "parseTapSummary regex uses /gm flags; lastIndex reset to 0 before each parse so the determinism test (deepEqual on repeated calls) holds across the stateful g-flagged regex."
  - "paths.ts NOT modified — testEvidencePath consumed from Plan 01's export. Plan 02 is additive only."

patterns-established:
  - "Pure-function parser + durable-store split in one module: parser has no I/O (testable in isolation), store clones the 4-rung loud-fail ladder. Same split pattern reusable for future evidence captures."
  - "Regex lastIndex reset idiom for stateful g-flagged regexes used in pure functions — determinism invariant."

requirements-completed: [AUDIT-04]

coverage:
  - id: D1
    description: "test-evidence schema (draft 2020-12, runner const `node --test --test-reporter=tap`, x-binding: binding) published at src/schema/test-evidence.schema.json"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/test-evidence.test.ts (runner-const rejection + missing-required-field tests exercise the schema boundary)"
        status: pass
    human_judgment: false
  - id: D2
    description: "validateTestEvidence inline Ajv 2020 runtime validator — 6th instance of validate.ts pattern; accepts schema-valid records, rejects missing required fields / runner-const violations / negative counts / bad ISO timestamps"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/test-evidence.test.ts (malformed-JSON, missing-field, runner-not-const, negative-count, non-ISO capturedAt tests all GREEN)"
        status: pass
    human_judgment: false
  - id: D3
    description: "parseTapSummary pure function extracts {total, pass, fail, skipped, duration_ms} from node --test TAP summary block; hard-fails on missing `# tests N` (D-04) and rejects model narration (D-03)"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/test-evidence.test.ts (TAP_OK fixture → {total:1,pass:1,fail:0,skipped:0,duration_ms:12.34}; TAP_OK_FULL → {total:2,pass:1,fail:1,skipped:0,duration_ms:44.9934}; D-03/D-04 rejection tests GREEN)"
        status: pass
    human_judgment: false
  - id: D4
    description: "parseTapSummary determinism: repeated calls on the same input return deepEqual results (regex lastIndex reset)"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/test-evidence.test.ts#parseTapSummary is deterministic: repeated calls on the same input deepEqual"
        status: pass
    human_judgment: false
  - id: D5
    description: "TestEvidenceRecord durable store: writeTestEvidence/readTestEvidence under .planning/governance/tests/{NN}.json with atomicWriteFile + 4-rung loud-fail read ladder + phase-mismatch check"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/test-evidence.test.ts (round-trip + no-temp-siblings + malformed-JSON + missing-field + phase-mismatch tests all GREEN)"
        status: pass
    human_judgment: false
  - id: D6
    description: "D-01 reconciliation: parser targets node --test --test-reporter=tap (the actual npm test runner); no run-tests.cjs dependency. D-02 durable state under .planning/governance/tests/{NN}.json."
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/test-evidence.test.ts#testEvidencePath stores test evidence under .planning/governance/tests/{NN}.json + TAP_OK fixture parsed from real Node v24.14.0 shape"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-07
status: complete
---

# Phase 9 Plan 02: Test-Evidence Capture Summary

**AUDIT-04 test-evidence capture: pure TAP-summary parser for `node --test --test-reporter=tap` stdout (the actual `npm test` runner — D-01 reconciliation), draft 2020-12 schema with runner const, and durable store persisting under `.planning/governance/tests/{NN}.json` (D-02). Malformed runner output hard-fails (D-04); model-authored narration is rejected (D-03).**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-07T15:29:21Z
- **Completed:** 2026-07-07T15:32:16Z
- **Tasks:** 3 (TDD: RED → GREEN → REFACTOR-noop)
- **Files modified:** 3 (3 created, 0 modified, 0 deleted)

## Accomplishments
- test-evidence schema published with runner const `"node --test --test-reporter=tap"` (the AUDIT-04 trust boundary — anything else fails closed), x-binding: binding, strict ISO 8601 capturedAt (TD-01 shape), summary sub-object with non-negative integer counts
- validateTestEvidence inline runtime validator clones validate-approval.ts / validate-gate-result.ts verbatim (Ajv 2020 + addFormats + x-binding keyword pre-compile); 6th instance of validate.ts pattern; post-Ajv defense-in-depth check on summary counts
- parseTapSummary pure function (no I/O): regex `/^# (tests|pass|fail|skipped|todo|cancelled|duration_ms) (\d+(?:\.\d+)?)/gm` over TAP summary block; missing `# tests N` throws (D-04); lastIndex reset for determinism
- test-evidence.ts store clones gate-evidence-store.ts / approval-store.ts 1:1 (atomicWriteFile + 4-rung loud-fail read ladder + phase-mismatch check)
- 17 new test-evidence tests green; full suite 344 tests (341 pass, 3 skipped, 0 fail), 0 regression
- paths.ts NOT modified — testEvidencePath consumed from Plan 01's export

## Task Commits

Each task was committed atomically:

1. **Task 1: RED** — `3d2f7f8` (test): test-evidence.schema.json + failing test-evidence.test.ts (parser + store + D-03/D-04 guards)
2. **Task 2: GREEN** — `a3b687b` (feat): implement test-evidence.ts (parseTapSummary + writeTestEvidence + readTestEvidence + inline validateTestEvidence)
3. **Task 3: REFACTOR** — no-op commit (full suite green; inline validator stays inline per one-consumer rule — no second consumer in Plan 03/04)

## Files Created/Modified
- `src/schema/test-evidence.schema.json` — AUDIT-04 test-evidence contract, draft 2020-12, x-binding: binding, runner const, 4 required top-level fields, summary sub-object with non-negative integer/number counts
- `src/governance/test-evidence.ts` — TestEvidenceSummary/TestEvidenceRecord interfaces; parseTapSummary pure parser (D-03/D-04 guards, lastIndex reset for determinism); writeTestEvidence/readTestEvidence durable store (clone of gate-evidence-store/approval-store); inline validateTestEvidence (6th validate.ts instance)
- `src/governance/test-evidence.test.ts` — 17 tests: parser (TAP_OK minimal + TAP_OK_FULL verified Node v24.14.0 shape, determinism, D-03 narration rejection, D-04 missing-summary rejection, TAP-without-summary guard, default-to-0); store (path, null-when-missing, round-trip, no-temp-siblings, malformed-JSON, missing-field, runner-const, ISO-8601, negative-counts, phase-mismatch)

## Decisions Made
- **D-01 reconciliation:** parser targets `node --test --test-reporter=tap` stdout (the actual `npm test` runner). No `run-tests.cjs` exists locally; D-01's file name referenced upstream gsd-core. The `# tests N` summary line is the parse target — absence = malformed = hard fail.
- **Inline validator over sibling file:** single consumer (test-evidence.ts is the only caller of validateTestEvidence). Per the one-consumer rule and the PATTERNS anti-pattern guidance on duplicated validators, inline is correct — extracting would couple sibling failures (one crash shouldn't take down sibling validators). Plan 03 consumes `readTestEvidence`, not `validateTestEvidence`, so no second consumer will appear.
- **Regex lastIndex reset for determinism:** the `g`-flagged `TAP_SUMMARY_RE` is stateful. `parseTapSummary` resets `lastIndex = 0` before each parse so repeated calls on the same input return deepEqual results — the determinism test asserts this invariant.
- **D-03 guard is on the summary line, not TAP prefix:** a dedicated test uses `ok 1 - passes` without `1..N` and `# tests N` to prove the guard is on the summary line, not just any TAP-ish prefix. This blocks model narration that mimics TAP shape but omits the summary block.

## Deviations from Plan

None - plan executed exactly as written. The inline validator choice (inline vs sibling validate-test-evidence.ts) was left to planner discretion per CONTEXT Claude's Discretion; inline is simpler for one consumer and matches the plan's stated preference ("inline is acceptable since this is the only consumer").

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required. The parser operates on captured stdout strings; the store is pure local file I/O under `.planning/governance/tests/`. Plan 03/04 wires the verify:post hook to invoke `node --test` and feed stdout to `parseTapSummary`.

## Next Phase Readiness
- Plan 03 (audit enrichment v2) can call `readTestEvidence(projectRoot, phaseNumber)` to fold `tests_executed` into the v2 audit artifact — returns null when absent (v1-subset regeneration holds).
- Plan 04 (verify:post hook + ship-gate approval blocking) can invoke `node --test --test-reporter=tap` and feed stdout to `parseTapSummary` to capture real test results, then `writeTestEvidence` to persist.

## TDD Gate Compliance
- RED gate: `3d2f7f8` (test commit) — build:test failed with TS2307 on `./test-evidence.js` (unimplemented target). Confirmed RED.
- GREEN gate: `a3b687b` (feat commit) — 17/17 test-evidence tests pass; build clean.
- REFACTOR gate: no-op (full suite green; no refactor warranted per one-consumer rule).

All three gates present in git log in the correct order.

## Self-Check: PASSED

- All 3 created files exist on disk (src/schema/test-evidence.schema.json, src/governance/test-evidence.ts, src/governance/test-evidence.test.ts).
- Both task commits present in git log (`3d2f7f8`, `a3b687b`).
- SUMMARY.md exists at the canonical path.
- paths.ts NOT modified (verified via `git diff --stat HEAD -- src/governance/paths.ts` = empty).

---
*Phase: 09-complete-audit-record-approval*
*Completed: 2026-07-07*