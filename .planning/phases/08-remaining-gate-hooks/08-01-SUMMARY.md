---
phase: 08-remaining-gate-hooks
plan: 01
subsystem: governance
tags: [tdd, gate-evidence, atomic-write, enforcement]

requires:
  - phase: 06-v1-0-tech-debt-fold-in
    provides: shared atomicWriteFile(finalPath, data) helper with unique temp suffix
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: GateRequest, GateResult, GateId, and validateGateResult enforcement boundary
provides:
  - gateEvidencePath(projectRoot, phaseNumber, gateId)
  - GateEvidence read/write store under .planning/governance/gates/{NN}-{gate}.json
  - Fail-loud validation for malformed persisted gate evidence
affects: [08-02, 08-03, 08-04, 08-05, phase-09-audit-record]

tech-stack:
  added: []
  patterns:
    - "Fixed per-phase/per-gate evidence files under .planning/governance/gates/"
    - "Persisted gate evidence validates request/result/metadata before crossing the filesystem boundary"

key-files:
  created:
    - src/governance/gate-evidence-store.ts
    - src/governance/gate-evidence-store.test.ts
  modified:
    - src/governance/paths.ts

key-decisions:
  - "Gate evidence path is single-sourced in paths.ts as .planning/governance/gates/{NN}-{gate}.json; phaseNumber rejects non-NN and NN.x shapes."
  - "GateEvidence stays minimal: { request, result, metadata }; Phase 9 owns larger audit rollups."
  - "writeGateEvidence derives the destination gate from request.gateId and delegates persistence only to atomicWriteFile; it never touches selection-state.json."

patterns-established:
  - "Malformed persisted gate evidence throws `malformed gate evidence at <path>:` instead of returning null."
  - "Gate evidence reads return null only for missing files; corrupt files fail closed."

requirements-completed: [GATE-03, GATE-04, GATE-05]

coverage:
  - id: D1
    description: "gateEvidencePath(projectRoot, phaseNumber, gateId) resolves evidence to .planning/governance/gates/{NN}-{gate}.json and rejects invalid phase numbers."
    requirement: GATE-03
    verification:
      - kind: unit
        ref: "src/governance/gate-evidence-store.test.ts#gateEvidencePath stores gate evidence under .planning/governance/gates/{NN}-{gate}.json"
        status: pass
      - kind: other
        ref: "npm run build:test && node --test \"dist-test/governance/gate-evidence-store.test.js\""
        status: pass
    human_judgment: false
  - id: D2
    description: "GateEvidence store writes request, validated result, and metadata atomically, then round-trips the same object."
    requirement: GATE-04
    verification:
      - kind: unit
        ref: "src/governance/gate-evidence-store.test.ts#writeGateEvidence round-trips request, validated result, and metadata"
        status: pass
      - kind: unit
        ref: "src/governance/gate-evidence-store.test.ts#writeGateEvidence leaves no temp siblings and never writes selection-state.json"
        status: pass
      - kind: other
        ref: "npm test (268 pass, 0 fail, 3 skipped)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Malformed gate evidence fails loud for bad JSON, missing request/result/metadata, gate mismatch, phase mismatch, and non-strict metadata timestamps."
    requirement: GATE-05
    verification:
      - kind: unit
        ref: "src/governance/gate-evidence-store.test.ts#readGateEvidence throws loud on malformed JSON"
        status: pass
      - kind: unit
        ref: "src/governance/gate-evidence-store.test.ts#readGateEvidence throws loud when request, result, or metadata is missing"
        status: pass
      - kind: unit
        ref: "src/governance/gate-evidence-store.test.ts#readGateEvidence throws loud when request and result gate ids differ"
        status: pass
      - kind: unit
        ref: "src/governance/gate-evidence-store.test.ts#readGateEvidence throws loud when metadata phase mismatches the path phase"
        status: pass
      - kind: unit
        ref: "src/governance/gate-evidence-store.test.ts#readGateEvidence throws loud when metadata.writtenAt is not strict ISO"
        status: pass
    human_judgment: false

duration: 8 min
completed: 2026-07-07
status: complete
---

# Phase 08 Plan 01: Gate Evidence Store Summary

