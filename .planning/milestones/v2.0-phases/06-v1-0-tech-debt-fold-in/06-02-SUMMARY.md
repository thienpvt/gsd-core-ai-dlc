---
phase: 06-v1-0-tech-debt-fold-in
plan: 02
subsystem: governance-audit
tags: [tech-debt, validation, refactor, tdd]
requires:
  - 06-01-SUMMARY (atomic-write helper — audit-artifact.ts already refactored to delegate atomicWriteText)
provides:
  - "Hardened assertTimestamp (strict ISO 8601 regex) — malformed timestamps rejected at the persisted-state -> audit-record trust boundary"
  - "Unified selector_reason per-element validation in assertSelectionArrays — single error shape before normalizeSkipReason"
  - "Narrowed isDirectRun (path.resolve(invokedPath) === __filename) — same-basename sibling no longer triggers runDirect"
  - "Module-internal buildAuditRecord (export dropped) — no external callers per codegraph/grep audit"
  - "writeGovernanceAudit returns path.resolve(args.outputPath) absolute path — callers see the actual written path"
affects:
  - "src/governance/audit-artifact.ts — all five TDs land here"
  - "src/governance/audit-artifact.test.ts — TDD tests + tests moved off buildAuditRecord direct import"
tech-stack:
  added: []
  patterns:
    - "Strict ISO 8601 regex replaces Date.parse-only timestamp validation (deterministic, no silent acceptance of non-ISO shapes)"
    - "Per-element selector_reason validation at the persisted-field boundary; normalizeSkipReason mapping now total"
    - "Test-only auditFromRecord helper exercises buildAuditRecord via the public writeGovernanceAudit surface (de-export safe)"
key-files:
  created: []
  modified:
    - src/governance/audit-artifact.ts
    - src/governance/audit-artifact.test.ts
decisions:
  - "Drop the redundant assertOneOf inside normalizeSkipReason — assertSelectionArrays now owns per-element selector_reason validation upstream, so the internal check is dead code. Kept the mapping total (no fallback throw) since the upstream guard is total."
  - "Move buildAuditRecord-direct tests to writeGovernanceAudit end-to-end via an auditFromRecord test helper rather than a test-only re-export — the public surface is the real contract; a re-export would preserve the leaky abstraction TD-06 set out to close."
metrics:
  duration: 12
  completed: 2026-07-06
  tasks: 2
  files: 2
requirements-completed: [TD-01, TD-04, TD-05, TD-06, TD-07]
status: complete
---

# Phase 06 Plan 02: Audit-Artifact Hardening (TD-01/04/05/06/07) Summary

Tightened `assertTimestamp` to strict ISO 8601, unified `selector_reason` per-element validation, narrowed `isDirectRun` to the dist entry, de-exported `buildAuditRecord`, and returned the resolved absolute path from `writeGovernanceAudit`.

## What Was Built

### TD-01 — Strict ISO 8601 timestamp validation (TDD, correctness)
`assertTimestamp` replaced its `Date.parse`-only check (which silently accepted `"2026/07/06"`, `"2026-07-06"`, timezone-less variants) with a strict regex `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/`. The canonical form `YYYY-MM-DDTHH:mm:ss.sssZ` (the existing fixture shape) is the only accepted shape. JSDoc names the required form and cites TD-01. Malformed timestamps now reject at `assertGovernanceRecord` before they cross into the audit trail — preserves AUDIT-02's machine-checkable claim.

### TD-04 — Unified selector_reason validation shape (TDD, hygiene)
`assertSelectionArrays` now validates `skipped[i].reason` per-element against the `SkipReason` enum (`["out-of-phase","out-of-scope","out-of-scope-by-trigger","superseded"]`) with the field label `selector_reason`, producing one clear error: `selectionResult.skipped[i].selector_reason must be one of ...`. A garbage value fails here before `normalizeSkipReason` ever sees it. `normalizeSkipReason`'s redundant internal `assertOneOf` was dropped (upstream guard is total); the `out-of-scope → out-of-scope-by-trigger` mapping is now total. JSDoc documents the contract: `selector_reason` = raw persisted SkipReason (selector provenance), `reason` = normalized audit enum.

### TD-05 — Narrowed isDirectRun (refactor + regression)
`isDirectRun` replaced `path.basename(invokedPath) === "audit-artifact.js"` (matched any same-named file on the PATH) with `path.resolve(invokedPath) === __filename`. A sibling `audit-artifact.js` elsewhere no longer triggers `runDirect` on the dist entry. Verified at runtime: loading the dist module with `argv[1]` pointing at a same-basename sibling does NOT fire `runDirect`.

### TD-06 — De-exported buildAuditRecord (refactor + regression)
`export` keyword dropped from `buildAuditRecord`. Codegraph/grep audit confirmed zero external callers — only `audit-artifact.test.ts` imported it directly. The 5 direct-call test sites moved to a test-only `auditFromRecord` helper that writes state and invokes `writeGovernanceAudit` end-to-end, reading the `audit` field off the return. The public surface is now the only contract tested.

