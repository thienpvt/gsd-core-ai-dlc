---
phase: 09-complete-audit-record-approval
plan: 04
subsystem: governance
tags: [ship-gate, approval-blocking, fail-closed, capability-manifest, tdd, d-07, d-08]

# Dependency graph
requires:
  - phase: 08-remaining-gate-hooks
    provides: ship-gate-hook.ts fail-closed prior-evidence pattern (readRequiredEvidence + assertNonBlocking)
  - phase: 09-01
    provides: approval-store.ts (readApproval, writeApproval, ApprovalRecord, ApprovalDecision)
  - phase: 09-03
    provides: audit-enrich.ts + buildAuditRecord v2 (verify:post audit hook emits enriched GOVERNANCE.md)
provides:
  - ship-gate-hook.ts approval blocking (readApprovalOrFail + assertNoBlockingApprovals + writePendingApproval)
  - capability.json manifest extension (verify:post audit consumes CONTEXT.md; ship:pre produces approvals + consumes GOVERNANCE.md)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ship-gate approval check clones readRequiredEvidence + assertNonBlocking fail-closed pattern (Phase 8) — D-08 mirrors GATE-05"
    - "D-07 anti-auto-approve: writePendingApproval OMITS decidedBy/decidedAt (undefined, not empty string) — post-Ajv runtime check in validateApproval is load-bearing"
    - "Approval state isolation: ship GateEvidence record has NO approval fields; approval state lives in approvals/{NN}.json (separate file)"

key-files:
  created: []
  modified:
    - src/governance/ship-gate-hook.ts
    - src/governance/ship-gate-hook.test.ts
    - .gsd/capabilities/aidlc-governance/capability.json
    - src/governance/audit-hook-contract.test.ts
    - src/governance/consent-verify-post.test.ts
    - src/governance/consent.test.ts

key-decisions:
  - "D-07 anti-auto-approve: writePendingApproval constructs ApprovalRecord with decidedBy/decidedAt ABSENT (undefined, not empty string). Tests assert `'decidedBy' in approval === false` — field absence, not empty-string presence."
  - "D-08 fail-closed: assertNoBlockingApprovals throws on pending OR rejected (mirrors GATE-05 assertNonBlocking); approved OR waived proceeds. All 4 decision values tested."
  - "Approval check ordering: readApprovalOrFail + assertNoBlockingApprovals inserted AFTER plan/verify assertNonBlocking, BEFORE ship evidence construction + writeGateEvidence. Fail-closed ordering preserved — pending/rejected approval blocks ship evidence write."
  - "D-13/D-16 deviation: plan specified path-prefixed consumes entries (tests/{NN}.json, approvals/{NN}.json, REQUIREMENTS.md, VERIFICATION.md, .planning/phases/{NN}-*/CONTEXT.md, .planning/phases/{NN}-*/GOVERNANCE.md) but gsd-core validateConsumesGlobal rejects consumes with no producer or wrong-point producer. Used bare host artifact names (CONTEXT.md, GOVERNANCE.md) which ARE produced by host/hooks. Approvals/{NN}.json declared at ship:pre produces (valid). Audit skill reads files directly regardless — consumes is advisory data-flow metadata."

patterns-established:
  - "Ship-gate approval lifecycle: no approval -> writePendingApproval + throw -> human resolves out-of-band -> re-run ship gate -> readApprovalOrFail returns resolved record -> assertNoBlockingApprovals passes -> ship evidence written"
  - "Manifest consumes validation: gsd-core validateConsumesGlobal enforces that every consumed artifact is produced by a host artifact or an earlier-or-same-point capability hook. Path-prefixed forms (e.g. .planning/phases/{NN}-*/CONTEXT.md) are NOT matched by bare host artifact names (CONTEXT.md) — use bare names for host artifacts."

requirements-completed: [AUDIT-06, APPR-01]