**Durable gate evidence store with fixed atomic JSON files for plan, verify, and ship gates**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-07T04:34:41Z
- **Completed:** 2026-07-07T04:42:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `gateEvidencePath(projectRoot, phaseNumber, gateId)` for `.planning/governance/gates/{NN}-{gate}.json`.
- Added `GateEvidence`, `writeGateEvidence`, and `readGateEvidence` with atomic writes through `atomicWriteFile`.
- Added 9 `node:test` cases covering D-10, D-11, D-12: fixed path, missing evidence null, round-trip writes, no temp leftovers, no selection-state overwrite, and loud malformed reads.

## Task Commits

1. **Task 1: Wave 0 RED tests for gate evidence store** - `84a4780` (test)
2. **Task 2: GREEN implementation for fixed-path atomic evidence** - `9b66559` (feat)

**Plan metadata:** pending (this SUMMARY/STATE/ROADMAP commit)

## Files Created/Modified

- `src/governance/gate-evidence-store.ts` - Gate evidence read/write store with fail-loud validation.
- `src/governance/gate-evidence-store.test.ts` - TDD coverage for fixed paths, atomic writes, and malformed evidence.
- `src/governance/paths.ts` - Added `gateEvidencePath`.

## Decisions Made

- Gate evidence uses a small `{ request, result, metadata }` wrapper only; full audit enrichment stays in Phase 9.
- Missing evidence returns `null`; malformed persisted evidence throws with the exact file path.
- Evidence writes derive the gate file from `request.gateId`, validate `GateResult`, and use `atomicWriteFile` only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invalid test fixture matched axis**
- **Found during:** Task 1 RED
- **Issue:** The first test draft used `matchedAxis: "path"`, but the project enum uses `"paths"`.
- **Fix:** Changed fixture to `matchedAxis: "paths"` so RED failed only on missing implementation.
- **Files modified:** `src/governance/gate-evidence-store.test.ts`
- **Verification:** `npm run build:test` failed only on missing `gate-evidence-store.js` and missing `gateEvidencePath`.
- **Committed in:** `84a4780`

**2. [Rule 3 - Blocking] Fixed TypeScript cast overlap in malformed-field test**
- **Found during:** Task 2 GREEN
- **Issue:** Casting `GateEvidence` directly to `Record<string, unknown>` failed TypeScript overlap checks.
- **Fix:** Replaced the cast with object spread into `Record<string, unknown>`.
- **Files modified:** `src/governance/gate-evidence-store.test.ts`
- **Verification:** `npm run build:test` passed.
- **Committed in:** `9b66559`

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking).
**Impact on plan:** No scope change; both fixes kept the planned tests compiling and behavior-focused.

## Issues Encountered

- RED gate failed as expected on missing `./gate-evidence-store.js` and missing `gateEvidencePath`.
- Full suite has 3 pre-existing skipped tests for local runtime/symlink availability; no failures.

## Verification

- `npm run build:test` failed during RED with missing implementation/export errors only.
- `npm run build:test && node --test "dist-test/governance/gate-evidence-store.test.js"` passed.
- `npm test` passed: 268 pass, 0 fail, 3 skipped.

## TDD Gate Compliance

- RED gate: `84a4780` (`test(08-01): add failing tests for gate evidence store`) — verified by failing `npm run build:test` before implementation.
- GREEN gate: `9b66559` (`feat(08-01): implement gate evidence store`) — targeted tests and full suite pass.
- REFACTOR gate: not needed; implementation is a single small store plus one path helper.

## Authentication Gates

None.

## Known Stubs

None. Stub scan only found a null guard and a test default parameter; neither is a UI/data stub.

## Self-Check: PASSED

- Found `src/governance/gate-evidence-store.ts`.
- Found `src/governance/gate-evidence-store.test.ts`.
- Found modified `src/governance/paths.ts`.
- Found commits `84a4780` and `9b66559`.
- No tracked file deletions.
- `.codegraph/` and `.idea/` remained unmodified and uncommitted.

## Next Phase Readiness

Plans 08-02, 08-03, and 08-04 can now use the same evidence store for plan, verify, and ship hooks.

---
*Phase: 08-remaining-gate-hooks*
*Completed: 2026-07-07*
