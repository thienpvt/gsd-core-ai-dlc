---
phase: 09-complete-audit-record-approval
plan: 01
subsystem: governance
tags: [json-schema, ajv, draft-2020-12, durable-store, approval, tdd]

# Dependency graph
requires:
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: validate.ts pattern (Ajv 2020 + x-binding pre-compile), GateId union, gate-result schema convention
  - phase: 08-remaining-gate-hooks
    provides: gate-evidence-store.ts durable-store template (atomicWriteFile + 4-rung loud-fail read ladder), paths.ts PHASE_NUMBER_RE helper
provides:
  - ApprovalRecord interface + writeApproval/readApproval durable store under .planning/governance/approvals/{NN}.json
  - validateApproval Ajv 2020 runtime validator (5th instance of validate.ts pattern)
  - approval.schema.json (draft 2020-12, D-05 10-field shape, x-binding: binding)
  - approvalPath + testEvidencePath path helpers (Plan 02 consumes testEvidencePath without re-modifying paths.ts)
affects: [09-02 (testEvidencePath), 09-03 (ApprovalRecord summary in audit v2), 09-04 (ship-gate approval blocking via writeApproval/readApproval)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Durable-store clone of gate-evidence-store.ts (atomic write + 4-rung loud-fail read ladder + assertXxx pre/post validation)"
    - "5th instance of validate.ts pattern (validateFrontmatter → validateIndex → validateSignal → validateGateResult → validateApproval): Ajv 2020 strict + addFormats + x-binding keyword registered before compile"
    - "Post-Ajv D-07 invariant: non-pending decision requires non-empty decidedBy (anti-auto-approve trust boundary, distinct from schema minLength which catches empty strings only)"

key-files:
  created:
    - src/schema/approval.schema.json
    - src/enforcement/validate-approval.ts
    - src/enforcement/validate-approval.test.ts
    - src/governance/approval-store.ts
    - src/governance/approval-store.test.ts
  modified:
    - src/governance/paths.ts

key-decisions:
  - "D-07 anti-auto-approve invariant enforced via post-Ajv runtime check (not schema) — schema-level minLength:1 on decidedBy catches empty strings but not field absence, so the runtime check is load-bearing for the pending→decided lifecycle"
  - "D-06/D-12 deviation: approval lifecycle routed directly through approval-store.ts + validateApproval, NOT through runAdapter(human-approval, request). The Phase 7 human-approval adapter is a no-op stub returning GateResult (not ApprovalRecord); the ENF-02 malformed-hard-fail intent is preserved because validateApproval clones validate-gate-result.ts's Ajv-2020 boundary."
  - "ApprovalRecord.gateId typed as GateId | (string & {}) to accept the 5-value GSD loop gate union at compile time while still allowing schema-driven runtime validation to catch out-of-enum values"

patterns-established:
  - "Approval decision vocab (pending|approved|rejected|waived) is DISTINCT from GateResult.status (pass|fail|waived) — kept on separate types per Pitfall 3"
  - "decidedBy/decidedAt/rationale optional on the schema + type; absent while decision=pending (not empty strings — empty strings fail schema minLength)"
  - "Approval store keeps the 4-rung loud-fail read ladder verbatim from gate-evidence-store.ts (existsSync→null / try-readFileSync / try-JSON.parse / assertApproval) — same tampered-disk protection as gate evidence"

requirements-completed: [APPR-01]

coverage:
  - id: D1
    description: "Approval schema (draft 2020-12, D-05 10-field shape, x-binding: binding) published at src/schema/approval.schema.json"
    requirement: APPR-01
    verification:
      - kind: unit
        ref: "src/enforcement/validate-approval.test.ts#the validator is compiled once at module load"
        status: pass
    human_judgment: false
  - id: D2
    description: "validateApproval: Ajv 2020 runtime validator — 5th instance of validate.ts pattern; accepts schema-valid records, rejects missing required fields / enum violations / D-07 invariant (non-pending decision without decidedBy)"
    requirement: APPR-01
    verification:
      - kind: unit
        ref: "src/enforcement/validate-approval.test.ts (38 acceptance/rejection cases, all GREEN)"
        status: pass
    human_judgment: false
  - id: D3
    description: "ApprovalRecord durable store: writeApproval/readApproval under .planning/governance/approvals/{NN}.json with atomicWriteFile + 4-rung loud-fail read ladder"
    requirement: APPR-01
    verification:
      - kind: unit
        ref: "src/governance/approval-store.test.ts (round-trip + malformed-JSON loud-fail + missing-required-field loud-fail)"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-07 anti-auto-approve trust boundary: writeApproval rejects non-pending decisions without decidedBy; accepts pending with decidedBy absent (ship-gate hook-written pending requests pass)"
    requirement: APPR-01
    verification:
      - kind: unit
        ref: "src/governance/approval-store.test.ts#D-07 writeApproval rejects decision='approved' with no decidedBy"
        status: pass
      - kind: unit
        ref: "src/governance/approval-store.test.ts#D-07 writeApproval accepts decision='pending' with decidedBy absent"
        status: pass
    human_judgment: false
  - id: D5
    description: "approvalPath + testEvidencePath helpers in paths.ts (PHASE_NUMBER_RE-validated, .planning/governance/{approvals,tests}/{NN}.json); Plan 02 consumes testEvidencePath without re-modifying paths.ts"
    requirement: APPR-01
    verification:
      - kind: unit
        ref: "src/governance/approval-store.test.ts#approvalPath stores approval under .planning/governance/approvals/{NN}.json"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-07
status: complete
---

# Phase 9 Plan 01: Approval Store + Schema + Validator Summary

**APPR-01 human approval checkpoint: draft 2020-12 schema, Ajv 2020 validator (5th instance of validate.ts pattern), and durable store routing approval persistence through validateApproval to inherit ENF-02 malformed-hard-fail + D-07 anti-auto-approve invariant.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-07T15:13:22Z
- **Completed:** 2026-07-07T15:20:03Z
- **Tasks:** 3 (TDD: RED → GREEN → REFACTOR-noop)
- **Files modified:** 7 (5 created, 1 modified source, 0 deleted)

## Accomplishments
- Approval schema published with D-05 10-field shape, x-binding: binding, strict ISO 8601 timestamps (TD-01 shape), decision enum as the 4-value approval vocab
- validateApproval runtime validator clones validate-gate-result.ts verbatim (Ajv 2020 + addFormats + x-binding keyword pre-compile); post-Ajv D-07 check prevents model self-approval
- approval-store.ts clones gate-evidence-store.ts 1:1 (atomicWriteFile + 4-rung loud-fail read ladder) — inherits the tampered-disk trust boundary for free
- approvalPath + testEvidencePath added to paths.ts (single-sourced layout, Plan 02 consumes testEvidencePath unchanged)
- 38 new approval tests green; full suite 327 tests, 0 fail, 0 regression

## Task Commits

Each task was committed atomically:

1. **Task 1: RED** — `f18a35b` (test): approval.schema.json + failing validate-approval.test.ts + failing approval-store.test.ts
2. **Task 2: GREEN** — `eecb6c0` (feat): implement validate-approval.ts + approval-store.ts + extend paths.ts
3. **Task 3: REFACTOR** — no-op commit (full suite green; no duplication warrants extraction per PATTERNS anti-pattern guidance)

## Files Created/Modified
- `src/schema/approval.schema.json` — D-05 10-field approval contract, draft 2020-12, x-binding: binding, 7 required + 3 optional (decidedBy/decidedAt/rationale absent while pending per D-07)
- `src/enforcement/validate-approval.ts` — 5th instance of validate.ts pattern; Ajv 2020 strict + addFormats + x-binding keyword before compile; post-Ajv D-07 invariant
- `src/governance/approval-store.ts` — clone of gate-evidence-store.ts (atomicWriteFile + 4-rung loud-fail read ladder); validates via validateApproval; inherits D-07 anti-auto-approve
- `src/enforcement/validate-approval.test.ts` — schema acceptance/rejection idiom (mirror of validate-gate-result.test.ts) + 3 D-07-specific tests
- `src/governance/approval-store.test.ts` — round-trip + malformed-JSON loud-fail + missing-required-field + 4 D-07-specific tests
- `src/governance/paths.ts` — +approvalPath +testEvidencePath (PHASE_NUMBER_RE-validated, .planning/governance/{approvals,tests}/{NN}.json layout)

## Decisions Made
- **D-07 runtime check over schema-only:** decidedBy `minLength: 1` in the schema catches empty strings but the field is optional while decision=pending (legitimate absence). A post-Ajv runtime check in validateApproval is the load-bearing anti-auto-approve boundary.
- **Direct store path over runAdapter routing (D-06/D-12 deviation):** the plan's `<objective>` documents this deviation — Phase 7's `human-approval` adapter is a no-op stub returning `GateResult` (the wrong type for an ApprovalRecord). The ENF-02 malformed-hard-fail intent is preserved via `validateApproval` cloning `validate-gate-result.ts`'s Ajv-2020 boundary. Re-evaluate if a real human-approval adapter lands post-v2.0.
- **ApprovalRecord.gateId typed as `GateId | (string & {})`:** closed enum at the type level for ergonomics, but the union with a branded string allows schema-driven runtime validation to catch out-of-enum values without TS complaining at legitimate string inputs that fail validation.
- **REFACTOR task = no-op:** Per PATTERNS.md anti-pattern guidance, the duplicated `formatErrors` helper and the duplicated store ladder across validate-approval/validate-gate-result and approval-store/gate-evidence-store are intentional — extracting a generic validator or generic store would hurt readability and couple sibling failures (one crash shouldn't take down sibling validators/stores).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] D-07 regex test pattern missed multiline Ajv errors**
- **Found during:** Task 2 (GREEN run)
- **Issue:** Two D-07 tests used regex `/invalid approval.*decidedBy/i`. The `.` in JS regex doesn't cross newlines, but the wrapped error message for the empty-string `decidedBy` case is `invalid approval:\n/decidedBy must NOT have fewer than 1 characters` (Ajv emits the path on the next line). Two tests failed.
- **Fix:** Changed the regex to `/invalid approval[\s\S]*decidedBy/i` in both test files so the assertion matches across the `\n` boundary. Same idiom used by `audit-artifact.test.ts` and `validate-gate-result.test.ts` when matching multiline error envelopes.
- **Files modified:** src/enforcement/validate-approval.test.ts, src/governance/approval-store.test.ts
- **Verification:** All 38 approval tests pass; full suite 327 pass / 0 fail.
- **Committed in:** eecb6c0 (part of Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test-only correction; no scope creep, no production-code deviation from the plan.

## Issues Encountered
None beyond the regex auto-fix above.

## User Setup Required
None — no external service configuration required. The approval store is pure local file I/O under `.planning/governance/approvals/`. Human approval resolution happens out-of-band (Plan 09-04 wires the ship-gate blocking path).

## Next Phase Readiness
- Plan 02 (test-evidence capture) can consume `testEvidencePath` from paths.ts without modifying paths.ts again.
- Plan 03 (audit enrichment v2) can read `ApprovalRecord` via `readApproval` and embed a summary view in the v2 audit.
- Plan 04 (ship-gate approval blocking) can call `writeApproval` to create the pending request and `readApproval` + D-08 check to block.

---
*Phase: 09-complete-audit-record-approval*
*Completed: 2026-07-07*

## Self-Check: PASSED

- All 6 created/modified files exist on disk.
- Both task commits present in git log (`f18a35b`, `eecb6c0`).
- SUMMARY.md exists at the canonical path.