coverage:
  - id: D1
    description: "readApprovalOrFail: reads approval; if absent, writes pending approval (D-07) and throws 'pending approval created — human resolution required'"
    requirement: APPR-01
    verification:
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#ship gate creates a pending approval when none exists and throws (D-07)"
        status: pass
    human_judgment: false
  - id: D2
    description: "assertNoBlockingApprovals: pending OR rejected throws (D-08 fail-closed); approved OR waived proceeds"
    requirement: AUDIT-06
    verification:
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#ship gate blocks on pending approval (D-08) + blocks on rejected approval (D-08) + proceeds on approved + proceeds on waived"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-07 anti-auto-approve: writePendingApproval writes decidedBy/decidedAt ABSENT (undefined, not empty string)"
    requirement: APPR-01
    verification:
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#ship gate creates a pending approval when none exists and throws (D-07) — asserts 'decidedBy' in approval === false"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ship evidence record has NO approval fields (isolation — approval state in separate approvals/{NN}.json file)"
    requirement: AUDIT-06
    verification:
      - kind: unit
        ref: "src/governance/ship-gate-hook.test.ts#ship evidence record has NO approval fields after approval proceeds + existing ship-evidence-has-no-approval-fields test stays green"
        status: pass
    human_judgment: false
  - id: D5
    description: "Capability manifest verify:post audit step consumes CONTEXT.md (host artifact); ship:pre produces approvals/{NN}.json + consumes GOVERNANCE.md (D-13/D-16, extended existing capability, no new one)"
    requirement: AUDIT-06
    verification:
      - kind: unit
        ref: "src/governance/audit-hook-contract.test.ts#capability manifest declares one artifact-only audit verify:post step + capability manifest registers remaining governance gates additively"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-07
status: complete
---

# Phase 9 Plan 04: Ship-Gate Approval Blocking + Capability Manifest Summary

**Ship gate extended with approval blocking (D-07 pending-only writes, D-08 fail-closed on pending/rejected) via three new helpers in ship-gate-hook.ts, plus capability manifest extended (verify:post audit consumes CONTEXT.md; ship:pre produces approvals + consumes GOVERNANCE.md). Full Phase 9 audit+approval surface wired: approval store (01) + test evidence (02) + audit enrichment (03) + ship-gate blocking (04).**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-07T16:00:00Z
- **Completed:** 2026-07-07T16:25:00Z
- **Tasks:** 3 (TDD: RED -> GREEN -> REFACTOR-noop)
- **Files modified:** 6 (2 plan files + 1 manifest + 3 test fixtures)

## Accomplishments
- ship-gate-hook.ts: 3 new helpers (readApprovalOrFail, assertNoBlockingApprovals, writePendingApproval) cloned from readRequiredEvidence + assertNonBlocking fail-closed pattern (Phase 8)
- Approval checks inserted AFTER plan/verify assertNonBlocking, BEFORE ship evidence write — fail-closed ordering preserved
- D-07 anti-auto-approve: writePendingApproval OMITS decidedBy/decidedAt (undefined, not empty string) — 4 tests assert field absence
- D-08 fail-closed: pending/rejected throws, approved/waived proceeds — all 4 decision values tested
- Ship GateEvidence record UNCHANGED — no approval fields added; approval state lives in approvals/{NN}.json (separate file)
- capability.json: verify:post audit consumes CONTEXT.md (host artifact); ship:pre produces approvals/{NN}.json + consumes GOVERNANCE.md
- 6 new approval-blocking tests green; 3 consent/audit-hook-contract test fixtures updated for new produces/consumes arrays
- Full suite 364 tests, 0 fail, 0 regression

## Task Commits

Each task was committed atomically:

1. **Task 1: RED** — `7bceb5f` (test): 6 new approval-blocking tests in ship-gate-hook.test.ts (create-pending, block-pending, block-rejected, proceed-approved, proceed-waived, no-approval-fields-on-ship-evidence). 3 fail against unimplemented helpers (RED confirmed).
2. **Task 2: GREEN** — `3b96ba6` (feat): implement readApprovalOrFail + assertNoBlockingApprovals + writePendingApproval in ship-gate-hook.ts; extend capability.json manifest; update 3 consent/audit-hook-contract test fixtures for new produces/consumes. All 364 tests green.
3. **Task 3: REFACTOR** — no-op commit (full suite green; no duplication warrants extraction).

