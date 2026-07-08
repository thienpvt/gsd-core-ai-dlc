---
phase: 08-remaining-gate-hooks
plan: 04
subsystem: governance
tags: [tdd, ship-gate, gate-evidence, fail-closed]

requires:
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: [GateRequest, GateResult, validated gate-result contract]
  - phase: 08-remaining-gate-hooks
    provides: GateEvidence read/write store and plan/verify gate evidence files
provides:
  - ShipGateHookArgs and ShipGateHookResult
  - shipGateHook(args) blocking release on missing or failing plan/verify evidence
  - direct runner for ship gate enforcement
affects: [08-05, phase-09-audit-record, ship-pre-governance]

tech-stack:
  added: []
  patterns:
    - "Ship gate reads required prior gate evidence through readGateEvidence and fails closed on null/malformed/fail."
    - "Ship evidence reuses verify evidence's phase, taskSignal, and rules, then writes a minimal pass GateResult."
    - "Phase 8 ship gate deliberately omits APPR-01 approval capture, rollback evidence, and full audit enrichment."

key-files:
  created:
    - src/governance/ship-gate-hook.ts
    - src/governance/ship-gate-hook.test.ts
  modified: []

key-decisions:
  - "shipGateHook treats pass and waived plan/verify evidence as non-blocking, and only result.status === fail blocks ship."
  - "Ship evidence is minimal GateEvidence with source/evaluatedBy aidlc-governance-ship; Phase 9 owns approval, rollback, and full audit fields."
  - "The direct-runner test targets dist-test so the plan's targeted build:test command is self-contained; npm run build verifies production dist output."

patterns-established:
  - "Missing prior gate evidence errors name the exact .planning/governance/gates/{NN}-{gate}.json path."
  - "Failing prior evidence errors include the gate id plus finding ids/messages."

requirements-completed: [GATE-05]

coverage:
  - id: D1
    description: "shipGateHook fails closed when plan or verify gate evidence is missing or malformed, and writes no ship evidence on those paths."
    requirement: GATE-05
    verification:
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#shipGateHook fails closed when plan evidence is missing and writes no ship evidence"
        status: pass
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#shipGateHook fails closed when verify evidence is missing and writes no ship evidence"
        status: pass
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#shipGateHook propagates malformed plan or verify evidence errors"
        status: pass
    human_judgment: false
  - id: D2
    description: "shipGateHook blocks release when plan or verify evidence has result.status fail and reports finding details."
    requirement: GATE-05
    verification:
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#shipGateHook blocks failing plan or verify evidence with finding details"
        status: pass
    human_judgment: false
  - id: D3
    description: "shipGateHook writes valid minimal ship evidence when plan and verify evidence pass or waive, without approval, rollback, or full audit fields."
    requirement: GATE-05
    verification:
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#shipGateHook writes ship evidence when plan and verify evidence pass or waive"
        status: pass
      - kind: other
        ref: "npm test"
        status: pass
    human_judgment: false
  - id: D4
    description: "Compiled direct runner exits non-zero and writes stderr on blocking ship evidence."
    requirement: GATE-05
    verification:
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#compiled direct runner fails with stderr and non-zero exit on blocking evidence"
        status: pass
    human_judgment: false

duration: 14 min
completed: 2026-07-07
status: complete
---

# Phase 08 Plan 04: Ship Gate Hook Summary

**Ship preflight gate that fails closed on missing, malformed, or failing plan/verify governance evidence**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-07T14:44:00+07:00
- **Completed:** 2026-07-07T14:58:00+07:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `shipGateHook(args)` that requires `.planning/governance/gates/08-plan.json` and `08-verify.json`, propagates malformed evidence errors, and blocks on failing prior gate results.
- Added ship evidence writing at `.planning/governance/gates/08-ship.json` with `gateId: "ship"` and `evaluatedBy: "aidlc-governance-ship"` only after required prior gates pass or waive.
- Added direct runner support for `node dist/governance/ship-gate-hook.js <projectRoot> <phaseNumber>`.

