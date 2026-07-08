---
phase: 06-v1-0-tech-debt-fold-in
fixed_at: 2026-07-06T00:00:00Z
review_path: .planning/phases/06-v1-0-tech-debt-fold-in/06-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-07-06T00:00:00Z
**Source review:** .planning/phases/06-v1-0-tech-debt-fold-in/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (Warnings only; fix_scope = critical_warning)
- Fixed: 3
- Skipped: 0

**Scope:** Critical (0) + Warning (3). Info findings (4) excluded per fix_scope.

**Verification:** Each fix passed Tier 1 (re-read) + Tier 2 (`tsc -p tsconfig.json` clean). Full test suite: 193 tests, 190 pass, 1 pre-existing failure (`audit-hook-contract.test.js:72` — unrelated to fixed files, present at baseline before any fix), 2 skipped. TD-02 consent suite (4 tests) all pass.

## Fixed Issues

### WR-01: Dead test helper `auditFromUnsafeRecord` — defined, never called

**Files modified:** `src/governance/audit-artifact.test.ts`
**Commit:** b1732f6
**Applied fix:** Removed dead `auditFromUnsafeRecord` helper (lines 137-143) left from TD-06 refactor. Grep confirmed zero callers — malformed-payload tests (lines 280, 388) use `writeUnsafeState` + direct `writeGovernanceAudit` inline pattern. `writeUnsafeState` still used elsewhere so no orphaned import.

### WR-02: `grantConsent` fallback passes empty `integrity`/`disclosureSignature` to real `recordProjectConsent`

**Files modified:** `src/governance/consent-verify-post.test.ts`
**Commit:** 56b753c
**Applied fix:** Per review option (a) + `ponytail:` convention: dropped silent `gsd capability install` spawn attempt (install lifecycle not the contract under test in shimmed runtime), always record consent directly via `consent.recordProjectConsent`. Added `ponytail:` comment naming the binding (`contentHash`) and the ceiling (future gsd-core release tightening `recordProjectConsent` to require non-empty `disclosureSignature` per its docstring). Deletion-over-addition: removed 9 lines of install-attempt scaffolding, added 8 lines of documenting comment. `spawnGsd` import retained (still used by `runGsd` line 169).

### WR-03: Pre-consent test's `finally` references `consent` var never assigned; revoke branch dead

**Files modified:** `src/governance/consent-verify-post.test.ts`
**Commit:** 0c6a0d3
**Applied fix:** Removed dead revoke scaffolding from pre-consent test: `let consent: ConsentModule | undefined;` declaration (never assigned in this test body), `let projectRoot = "";` (moved to `const` inside try since no finally reference needed), and the `if (consent && projectRoot) { ... revokeProjectConsent ... }` finally branch (always-skipped since `consent` always `undefined`). Test now only does `rmSync` cleanup in finally — matches actual test behavior. `ConsentModule` type retained (used by post-consent, revoke, tamper tests at lines 325, 361, 388).

---

_Fixed: 2026-07-06T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_