## Files Created/Modified
- `src/governance/ship-gate-hook.ts` — MODIFIED: +import readApproval/writeApproval/ApprovalRecord from approval-store.js; +writePendingApproval (D-07 pending-only, decidedBy/decidedAt ABSENT); +readApprovalOrFail (read or write-pending-then-throw); +assertNoBlockingApprovals (D-08 fail-closed); shipGateHook body extended with approval checks after plan/verify, before ship evidence write
- `src/governance/ship-gate-hook.test.ts` — MODIFIED: +import writeApproval/readApproval/ApprovalRecord/ApprovalDecision; +makeApproval fixture builder (pending OMITS decidedBy/decidedAt, others populate); +6 new approval-blocking tests; existing "ship evidence has no approval fields" test seeded with approved approval to reach the evidence write
- `.gsd/capabilities/aidlc-governance/capability.json` — MODIFIED: verify:post audit step consumes extended with CONTEXT.md (host artifact); ship:pre produces extended with approvals/{NN}.json; ship:pre consumes extended with GOVERNANCE.md
- `src/governance/audit-hook-contract.test.ts` — MODIFIED: audit verify:post step consumes assertion updated to [selection-state.json, CONTEXT.md]; ship:pre produces/consumes assertions updated for new arrays
- `src/governance/consent-verify-post.test.ts` — MODIFIED: auditHook.consumes assertion updated to [selection-state.json, CONTEXT.md]
- `src/governance/consent.test.ts` — MODIFIED: ship:pre assertGovernanceHook produces/consumes arrays updated

## Decisions Made
- **D-07 field absence over empty string:** writePendingApproval constructs ApprovalRecord with decidedBy/decidedAt OMITTED (not `""`). Tests assert `'decidedBy' in approval === false` — field absence, not empty-string presence. Empty strings would fail schema minLength:1 but field absence is the clean D-07 invariant (pending = no human decision yet).
- **D-08 fail-closed ordering:** Approval checks inserted AFTER plan/verify assertNonBlocking, BEFORE ship evidence construction + writeGateEvidence. A pending/rejected approval blocks the ship evidence write — no partial state lands on disk. Mirrors GATE-05 assertNonBlocking ordering exactly.
- **Approval state isolation:** Ship GateEvidence record stays minimal ({request, result, metadata}) — NO approval fields added. Approval state lives in approvals/{NN}.json (separate file). Existing test `assert.equal("approvals" in asRecord, false)` stays green.
- **D-13/D-16 manifest deviation:** Plan specified path-prefixed consumes entries (tests/{NN}.json, approvals/{NN}.json, REQUIREMENTS.md, VERIFICATION.md, .planning/phases/{NN}-*/CONTEXT.md, .planning/phases/{NN}-*/GOVERNANCE.md). gsd-core validateConsumesGlobal rejects consumes with no producer or wrong-point producer. Used bare host artifact names (CONTEXT.md, GOVERNANCE.md) which ARE valid. Approvals/{NN}.json declared at ship:pre produces (valid — produced at ship:pre, consumed by nothing in the manifest since verify:post cannot consume it due to point ordering). Audit skill reads the files directly regardless — consumes is advisory data-flow metadata, not a hard runtime dependency.
- **REFACTOR task = no-op:** Full suite green after GREEN; no duplication warrants extraction per PATTERNS anti-pattern guidance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing ship-evidence test regressed on missing approval**
- **Found during:** Task 2 (GREEN run)
- **Issue:** Existing test `shipGateHook writes ship evidence when plan and verify evidence pass or waive` (lines 181-186) seeds only plan/verify evidence, no approval. After adding approval checks, ship gate blocks on missing approval (correct new behavior), so the test fails — it exercises ship-evidence shape, not approval blocking.
- **Fix:** Seeded an approved approval (`writeApproval(root, "08", makeApproval("approved", root))`) before calling shipGateHook so the test reaches the evidence write. Single-line correction directly caused by the new approval check.
- **Files modified:** src/governance/ship-gate-hook.test.ts
- **Commit:** 3b96ba6 (part of Task 2 GREEN commit)

