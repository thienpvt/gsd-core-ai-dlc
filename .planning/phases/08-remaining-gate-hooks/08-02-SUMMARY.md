---
phase: 08-remaining-gate-hooks
plan: 02
subsystem: governance
tags: [tdd, plan-gate, task-signal, gate-evidence]

requires:
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: GateRequest, GateResult, and strict gate-result validation shape
  - phase: 08-remaining-gate-hooks
    provides: GateEvidence read/write store under .planning/governance/gates/{NN}-{gate}.json
provides:
  - PlanTaskSignalInputs, PlanHookArgs, PlanHookResult
  - derivePlannerTaskSignal(inputs) with validated D-02 planner signal derivation
  - planHook(args) summary-only plan governance fragment plus 08-plan.json evidence
  - direct runner: node dist/governance/plan-hook.js <projectRoot> <phaseNumber> <plannerInputsJsonFile>
affects: [08-03, 08-04, 08-05, phase-09-audit-record]

tech-stack:
  added: []
  patterns:
    - "Plan gate reuses select() plus renderInjection(); no second selector."
    - "Plan gate writes .planning/governance/gates/{NN}-plan.json and never writes selection-state.json."
    - "Planner modules normalize to POSIX module globs so path triggers can select module-scoped rules."

key-files:
  created:
    - src/governance/plan-hook.ts
    - src/governance/plan-hook.test.ts
  modified: []

key-decisions:
  - "Impacted modules are normalized to POSIX module globs like src/governance/** so existing path-trigger selection can match module-level planner inputs without a new selector axis."
  - "Budget overflow still returns the summary-only fragment but records a failing plan GateResult with one actionable finding."
  - "Plan evidence is independent durable gate evidence; execute selection state remains owned by discussHook."

patterns-established:
  - "Plan hooks derive TaskSignal from planner inputs, then validate before selection."
  - "Plan-time gate evidence uses evaluatedBy: aidlc-governance-plan."

requirements-completed: [GATE-03]

coverage:
  - id: D1
    description: "Planner TaskSignal derivation covers phase goal, requirement IDs, risk/threat model, acceptance criteria, impacted files, and impacted modules."
    requirement: GATE-03
    verification:
      - kind: unit
        ref: "src/governance/plan-hook.test.ts#derivePlannerTaskSignal derives observable keywords and paths from every planner source"
        status: pass
      - kind: unit
        ref: "src/governance/plan-hook.test.ts#derivePlannerTaskSignal uses feature task type when risk/threat text is absent"
        status: pass
    human_judgment: false
  - id: D2
    description: "planHook renders summary-only governance through select() and renderInjection(), writes 08-plan.json, and leaves selection-state.json untouched."
    requirement: GATE-03
    verification:
      - kind: unit
        ref: "src/governance/plan-hook.test.ts#planHook renders summary-only governance and writes plan evidence without selection state"
        status: pass
      - kind: other
        ref: "npm run build:test && node --test \"dist-test/governance/plan-hook.test.js\""
        status: pass
    human_judgment: false
  - id: D3
    description: "Budget overflow preserves fragment output and stores a failing plan GateResult."
    requirement: GATE-03
    verification:
      - kind: unit
        ref: "src/governance/plan-hook.test.ts#planHook preserves fragment output and records a failing gate result on budget overflow"
        status: pass
      - kind: other
        ref: "npm test"
        status: pass
    human_judgment: false

duration: 8 min
completed: 2026-07-07
status: complete
---

# Phase 08 Plan 02: Plan Gate Hook Summary

**Plan gate hook deriving validated planner signals, rendering summary-only governance, and writing separate plan evidence**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-07T04:52:41Z
- **Completed:** 2026-07-07T05:00:47Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `derivePlannerTaskSignal` for phase goals, requirement IDs, risk/threat text, acceptance criteria, impacted files, and impacted modules.
- Added `planHook(args)` using `validateSignal`, `classifyRisk`, `riskAdjustedDomains`, `select`, and `renderInjection`.
- Added plan evidence writes to `.planning/governance/gates/08-plan.json` with `evaluatedBy: "aidlc-governance-plan"` and no writes to `.planning/governance/selection-state.json`.
- Added budget-overflow handling that returns the fragment and stores a failing `GateResult`.

## Task Commits

1. **Task 1: Wave 0 RED tests for plan gate selection and evidence** - `8697379` (test)
2. **Task 2: GREEN implementation for planHook** - `c2094c3` (feat)

**Plan metadata:** pending (this SUMMARY/STATE/ROADMAP commit)

## Files Created/Modified

- `src/governance/plan-hook.ts` - Plan gate signal derivation, selection/render orchestration, evidence write, and direct runner.
- `src/governance/plan-hook.test.ts` - TDD coverage for D-01, D-02, D-03, summary-only rendering, separate evidence, and budget overflow.

## Decisions Made

- Impacted modules become POSIX globs like `src/governance/**`; this keeps module inputs usable by the existing path selector without adding a new selection axis.
- Budget overflow is represented as a failing plan `GateResult`, not an exception, because the planner still needs the fragment to see what overflowed.
- The plan hook owns separate gate evidence only; `selection-state.json` remains the discuss/execute boundary.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- RED failed as expected on missing `./plan-hook.js`.
- Full suite has 3 pre-existing skipped tests for local capability/symlink availability; no failures.

## Verification

- `npm run build:test` failed during RED with missing `./plan-hook.js` only.
- `npm run build:test && node --test "dist-test/governance/plan-hook.test.js"` passed: 4 pass, 0 fail.
- `npm test` passed: 272 pass, 0 fail, 3 skipped.

## TDD Gate Compliance

- RED gate: `8697379` (`test(08-02): add failing tests for plan gate hook`) - verified by failing `npm run build:test` before implementation.
- GREEN gate: `c2094c3` (`feat(08-02): implement plan gate hook`) - targeted tests and full suite pass.
- REFACTOR gate: not needed; implementation is one thin hook module.

## Authentication Gates

None.

## Known Stubs

None. Stub scan matches were deliberate test source-removal fixtures and local accumulator arrays, not UI/data stubs.

## Threat Flags

None. New file access is the planned direct runner JSON input and the planned evidence store write; no new network endpoint, auth path, schema, or unmodeled trust boundary was introduced.

## Self-Check: PASSED

- Found `src/governance/plan-hook.ts`.
- Found `src/governance/plan-hook.test.ts`.
- Found `.planning/phases/08-remaining-gate-hooks/08-02-SUMMARY.md`.
- Found commits `8697379` and `c2094c3`.
- No tracked file deletions.
- `.codegraph/` and `.idea/` remained unmodified and uncommitted.

## Next Phase Readiness

Plan gate evidence is ready for 08-05 ship checks. Verify and ship hooks can use the same evidence store pattern from 08-01 and the plan evidence shape from this plan.

---
*Phase: 08-remaining-gate-hooks*
*Completed: 2026-07-07*
