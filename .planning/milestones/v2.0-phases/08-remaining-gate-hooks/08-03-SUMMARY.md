---
phase: 08-remaining-gate-hooks
plan: 03
subsystem: governance
tags: [tdd, verify-gate, run-adapter, gate-evidence]

requires:
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: [GateAdapter, ADAPTERS, ECHO_ADAPTERS, runAdapter hard-fail boundary]
  - phase: 08-remaining-gate-hooks
    provides: GateEvidence read/write store under .planning/governance/gates/{NN}-{gate}.json
provides:
  - VerifyGateHookArgs and VerifyGateHookResult
  - RuleGateStatus and deriveRuleGateStatuses(request, result)
  - verifyGateHook(args) producing validated verify evidence through runAdapter
affects: [08-04, 08-05, phase-09-audit-record]

tech-stack:
  added: []
  patterns:
    - "Verify gate builds GateRequest from persisted selection state, then calls runAdapter(adapter, request)."
    - "Production verify evidence defaults to ADAPTERS generic-exit-ci; tests inject ECHO_ADAPTERS/custom adapters only."
    - "Per-rule statuses fail only on exact or distinct-token finding id matches."

key-files:
  created:
    - src/governance/verify-gate-hook.ts
    - src/governance/verify-gate-hook.test.ts
  modified: []

key-decisions:
  - "verifyGateHook uses ADAPTERS generic-exit-ci by default and exposes adapter injection only as a test seam."
  - "deriveRuleGateStatuses treats unmatched rules in a failing adapter result as pass; only exact or distinct-token finding ids fail a rule, while overall waived still waives unmatched rules."
  - "Malformed adapter output is rejected before persistence because verifyGateHook calls runAdapter, and missing selection state fails loud without synthesizing empty evidence."

patterns-established:
  - "Verify gate evidence source is aidlc-governance-verify with .planning/governance/gates/{NN}-verify.json persistence."
  - "Gate findings are mapped back to selected rule ids before Phase 9 audit enrichment."

requirements-completed: [GATE-04]

coverage:
  - id: D1
    description: "verifyGateHook builds a verify GateRequest from persisted governance selection state, uses ADAPTERS generic-exit-ci by default, and writes validated pass evidence."
    requirement: GATE-04
    verification:
      - kind: unit
        ref: "src/governance/verify-gate-hook.test.ts#verifyGateHook defaults to ADAPTERS generic-exit-ci and writes validated pass evidence"
        status: pass
      - kind: other
        ref: "npm run build:test"
        status: pass
    human_judgment: false
  - id: D2
    description: "verifyGateHook routes adapter output through runAdapter so malformed adapter results reject and no verify evidence file is written."
    requirement: GATE-04
    verification:
      - kind: unit
        ref: "src/governance/verify-gate-hook.test.ts#verifyGateHook rejects malformed adapter output through runAdapter and writes no evidence"
        status: pass
      - kind: unit
        ref: "src/enforcement/run-adapter.test.ts#runAdapter malformed output cases"
        status: pass
    human_judgment: false
  - id: D3
    description: "deriveRuleGateStatuses emits one pass/fail/waived record for every request rule id, with exact/distinct-token finding matches only."
    requirement: GATE-04
    verification:
      - kind: unit
        ref: "src/governance/verify-gate-hook.test.ts#deriveRuleGateStatuses maps findings to exact or distinct-token rule ids only"
        status: pass
      - kind: unit
        ref: "src/governance/verify-gate-hook.test.ts#deriveRuleGateStatuses inherits overall pass or waived when no finding matches"
        status: pass
    human_judgment: false

duration: 8 min
completed: 2026-07-07
status: complete
---

# Phase 08 Plan 03: Verify Gate Hook Summary

**Verify gate hook using runAdapter-validated evidence and per-rule pass/fail/waived status derivation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-07T05:08:34Z
- **Completed:** 2026-07-07T05:16:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `verifyGateHook(args)` that reads `.planning/governance/selection-state.json`, builds a `gateId: "verify"` request, calls `runAdapter(adapter, request)`, and writes `.planning/governance/gates/08-verify.json`.
- Added `deriveRuleGateStatuses(request, result)` with exact and distinct-token finding id matching, including pass, fail, waived, non-match, and ambiguous substring coverage.
- Added direct runner support: `node dist/governance/verify-gate-hook.js <projectRoot> <phaseNumber>` prints JSON and exits non-zero on errors.

