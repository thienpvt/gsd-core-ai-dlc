---
phase: 03-summary-injection-lazy-detail-loading
fixed_at: 2026-07-06T02:35:00Z
review_path: .planning/phases/03-summary-injection-lazy-detail-loading/03-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-07-06T02:35:00Z
**Source review:** .planning/phases/03-summary-injection-lazy-detail-loading/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (Critical + Warning; the 4 Info findings IN-01..IN-04 are out of scope, not skipped)
- Fixed: 3
- Skipped: 0

**Verification:** Full suite via `npm test` (pretest runs `tsc` on both configs, so all changes are type-checked). Result: 107 tests, 105 pass, 0 fail, 2 skipped. Baseline was 104 all-passing; the +3 net comes from the 3 new CR-01 tests (1 non-symlink regression passes; the 2 symlink-creation tests skip gracefully on this Windows host without symlink privilege — an accepted, designed skip, never a failure).

## Fixed Issues

### CR-01: Traversal guard is textual-only — a symlink in the pack bypasses IN-05 (arbitrary file read)

**Files modified:** `src/rules/detail-path.ts`, `src/rules/detail-path.test.ts`, `src/index/build-guards.test.ts`
**Commit:** af847ae
**Applied fix:** The IN-05 containment check used `path.resolve`/`path.relative` (string math only) and did not follow symlinks, while the callers' `existsSync` (build/D-07) and `readFileSync` (fetch) both do — so a symlink planted inside a portable pack (`details/leak.md` -> `/etc/passwd`) passed the textual check and yielded arbitrary file read at both build and fetch time, reopening the exact hole IN-05 exists to close.

Chose the report's `realpathSync` canonicalization approach (handles both the symlinked-file and symlinked-parent-dir cases). Extracted the containment predicate into a single `escapesRoot(rel)` helper so the lexical check and the new realpath check apply identical logic (Pitfall 8, no drift), and added a `canonicalize(p)` helper that `realpathSync`-resolves a path and falls back to the lexical path via try/catch when the target does not exist yet (fetch-time missing file, or a not-yet-created root). After the existing lexical checks (kept as the first line of defense), the guard now re-runs `escapesRoot` on the realpath-canonicalized target vs the canonicalized `packRoot` and throws a loud symlink-naming IN-05 error on an on-disk escape. `realpathSync` reads only link metadata, never file contents, so the D-05 no-body guarantee is untouched.

Added a symlink negative fixture + test to BOTH `detail-path.test.ts` (unit) and `build-guards.test.ts` (build integration). Because a committed symlink does not survive a cross-platform checkout, each test constructs the pack/store on disk in an `os.tmpdir()` temp dir at run time, plants a symlink pointing outside the root, and asserts the guard throws with a message naming the symlink. Both guard `fs.symlinkSync` in try/catch and call `t.skip(...)` on `EPERM`/`EACCES` (Windows without symlink privilege) so the suite stays green cross-platform while still exercising the guard where symlinks are permitted. Also added a non-symlink regression test proving a genuine relative in-pack detail file still resolves after the canonicalization change (the existing committed `detailpath-store` fixture and its smoke test also continue to pass).

**Note:** This is a security fix; the containment logic is semantic. The new tests assert the guard rejects the symlink escape and still accepts the valid case, but on this Windows host the two symlink-creation tests SKIP (no privilege), so the reject path is proven by construction/logic here rather than executed. Recommend a human or CI run on a POSIX host (or privileged Windows) to see the reject assertions execute.

### WR-01: `inject` shape guard validates only array-ness, so malformed rules render literal "undefined"

**Files modified:** `src/cli/commands/inject.ts`
**Commit:** 53d09c7
**Applied fix:** After the existing `selected[]`/`skipped[]` array guard, added a per-element loop over `selected` that validates each rule is a non-null object with a string `id`, a string `summary`, and a `severity` present in `SEVERITY_ORDINAL` (imported from the inject core alongside the existing `renderInjection` import; added the `SelectedRule` type import). A malformed element (e.g. `{"selected":[{"id":"x"}],"skipped":[]}`) now throws a loud "malformed inject input" error naming the required fields instead of rendering `[undefined] x: undefined` into the `<governance>` context. `skipped[]` is audit-only (Phase 5) and not rendered at this seam, so it needs no per-element check; the normal `select | inject` pipeline is unaffected since `select()` always populates the fields. `renderInjection` stays body-read-free and deterministic — no change to the core.

### WR-02: `process.exit(2)` in the dispatcher default branch contradicts the CR-02 discipline

**Files modified:** `src/cli/index.ts`
**Commit:** 37dbb79
**Applied fix:** Replaced `process.exit(2)` in the unknown-command default branch with `process.exitCode = 2; return;` (per the report), so the two buffered `process.stderr.write` usage-text calls can drain on a Windows pipe instead of being truncated by a synchronous `process.exit`. This aligns the last remaining branch with the `process.exitCode` discipline every other Phase 2/3 command already follows (CR-02). Added a comment explaining the rationale. No test asserted the old exit-2 truncation behavior, so nothing needed updating.

---

_Fixed: 2026-07-06T02:35:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
