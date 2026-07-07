---
phase: 01-rule-pack-format-index
fixed_at: 2026-07-05T12:25:52Z
review_path: .planning/phases/01-rule-pack-format-index/01-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-07-05T12:25:52Z
**Source review:** .planning/phases/01-rule-pack-format-index/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (Critical + Warning)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### CR-01: `readDirSafe` swallows all filesystem errors — silent rule loss and silent wrong-winner (fail-loud violation)

**Files modified:** `src/rules/load.ts`, `src/rules/load.test.ts`
**Commit:** 7b7924b
**Applied fix:** Narrowed the unqualified `catch` in `readDirSafe` so that only `ENOENT` (a genuinely-absent path) yields an empty listing. Every other `readdirSync` failure (EACCES, ENOTDIR, EIO, etc.) now re-throws as `"{dir}: cannot read rule directory: {message}"`, restoring the module's fail-loud contract and closing the silent wrong-winner / governance-bypass path. Added `src/rules/load.test.ts` with two tests exercising the behavior through `loadRules` (readDirSafe is not exported): one confirming the preserved ENOENT empty-listing case, one confirming a non-ENOENT error (ENOTDIR, forced by pointing the loader at a file) propagates with the descriptive message. Both cross-platform (node:os + node:path). Verified: full suite passes at 45 tests (43 prior + 2 new).

### WR-01: `toRepoRelativePosix` has a dead `rootDir` parameter and silently depends on `process.cwd()`

**Files modified:** `src/rules/load.ts`
**Commit:** 49bc630
**Applied fix:** Removed the dead `rootDir` parameter through the whole thread rather than just the leaf — `loadRules` no longer passes `absRoot`, `loadRuleFile(absPath)` drops its unused second param, and `toRepoRelativePosix(absPath)` takes a single argument. Documented that normalization is relative to `process.cwd()` (the repo root when `build-index` runs from there — Pitfall 5) and switched the separator handling to the tolerant `/[\\/]/` split so output is POSIX on Windows too, matching `deriveScope` in `scope.ts`. No test referenced `loadRuleFile`'s old two-arg signature, so no test changes were needed. Verified: full suite passes at 45 tests.

---

_Fixed: 2026-07-05T12:25:52Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