## Task Commits

1. **Task 1: Wave 0 RED tests for verify adapter flow** - `738a49c` (test)
2. **Task 2: GREEN implementation for verifyGateHook** - `440ee48` (feat)

**Plan metadata:** pending (this SUMMARY/STATE/ROADMAP commit)

## Files Created/Modified

- `src/governance/verify-gate-hook.ts` - Verify gate request construction, adapter-boundary call, evidence write, rule status derivation, and direct runner.
- `src/governance/verify-gate-hook.test.ts` - TDD coverage for D-04, D-05, D-06, malformed adapter rejection, injected echo adapters, missing selection state, and per-rule status mapping.

## Decisions Made

- Production verify wiring uses `ADAPTERS` with `generic-exit-ci`; `ECHO_ADAPTERS` and custom adapters are test seams only.
- Unmatched rules in a failing result are treated as pass because per-rule failure is finding-driven; overall `waived` still waives unmatched rules.
- The hook does not add APPR-01, rollback, test catalog, or full audit fields; Phase 9 owns audit enrichment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed RED fixture type errors**
- **Found during:** Task 1 RED
- **Issue:** The first test draft used invalid `riskTier: "high"` and an erased-type callback produced an implicit-any error while the implementation module was intentionally missing.
- **Fix:** Changed the fixture to `riskTier: "critical"` and annotated the callback so RED failed only on missing `./verify-gate-hook.js`.
- **Files modified:** `src/governance/verify-gate-hook.test.ts`
- **Verification:** `npm run build:test` failed only with `Cannot find module './verify-gate-hook.js'`.
- **Committed in:** `738a49c`

**Total deviations:** 1 auto-fixed (1 blocking test-fixture issue).
**Impact on plan:** No scope change; RED still proved the planned missing implementation.

## Issues Encountered

- RED failed as expected on missing `./verify-gate-hook.js`.
- Full suite retains 3 pre-existing platform/runtime skips; no failures.
- Close-out `state.update-progress` reported 83% but left `STATE.md` frontmatter at 40%; patched the frontmatter percent to match the handler output.

## Verification

- `npm run build:test` failed during RED only on missing `./verify-gate-hook.js`.
- `npm run build:test` passed after GREEN.
- `node --test "dist-test/governance/verify-gate-hook.test.js" "dist-test/enforcement/run-adapter.test.js"` passed: 16 pass, 0 fail.
- `npm test` passed: 278 pass, 0 fail, 3 skipped.

## TDD Gate Compliance

- RED gate: `738a49c` (`test(08-03): add failing tests for verify gate hook`) - verified by failing `npm run build:test` before implementation.
- GREEN gate: `440ee48` (`feat(08-03): implement verify gate hook`) - targeted tests and full suite pass.
- REFACTOR gate: not needed; implementation is one small hook module.

## Authentication Gates

None.

## Known Stubs

None. Stub scan only found the planned missing-selection `null` guard. Existing Phase 7 no-op adapters are intentionally consumed through `ADAPTERS` as required by D-05.

## Threat Flags

None. Adapter output, selection state, and evidence persistence are the planned trust boundaries in the 08-03 threat model.

## Self-Check: PASSED

- Found `src/governance/verify-gate-hook.ts`.
- Found `src/governance/verify-gate-hook.test.ts`.
- Found `.planning/phases/08-remaining-gate-hooks/08-03-SUMMARY.md`.
- Found commits `738a49c` and `440ee48`.
- No tracked file deletions.
- `.codegraph/` and `.idea/` remained unmodified and uncommitted.

## Next Phase Readiness

08-04 can add the ship gate knowing verify evidence is written through the same gate evidence store and adapter-output validation boundary.

---
*Phase: 08-remaining-gate-hooks*
*Completed: 2026-07-07*
