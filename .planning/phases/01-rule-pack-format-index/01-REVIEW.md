---
phase: 01-rule-pack-format-index
reviewed: 2026-07-05T12:01:36Z
depth: deep
files_reviewed: 20
files_reviewed_list:
  - bin/governance.cjs
  - src/index.ts
  - src/types.ts
  - src/cli/index.ts
  - src/cli/commands/build-index.ts
  - src/cli/cli.smoke.test.ts
  - src/rules/load.ts
  - src/rules/scope.ts
  - src/rules/scope.test.ts
  - src/index/build.ts
  - src/index/validate-index.ts
  - src/index/validate-index.test.ts
  - src/index/no-body.property.test.ts
  - src/index/build-guards.test.ts
  - src/index/precedence.test.ts
  - src/schema/validate.ts
  - src/schema/frontmatter.schema.json
  - src/schema/rule-index.schema.json
  - src/schema/frontmatter.test.ts
  - src/schema/classification.test.ts
findings:
  critical: 1
  warning: 1
  info: 5
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-05T12:01:36Z
**Depth:** deep
**Files Reviewed:** 20
**Status:** issues_found

## Summary

This is carefully-built, test-first code. The core PACK-04 no-body guarantee is implemented with three independent layers — the loader discards gray-matter's `content` (never places it on `ParsedRule`), `toRecord` assembles records via an explicit field whitelist, and `validateIndex` enforces `additionalProperties: false` on the output schema. I traced every path from `matter(raw)` to `JSON.stringify(index)` and found no way for a body to reach the index; even a frontmatter key literally named `content`/`body` is rejected by the frontmatter schema's `additionalProperties: false` and never copied by the whitelist. Precedence resolution (project > domain > enterprise) is correct, deterministic, and correctly ordered relative to the scope-vs-directory check in `buildIndex`.

The one serious defect is in the rule loader: `readDirSafe` swallows every `readdirSync` error and returns an empty list. The intended behavior (a missing root yields an empty index) is correct, but the catch is far too broad — a permission or I/O error on a subtree silently drops rules, and in the cross-tier override case it can silently promote a weaker inherited rule to winner. That is precisely the "wrong winner = governance bypass" failure this phase exists to prevent, and it fails silently in a codebase that is otherwise meticulously fail-loud. The remaining items are a misleading/dead function parameter and forward-looking hardening notes.

## Critical Issues

### CR-01: `readDirSafe` swallows all filesystem errors — silent rule loss and silent wrong-winner (fail-loud violation)

**File:** `src/rules/load.ts:15-22`
**Issue:**

```typescript
function readDirSafe(dir: string) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    // A missing root yields no rules rather than crashing the build.
    return [];
  }
}
```

The `catch` block is unqualified — it converts *every* `readdirSync` failure (EACCES permission denied, ENOTDIR, EIO, EMFILE, etc.) into a silent empty directory, not just the intended "root does not exist" (ENOENT) case. `findRuleFiles` calls this recursively, so the failure applies to any subtree. Consequences:

1. **Silent incompleteness.** If `aidlc-rules/project/` is unreadable (restrictive umask, Docker layer perms, Windows ACL, mounted volume), every project-tier rule silently vanishes from the index. `build-index` still prints success and exits 0.
2. **Silent wrong-winner (governance bypass).** If a project-tier override of an id (say `input-validation`) lives in an unreadable `project/` subtree while the enterprise/domain copies are readable, `resolvePrecedence` never observes the project rule. The winner silently becomes the *weaker* domain or enterprise rule — the stricter, higher-authority governance rule is dropped with zero diagnostic output. This is the exact failure mode this phase must prevent.
3. **Inconsistent with the rest of the module.** `loadRuleFile`, `assertScopeMatchesDirectory`, `resolvePrecedence`, and `validateIndex` all throw loudly. This one path silently degrades the corpus.

**Fix:** Treat only "path does not exist" as the empty case; surface everything else.

```typescript
function readDirSafe(dir: string) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    // Only a genuinely-absent path yields an empty listing. A directory that
    // exists but cannot be read (permissions, I/O) must fail loud — silently
    // dropping rules can flip a precedence winner (governance bypass).
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error(
      `${dir}: cannot read rule directory: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
