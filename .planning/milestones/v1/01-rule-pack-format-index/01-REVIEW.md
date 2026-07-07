---
phase: 01-rule-pack-format-index
reviewed: 2026-07-05T12:47:04Z
depth: deep
iteration: 2
files_reviewed: 13
files_reviewed_list:
  - bin/governance.cjs
  - src/index.ts
  - src/types.ts
  - src/cli/index.ts
  - src/cli/commands/build-index.ts
  - src/rules/load.ts
  - src/rules/load.test.ts
  - src/rules/scope.ts
  - src/index/build.ts
  - src/index/validate-index.ts
  - src/schema/validate.ts
  - src/schema/frontmatter.schema.json
  - src/schema/rule-index.schema.json
findings:
  critical: 0
  warning: 0
  info: 6
  total: 6
status: clean
---

# Phase 01: Code Review Report (Re-review, iteration 2)

**Reviewed:** 2026-07-05T12:47:04Z
**Depth:** deep
**Files Reviewed:** 13
**Status:** clean

## Summary

This re-review confirms the two prior findings (CR-01, WR-01) are correctly fixed, verifies the multi-site WR-01 signature change introduced no new correctness regression, and re-traces the full load -> validate -> scope -> build-index -> validate-index pipeline to confirm the PACK-04 no-body guarantee still holds. A fresh `npm test` (which rebuilds both `dist` and `dist-test` via the `pretest` hook) passes at 45 tests, and the compiled `dist/rules/load.js` matches the single-arg source.

**CR-01 (fixed, verified).** `readDirSafe` (src/rules/load.ts:15-28) now narrows its catch: only `ENOENT` yields an empty listing; every other `readdirSync` error re-throws as `"{dir}: cannot read rule directory: {message}"`. This restores the module's fail-loud contract and closes the silent-wrong-winner path. The recursive `ENOENT`-as-empty for a subtree is safe — it is only reachable via a TOCTOU delete-after-listing race, where treating the vanished subdir as empty is the correct behavior. `src/rules/load.test.ts` pins both halves through the public `loadRules` seam (readDirSafe is not exported): the preserved `ENOENT` empty case, and a non-`ENOENT` (`ENOTDIR`, forced by pointing the loader at a file) propagation asserting both `/cannot read rule directory/` and the path. Both tests pass on this Windows host, empirically confirming `readdirSync` on a file yields a non-`ENOENT` code here (the fix is not silently platform-dependent).

**WR-01 (fixed, verified — no regression).** The dead `rootDir` parameter was removed across the whole call thread, not just the leaf. I enumerated every call site in the repo (source, tests, `scripts/`, `bin/`, and compiled `dist`): the only callers are `loadRules` -> `loadRuleFile(abs)` (load.ts:89, one arg) and `loadRuleFile` -> `toRepoRelativePosix(absPath)` (load.ts:76, one arg). No stale two-arg caller exists anywhere. `loadRuleFile` is a public re-export (src/index.ts:10), but its dropped second parameter was never functional, so the surface change is inert for external consumers. `sourceFile` remains correct: `path.relative(process.cwd(), absPath)` over the absolute paths `findRuleFiles`/`loadRules` build, and `precedence.test.ts` + `build-guards.test.ts` assert the emitted value is POSIX, non-absolute, non-drive-rooted, backslash-free, and correctly prefixed — all green. The `path.sep` -> `/[\\/]/` split is strictly more tolerant and now matches `deriveScope` (scope.ts:52). The cwd basis is unchanged from before the fix (the removed arg was ignored) and is now documented (Pitfall 5), so nothing regressed. Because `strict: true` in tsconfig.build.json compiles `src/**/*.ts`, any surviving arity mismatch would have failed the build — it did not.

**PACK-04 (still holds).** Re-traced end to end: `matter(raw)` destructures only `data`, so gray-matter's `content` is never captured; `ParsedRule`/`RuleIndexRecord` carry no body field; `toRecord` (build.ts:28-48) assembles via an explicit whitelist and never spreads the frontmatter; and `validateIndex` enforces `additionalProperties:false` on both `ruleRecord` and `supersededRecord`. The fast-check no-body property (30 runs) plus the fixture/smoke body-canary checks pass. The WR-01 change touches only path-string formatting and cannot introduce a body into any record.