### TD-07 — Resolved absolute path return (refactor + regression)
`writeGovernanceAudit` now returns `{ outputPath: path.resolve(args.outputPath), audit }` — the resolved absolute path actually written, not the raw input. Runtime probe confirmed: return is `C:\Users\...\GOVERNANCE.md` (absolute, Windows-normalized), equal to `path.resolve(input)`, explicitly NOT equal to the raw forward-slashed input. Test asserts `path.isAbsolute` + equality with `path.resolve(outputPath)`.

## Verification

- `npm test`: 193 tests, 191 pass, 0 fail, 2 skipped (pre-existing) — all 6 new TD-01 cases + TD-04 unified-shape test + TD-07 resolved-path assertion green
- `npm run build`: clean (tsc -p tsconfig.build.json)
- Runtime probes via the compiled `dist/governance/audit-artifact.js` runner:
  - Happy path: valid state → GOVERNANCE.md written, exit 0, canonical timestamp + both `reason`/`selector_reason` fields present
  - TD-01: all 5 non-ISO shapes (`2026/07/06`, `2026-07-06`, `2026-07-06T00:00:00Z`, `2026-07-06T00:00:00.000`, `not-a-date`) rejected with ISO 8601 message, exit 1, no file written; canonical `2026-07-06T00:00:00.000Z` accepted
  - TD-04: garbage `selector_reason` rejected with unified per-element message, exit 1, no file written
  - TD-05: sibling `audit-artifact.js` at non-dist path does NOT fire `runDirect`
  - TD-07: return is absolute, equals `path.resolve(input)`, not the raw input

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Existing test expected the old fragmented selector_reason error shape**
- Found during: Task 1 GREEN phase
- Issue: The existing `buildAuditRecord throws on a skipped rule reason outside the audit enum` test asserted `/invalid audit skip reason/i` — the old `normalizeSkipReason` error. With TD-04, validation moved upstream to `assertSelectionArrays` which throws first with the unified `selector_reason must be one of` message. The old test's assertion no longer matched the new (correct) behavior.
- Fix: Updated the existing test to assert the new unified `/selector_reason must be one of/i` message. This is the TD-04 unification itself — the old test was pinning the fragmented shape TD-04 set out to replace.
- Files modified: src/governance/audit-artifact.test.ts
- Commit: 259e2fe

**2. [Rule 1 - Dead code] normalizeSkipReason's internal assertOneOf became dead defense**
- Found during: Task 1 GREEN phase
- Issue: With `assertSelectionArrays` now validating `selector_reason` per-element upstream, `normalizeSkipReason`'s own `assertOneOf` + throw was dead code — it could never fire because `buildAuditRecord` calls `assertGovernanceRecord` (which calls `assertSelectionArrays`) before `normalizeSkipReason` runs.
- Fix: Dropped the redundant assert + throw; `normalizeSkipReason` is now a pure total mapping (`out-of-scope → out-of-scope-by-trigger`, else identity). JSDoc notes the upstream validation contract.
- Files modified: src/governance/audit-artifact.ts
- Commit: 259e2fe

None of the deviations required architectural changes or user input.

## Known Stubs

None — all five TDs are fully implemented; no placeholder/TODO/stub patterns remain in the touched code.

## Threat Flags

None — the changes narrow the existing trust boundary (persisted-state → audit-record) and the direct-runner invocation surface, exactly as the plan's threat model specified (T-06-03, T-06-04, T-06-05, T-06-06 all mitigated). No new security surface introduced.

## TDD Gate Compliance

- RED gate: `test(06-02): add failing tests for ISO timestamp + unified selector_reason` (9fb7cf9) — two tests failed before implementation, confirming the behavior did not pre-exist.
- GREEN gate: `feat(06-02): tighten assertTimestamp to ISO 8601, unify selector_reason validation` (259e2fe) — all tests pass after implementation.
- No REFACTOR commit needed — the single ISO regex check is already minimal; no redundant `Date.parse` call to remove.

## Self-Check: PASSED

- `src/governance/audit-artifact.ts` exists: FOUND
- `src/governance/audit-artifact.test.ts` exists: FOUND
- Commit 9fb7cf9 (RED): FOUND
- Commit 259e2fe (GREEN): FOUND
- Commit ffc9da8 (Task 2 refactors): FOUND
- `grep -c "^export function buildAuditRecord" src/governance/audit-artifact.ts` = 0: CONFIRMED (de-exported)
- `grep -E "outputPath: path\.resolve" src/governance/audit-artifact.ts` matches: CONFIRMED
- `grep -c "Date.parse" src/governance/audit-artifact.ts` = 0 actual calls (2 comment references only): CONFIRMED
- `npm test` exits 0: CONFIRMED (193 tests, 0 fail)
- `npm run build` exits 0: CONFIRMED