```

## Warnings

### WR-01: `toRepoRelativePosix` has a dead `rootDir` parameter and silently depends on `process.cwd()`

**File:** `src/rules/load.ts:41-45`
**Issue:**

```typescript
function toRepoRelativePosix(rootDir: string, absPath: string): string {
  const repoRoot = process.cwd();
  const rel = path.relative(repoRoot, absPath);
  return rel.split(path.sep).join("/");
}
```

Three problems in one small function:
- **`rootDir` is never used.** The signature and its call site (`toRepoRelativePosix(rootDir, absPath)` at line 67) imply the path is normalized relative to the rule root, but the body ignores it and uses `process.cwd()`. A future maintainer reading the call site will draw the wrong conclusion.
- **Undocumented cwd coupling.** `sourceFile` is only correct when the process cwd equals the repo root. Running `build-index` from a subdirectory (e.g. `--root ../aidlc-rules` from `src/`) produces `../`-prefixed pointers that are not repo-relative, contradicting the `ParsedRule.sourceFile` doc ("repo-root-relative POSIX path"). Tests pass only because `node --test` runs from the repo root.
- **Separator handling diverges from `scope.ts`.** This splits on `path.sep` only, while `deriveScope` (scope.ts:52) splits on `/[\\/]/`. Using the same tolerant split here would be more robust and consistent.

**Fix:** Either remove the unused parameter and rename to reflect the cwd basis, or actually use it. If cwd is the intended basis, make it explicit and use the tolerant split:

```typescript
function toRepoRelativePosix(absPath: string): string {
  const rel = path.relative(process.cwd(), absPath);
  return rel.split(/[\\/]/).join("/");
}
```

Update the call site at line 67 accordingly.

## Info

### IN-01: No compile-time link between the JSON schemas and the TS interfaces (drift risk)

**File:** `src/rules/load.ts:66`, `src/types.ts:57-104`
**Issue:** `frontmatter: data as unknown as Frontmatter` trusts that `frontmatter.schema.json` and the `Frontmatter` interface stay in lock-step; likewise `RuleIndex` vs `rule-index.schema.json`. Nothing fails at compile time if one gains a field the other lacks. Standard Ajv practice, but in a governance tool a silent divergence (e.g. a new frontmatter field validated but not typed, or typed but not carried by `toRecord`) would be easy to miss.
**Fix:** Add a small type-level assertion or a generated-types step (e.g. `json-schema-to-typescript`) tying the schema to the interface, or a unit test that asserts the required-key sets match.

### IN-02: Output schema validates `triggers`/`phases` only structurally, delegating internals to the input schema

**File:** `src/schema/rule-index.schema.json:52-59`
**Issue:** The output schema asserts `triggers` is an object and `phases` is an array, but defers all internal validation to the frontmatter schema. The `additionalProperties: false` no-body guard is genuinely independent (good), but the "second independent guard" framing in `validate-index.ts` is weaker than it reads for trigger/phase *content*: if `buildIndex` were ever refactored to assemble records from a source that skipped `loadRules`' frontmatter validation, malformed triggers/phases would pass `validateIndex`. Not exploitable in the current pipeline (input is always validated first).
**Fix:** Either document that the output schema intentionally trusts input validation for these sub-objects, or mirror the `$defs` for triggers so the output guard is fully self-contained.

### IN-03: `details/` skip is case-sensitive

**File:** `src/rules/load.ts:31`
**Issue:** `if (entry.name === "details") continue;` matches only the exact lowercase name. On case-insensitive filesystems (Windows, default macOS) a `Details/` directory would not be skipped, so its `.md` files are treated as rules. No body-leak risk (the whitelist still applies), but it would either wrongly index a detail file that happens to carry valid frontmatter, or fail the build when a detail file lacks frontmatter.
**Fix:** `if (entry.name.toLowerCase() === "details") continue;`

### IN-04: No `maxLength` on `summary` — oversized summaries can undercut the anti-bloat goal

**File:** `src/schema/frontmatter.schema.json:63-67`
**Issue:** `summary` is the only prose the index carries and is the crux of the "summaries-only" context-budget constraint, yet it is unbounded. An author could paste a full rule body into `summary` and defeat the anti-context-bloat premise while passing every guard. The omission is deliberately deferred (SEL-05, Phase 2), but it is the defining constraint of the project.
**Fix:** Consider even a generous `maxLength` now, or track it explicitly so Phase 2 does not ship without it.

### IN-05: `detailPath` accepted with no traversal/absolute-path constraint

**File:** `src/schema/frontmatter.schema.json:73-77`
**Issue:** `detailPath` requires only `minLength: 1`, so `../../etc/passwd` or an absolute path validates and is carried verbatim into the index (confirmed by `build-guards.test.ts`). Phase 1 never resolves it (D-07/D-08 deferred to Phase 3), so there is no *current* traversal vulnerability — but the unconstrained string is the seed of one.
**Fix:** No change required in Phase 1; flag prominently that Phase 3's resolver MUST reject absolute paths and enforce repo-root containment before opening the target. A schema-level guard against leading `/`, drive letters, and `..` segments could be added now as defense-in-depth.

---

_Reviewed: 2026-07-05T12:01:36Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