## Task Commits

1. **Task 1: Wave 0 RED tests for ship fail-closed matrix** - `a1b3fec` (test)
2. **Task 2: GREEN implementation for shipGateHook** - `2e698d7` (feat)

**Plan metadata:** pending (this SUMMARY/STATE/ROADMAP commit)

## Files Created/Modified

- `src/governance/ship-gate-hook.ts` - Ship gate evidence reader, fail-closed blocking policy, ship evidence writer, and direct runner.
- `src/governance/ship-gate-hook.test.ts` - TDD matrix for missing, malformed, fail, pass, waived, no APPR-01/rollback/audit enrichment fields, and direct runner failure behavior.

## Decisions Made

- `pass` and `waived` prior evidence are non-blocking because waiver is an explicit Phase 7 `GateResult` status.
- Ship evidence is intentionally minimal `{ request, result, metadata }`; APPR-01 approval capture, rollback evidence, and full audit enrichment remain Phase 9 work.
- Direct-runner test uses the `dist-test` compile target so `npm run build:test && node --test ...` validates the runner without requiring a separate production build step.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed RED fixture type errors**
- **Found during:** Task 1 RED
- **Issue:** The first test draft used non-existent enum values (`taskType: "release"`, `matchedAxis: "requirements"`), causing type errors unrelated to the missing implementation.
- **Fix:** Changed the fixture to existing values (`taskType: "feature"`, `matchedAxis: "always-in-phase"`) so RED failed only on missing `./ship-gate-hook.js`.
- **Files modified:** `src/governance/ship-gate-hook.test.ts`
- **Verification:** `npm run build:test` failed only with `Cannot find module './ship-gate-hook.js'`.
- **Committed in:** `a1b3fec`

**Total deviations:** 1 auto-fixed (1 blocking test-fixture issue).
**Impact on plan:** No scope change; RED still proved the planned missing implementation.

## Issues Encountered

- The direct-runner test originally pointed at `dist/`, but the task verify command compiles `dist-test/` only. The test now targets `dist-test/`; `npm run build` separately verifies production `dist/` output.
- Full suite retains 3 pre-existing platform/runtime skips; no failures.

## Verification

- RED: `npm run build:test` failed only on missing `./ship-gate-hook.js`.
- GREEN: `npm run build:test` passed.
- Targeted: `node --test "dist-test/governance/ship-gate-hook.test.js"` passed: 6 pass, 0 fail.
- Production build: `npm run build` passed.
- Full suite: `npm test` passed: 284 pass, 0 fail, 3 skipped.

## TDD Gate Compliance

- RED gate: `a1b3fec` (`test(08-04): add failing tests for ship gate hook`) - verified by failing `npm run build:test` before implementation.
- GREEN gate: `2e698d7` (`feat(08-04): implement ship gate hook`) - targeted tests and full suite pass.
- REFACTOR gate: not needed; implementation is a small hook module.

## Authentication Gates

None.

## Known Stubs

None. The hook consumes existing Phase 8 plan/verify evidence and does not execute external scanners or approval tools.

## Threat Flags

None. Missing, malformed, and failing prior evidence are all fail-closed paths covered by automated tests.

## Self-Check: PASSED

- Found `src/governance/ship-gate-hook.ts`.
- Found `src/governance/ship-gate-hook.test.ts`.
- Found `.planning/phases/08-remaining-gate-hooks/08-04-SUMMARY.md`.
- Found commits `a1b3fec` and `2e698d7`.
- `npm test` passed with 284 pass, 0 fail, 3 skipped.
- No tracked file deletions.
- `.codegraph/` and `.idea/` remained unmodified and uncommitted.

## Next Phase Readiness

08-05 can wire `aidlc-governance-ship` into `ship:pre` knowing the TypeScript hook blocks on required plan/verify evidence and writes ship evidence only on pass/waive.

---
*Phase: 08-remaining-gate-hooks*
*Completed: 2026-07-07*
