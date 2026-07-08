---
phase: 09-complete-audit-record-approval
fixed_at: 2026-07-08T00:00:00.000Z
review_path: .planning/phases/09-complete-audit-record-approval/09-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 09: Code Review Fix Report

**Fixed at:** 2026-07-08T00:00:00.000Z
**Source review:** .planning/phases/09-complete-audit-record-approval/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Audit enrichment helpers are dead code — never wired into production audit writer

**Files modified:** `src/governance/audit-artifact.ts`, `src/governance/audit-artifact.test.ts`
**Commit:** 698c83b
**Applied fix:** Wired enrichment into `writeGovernanceAudit` via a new `buildEnrichmentFromPersistedState` helper that derives `phaseNumber` from the validated output path and reads persisted state:
- AUDIT-03 `requirements_covered` from global `.planning/REQUIREMENTS.md` Traceability table via `extractRequirementsCovered`.
- AUDIT-04 `tests_executed` from persisted test-evidence store (`.planning/governance/tests/{NN}.json`) via `readTestEvidence`.
- AUDIT-05 `remaining_risks` from phase-dir `VERIFICATION.md` + `CONTEXT.md` (or `{NN}-CONTEXT.md`) via `collectRemainingRisks`, populated only when at least one source file exists.
- AUDIT-06 `approvals` from persisted approval store (`.planning/governance/approvals/{NN}.json`) via `readApproval` + `summarizeApprovals`.

The optional fields are spread conditionally by `buildAuditRecord` (unchanged) so v1 byte-stability holds: when no enrichment inputs exist, the returned object is `{}` and every v2 field stays ABSENT (not present-and-empty), producing byte-identical v1 output. Six new tests cover: byte-stability with no inputs, each field populating in isolation, and a full end-to-end run with all sources present (schema-validated).

**Deferral note:** The capability manifest `consumes` array for the audit `verify:post` step was NOT extended. Attempting to add `tests/{NN}.json`, `approvals/{NN}.json`, `REQUIREMENTS.md`, `VERIFICATION.md` to `consumes` broke 4 consent integration tests (`consent-verify-post.test.ts`) and the `audit-hook-contract.test.ts` consumes assertion: the installed gsd-core runtime's consent/bundle-content-hash machinery treats a manifest `consumes` change as a content-hash change, deactivating the capability at `render-hooks`. That is an installed-runtime concern outside this repo's control (the runtime is copied from `~/.codex/gsd-core` in the tests). The load-bearing WR-01 fix is the code wiring in `audit-artifact.ts`; the `consumes` metadata is documentation. Documenting the deferred manifest update here so a future phase can revisit after coordinating with the installed runtime's consent hash expectations.

### WR-02: TOCTOU race in readApprovalOrFail — concurrent human approval overwritten by pending

**Files modified:** `src/governance/ship-gate-hook.ts`, `src/governance/ship-gate-hook.test.ts`
**Commit:** 7697e31
**Applied fix:** Replaced the read-null → write-pending sequence with a create-if-absent primitive using `openSync(O_WRONLY | O_CREAT | O_EXCL)`. The OS atomically rejects the open with `EEXIST` if the file already exists, closing the TOCTOU window: a human approval written between the read-null and the create is preserved, not clobbered. `readApprovalOrFail` now: read; if null, attempt `createPendingApprovalIfAbsent`; if that returns false (EEXIST — a human or concurrent run landed first), re-read to pick up whatever landed (validated by `readApproval`); fail closed on a vanished-file edge case. Preserves D-07/D-08 semantics. Two regression tests: human-approved record byte-identical after ship-gate run; existing pending `requestedAt` preserved on re-run.

### WR-03: Approval store lacks cross-phase identity guard that the sibling test-evidence store enforces

**Files modified:** `src/governance/approval-store.ts`, `src/governance/approval-store.test.ts`
**Commit:** baeaeb1
**Applied fix:** `assertApproval` now cross-checks the phase number embedded in `approvalId` against the path's `phaseNumber`. A record at `approvals/09.json` with `approvalId: "ship-08"` fails loud with `approvalId 'ship-08' must end with -09`. Mirrors the sibling `assertTestEvidence` metadata-phase check. Two new tests: read of a tampered cross-phase record throws; write of a cross-phase record throws.

### WR-04: D-07 anti-auto-approve check accepts whitespace-only decidedBy

**Files modified:** `src/enforcement/validate-approval.ts`, `src/enforcement/validate-approval.test.ts`
**Commit:** 7439f5b
**Applied fix:** Changed the emptiness check from `record.decidedBy.length === 0` to `record.decidedBy.trim().length === 0` so a whitespace-only `decidedBy` (e.g. `" "`) is rejected. Preserves the ABSENT-not-empty-string invariant: pending approvals legitimately omit `decidedBy` (the check only fires when `decision !== "pending"`). One new test: whitespace-only `decidedBy` throws.

---

_Fixed: 2026-07-08T00:00:00.000Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_