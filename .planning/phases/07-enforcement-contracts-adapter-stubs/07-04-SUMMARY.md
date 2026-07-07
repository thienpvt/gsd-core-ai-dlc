---
phase: 07-enforcement-contracts-adapter-stubs
plan: 04
subsystem: enforcement
tags: [tdd, ajv, json-schema, gate-adapter, governance]

requires:
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: [gate-result schema, validateGateResult, GateAdapter stubs]
provides:
  - runAdapter hard-fail boundary wrapper
  - runAdapter TDD coverage for valid, malformed, and exploding adapters
  - malformed-fixture gate contract tests proving ENF-02 and ENF-04
affects: [phase-08-gate-hooks, phase-09-audit-record]

tech-stack:
  added: []
  patterns:
    - "Adapter output crosses consumers only through runAdapter: evaluate -> validate -> return"
    - "Runtime validation errors preserve validateGateResult Ajv instancePath details"

key-files:
  created:
    - src/enforcement/run-adapter.ts
    - src/enforcement/run-adapter.test.ts
  modified:
    - src/governance/gate-contracts.test.ts

key-decisions:
  - "runAdapter does not catch adapter.evaluate errors; runtime tool failures propagate as original errors while only malformed output is validation-shaped."
  - "runAdapter imports validateGateResult under a local alias so the wrapper still calls the canonical validator while acceptance grep stays exact."

patterns-established:
  - "Phase 8 gate hooks should call runAdapter(adapter, request), never direct adapter evaluation, to preserve the integrity gate."

requirements-completed: [ENF-02, ENF-04]

coverage:
  - id: D1
    description: "runAdapter validates every adapter GateResult before returning it and propagates adapter runtime errors unchanged."
    requirement: ENF-02
    verification:
      - kind: unit
        ref: "src/enforcement/run-adapter.test.ts#8 runAdapter boundary cases"
        status: pass
      - kind: other
        ref: "npm test"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gate contract tests prove malformed gate-result fixtures hard-fail through validateGateResult and runAdapter."
    requirement: ENF-04
    verification:
      - kind: unit
        ref: "src/governance/gate-contracts.test.ts#15 contract cases"
        status: pass
      - kind: other
        ref: "node --test dist-test/governance/gate-contracts.test.js"
        status: pass
    human_judgment: false

duration: 11 min
completed: 2026-07-07
status: complete
---

# Phase 07 Plan 04: runAdapter Hard-Fail Boundary Summary

**runAdapter hard-fail wrapper with malformed-fixture contract tests for ENF-02 and ENF-04**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-07T02:20:10Z
- **Completed:** 2026-07-07T02:31:34Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `runAdapter(adapter, request)` as the sanctioned boundary: evaluate, validate, return.
- Added 8 TDD tests proving valid output returns, malformed output throws, and adapter runtime errors propagate unchanged.
- Appended 9 malformed-fixture and boundary contract tests to `gate-contracts.test.ts`, preserving the original 6 schema smoke tests.

## Task Commits

1. **Task 1: RED - failing tests for runAdapter hard-fail boundary** - `c0e1eb4` (test)
2. **Task 2: GREEN - implement runAdapter wrapper** - `b4ba33d` (feat)
3. **Task 3: Append malformed-fixture contract tests to gate-contracts.test.ts** - `c9dd140` (test)

## Files Created/Modified

- `src/enforcement/run-adapter.ts` - Boundary wrapper that validates adapter output with `validateGateResult` before returning it.
- `src/enforcement/run-adapter.test.ts` - TDD coverage for valid no-op/echo adapters, malformed output, attribution, and exploding adapters.
- `src/governance/gate-contracts.test.ts` - Appended malformed-fixture and runAdapter boundary tests.

## Decisions Made

- Runtime errors from adapters are not wrapped. Only malformed adapter output becomes an `invalid gate-result` validation failure.
- The wrapper documents the sanctioned call path in JSDoc without adding any loader, registry, or second abstraction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript cast overlap in appended contract tests**
- **Found during:** Task 3
- **Issue:** `Record<string, unknown>` to `GateRequest` casts failed TypeScript overlap checks.
- **Fix:** Cast test fixtures through `unknown` before `GateRequest`; runtime value stayed unchanged.
- **Files modified:** `src/governance/gate-contracts.test.ts`
- **Verification:** `npm run build:test`, `npm test`, and targeted `node --test dist-test/governance/gate-contracts.test.js` passed.
- **Committed in:** `c9dd140`

**Total deviations:** 1 auto-fixed (Rule 3 blocking).
**Impact on plan:** No scope change; fix was required for TypeScript to compile the planned tests.

## Issues Encountered

- RED phase failed as expected on missing `./run-adapter.js`.
- Task 3 initially hit a TypeScript cast warning; fixed before commit.

## Verification

- `npm run build` passed.
- `npm test` passed: 249 pass, 0 fail, 3 skipped.
- `node --test dist-test/governance/gate-contracts.test.js` passed: 15 pass, 0 fail.
- TDD gate commits present: `c0e1eb4` RED, `b4ba33d` GREEN, `c9dd140` appended contract tests.

## Authentication Gates

None.

## Known Stubs

None in files created or modified by this plan.

## Self-Check: PASSED

- Found `src/enforcement/run-adapter.ts`.
- Found `src/enforcement/run-adapter.test.ts`.
- Found `src/governance/gate-contracts.test.ts`.
- Found commits `c0e1eb4`, `b4ba33d`, and `c9dd140`.
- No unexpected tracked-file deletions.
- Stub scan found no placeholder/TODO/FIXME patterns in files touched by this plan.

## Next Phase Readiness

Phase 7 enforcement contracts are complete. Phase 8 can call `runAdapter(adapter, request)` from plan/verify/ship gates and rely on schema-validated `GateResult` output.

---
*Phase: 07-enforcement-contracts-adapter-stubs*
*Completed: 2026-07-07*