**2. [Rule 3 - Blocking] D-13/D-16 manifest consumes entries rejected by gsd-core validateConsumesGlobal**
- **Found during:** Task 2 (GREEN run — full suite)
- **Issue:** Plan specified path-prefixed consumes entries (`.planning/governance/tests/{NN}.json`, `.planning/governance/approvals/{NN}.json`, `.planning/REQUIREMENTS.md`, `.planning/phases/{NN}-*/VERIFICATION.md`, `.planning/phases/{NN}-*/CONTEXT.md`, `.planning/phases/{NN}-*/GOVERNANCE.md`). The gsd-core capability validator (`validateConsumesGlobal`) enforces that every consumed artifact is produced by a host artifact or an earlier-or-same-point capability hook. Path-prefixed forms are NOT matched by bare host artifact names (CONTEXT.md, PLAN.md, SUMMARY.md, UAT.md). tests/{NN}.json, REQUIREMENTS.md, VERIFICATION.md have NO producer anywhere. approvals/{NN}.json is produced at ship:pre which comes AFTER verify:post (order violation). The validator dropped the overlay entirely, causing 4 consent runtime tests to fail (render-hooks returned empty activeHooks because the capability was rejected).
- **Fix:** Used bare host artifact names (CONTEXT.md for verify:post audit consumes; GOVERNANCE.md for ship:pre consumes) which ARE valid — CONTEXT.md is a host artifact, GOVERNANCE.md is produced by the verify:post audit step at an earlier-or-same point. Kept approvals/{NN}.json in ship:pre produces (valid — no order constraint on produces). Dropped the invalid consumes entries (tests/{NN}.json, REQUIREMENTS.md, VERIFICATION.md, path-prefixed CONTEXT.md/GOVERNANCE.md). The audit skill reads these files directly regardless — consumes is advisory data-flow metadata, not a hard runtime dependency. The manifest declares the data-flow relationships that ARE valid; the skill's direct file reads are out-of-band from the manifest contract.
- **Files modified:** .gsd/capabilities/aidlc-governance/capability.json, src/governance/audit-hook-contract.test.ts, src/governance/consent-verify-post.test.ts, src/governance/consent.test.ts
- **Commit:** 3b96ba6 (part of Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Test-fixture correction + manifest consumes adjustment; no scope creep, no production-code deviation from the plan's intent (D-07/D-08 fully satisfied; D-13/D-16 manifest extended within validator constraints).

## Issues Encountered
The D-13/D-16 deviation required deep investigation of gsd-core's `validateConsumesGlobal` validator to understand why the manifest was being rejected. The validator's path-exact matching and producer-ordering constraints are not documented in the plan. Future plans extending the manifest should validate against `validateConsumesGlobal` before committing.

## User Setup Required
None — no external service configuration required. Human approval resolution happens out-of-band (human edits `.planning/governance/approvals/{NN}.json` to flip `decision` to `approved`/`rejected`/`waived` with `decidedBy`/`decidedAt` populated; ship gate re-run picks up the resolved record).

## Next Phase Readiness
- Phase 9 is fully wired: approval store (01) + test evidence (02) + audit enrichment (03) + ship-gate blocking (04).
- The approval lifecycle is complete: ship gate creates pending -> human resolves out-of-band -> ship gate re-runs and blocks until decision is approved/waived -> ship evidence written.
- Phase 10 (selection-quality harness) can proceed independently — it validates the whole governance overlay end-to-end.

## TDD Gate Compliance
- RED gate: `7bceb5f` (test commit) — 3 of 6 new tests fail against unimplemented readApprovalOrFail/assertNoBlockingApprovals/writePendingApproval. Confirmed RED.
- GREEN gate: `3b96ba6` (feat commit) — all 6 new tests pass; full suite 364 tests green.
- REFACTOR gate: no-op (full suite green; no duplication warrants extraction).

All three gates present in git log in the correct order (RED -> GREEN; REFACTOR no-op is documented, not committed).

## Self-Check: PASSED

- All 6 modified files exist on disk.
- Both task commits present in git log (`7bceb5f`, `3b96ba6`).
- SUMMARY.md exists at the canonical path.

---
*Phase: 09-complete-audit-record-approval*
*Completed: 2026-07-07*