No Critical or Warning findings remain. The five Info items from iteration 1 persist (deliberately deferred to Phase 2/3 per the review scope note) and are re-listed below as tracking. One additional latent Info observation (IN-06) is recorded. None are blocking.

## Info

### IN-01: No compile-time link between JSON schemas and TS interfaces (persists — deferred)

**File:** `src/rules/load.ts:75`, `src/types.ts:57-104`
**Issue:** `data as unknown as Frontmatter` trusts `frontmatter.schema.json` and the `Frontmatter` interface to stay in lock-step; likewise `RuleIndex` vs `rule-index.schema.json`. Nothing fails at compile time on divergence. Carried over from iteration 1; unchanged by the fixes.
**Fix:** Deferred — add a required-key parity test or a generated-types step (`json-schema-to-typescript`) in a later phase.

### IN-02: Output schema validates `triggers`/`phases` only structurally (persists — deferred)

**File:** `src/schema/rule-index.schema.json:52-59`
**Issue:** The output schema asserts `triggers` is an object and `phases` an array, delegating internal validation to the frontmatter schema. Not exploitable in the current pipeline (input is always validated first by `loadRules`). Carried over from iteration 1.
**Fix:** Deferred — document the intentional trust, or mirror the `$defs` for a fully self-contained output guard.

### IN-03: `details/` skip is case-sensitive (persists — deferred)

**File:** `src/rules/load.ts:37`
**Issue:** `if (entry.name === "details") continue;` matches only the exact lowercase name; a `Details/` dir on a case-insensitive filesystem (Windows, default macOS) would not be skipped and its `.md` files would be treated as rules. No body-leak risk (the whitelist still applies). Carried over from iteration 1.
**Fix:** Deferred — `entry.name.toLowerCase() === "details"`.

### IN-04: No `maxLength` on `summary` (persists — deferred)

**File:** `src/schema/frontmatter.schema.json:63-67`
**Issue:** `summary` is the only prose the index carries and the crux of the anti-bloat constraint, yet is unbounded — an author could paste a full body into `summary` and pass every guard. Explicitly deferred (SEL-05, Phase 2). Carried over from iteration 1.
**Fix:** Deferred to Phase 2 per SEL-05.

### IN-05: `detailPath` accepted with no traversal/absolute-path constraint (persists — deferred)

**File:** `src/schema/frontmatter.schema.json:73-77`
**Issue:** `detailPath` requires only `minLength: 1`; `../../etc/passwd` or an absolute path validates and is carried verbatim (confirmed by `build-guards.test.ts`). Phase 1 never resolves it (D-07/D-08 deferred to Phase 3), so there is no current traversal vuln. Carried over from iteration 1.
**Fix:** Deferred — Phase 3's resolver MUST reject absolute paths and enforce repo-root containment before opening the target.

### IN-06: `findRuleFiles` silently skips symlinked entries — same silent-loss class CR-01 just closed (new, latent)

**File:** `src/rules/load.ts:31-44`
**Issue:** `findRuleFiles` branches only on `entry.isDirectory()` and `entry.isFile()`. With `withFileTypes: true`, a `Dirent` for a symlink reports `isSymbolicLink() === true` while both `isDirectory()` and `isFile()` return `false`, so a symlinked `.md` rule (or a symlinked tier directory) is silently dropped from the corpus with no diagnostic — the same silent-rule-loss / potential wrong-winner class the CR-01 fix just closed for unreadable directories. This is pre-existing (not introduced by either fix) and low-likelihood (a governance store is normally plain files in git), which is why it is Info and not Warning. Flagging it because the module now carries an explicit fail-loud contract (per the CR-01 comment: "silently dropping rules can flip a precedence winner, i.e. a governance bypass"), and this path still degrades the corpus silently.
**Fix:** Decide the symlink policy explicitly rather than skipping silently — either resolve deliberately with guards against loops and store-escape (containment check on the real path before recursing/collecting), or fail/warn loudly when a symlink is encountered in the store so the loss is never silent. Following symlinks introduces its own traversal and loop concerns, so treat this as a tracked design decision, not a mechanical patch.

---

_Reviewed: 2026-07-05T12:47:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
