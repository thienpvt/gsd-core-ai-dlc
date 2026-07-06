---
phase: 03-summary-injection-lazy-detail-loading
reviewed: 2026-07-06T01:30:41Z
depth: deep
files_reviewed: 6
files_reviewed_list:
  - src/inject/inject.ts
  - src/cli/commands/inject.ts
  - src/cli/commands/rule-detail.ts
  - src/rules/detail-path.ts
  - src/index/build.ts
  - src/cli/index.ts
findings:
  critical: 1
  warning: 2
  info: 4
  total: 7
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-07-06T01:30:41Z
**Depth:** deep
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The anti-bloat core holds. `renderInjection` is body-free by construction (no `node:fs`, no `gray-matter`, reads only `id`/`severity`/`summary`), deterministic, and correctly frames the empty-selection case. `rule-detail` reads exactly one target and never iterates other rules' bodies (SEL-03 intact). The traversal guard's textual math is sound: I could not find a `..`-escape or sibling-prefix bypass, and Windows drive-relative paths (`C:foo.md`) are caught by the `path.relative` containment check even though `path.isAbsolute` misses them. D-06 (summary-only), D-07 (build-time validation), and CR-02 (`process.exitCode` in `inject`/`rule-detail`) are all correctly implemented, and the no-detailPath corpora stay backward-compatible.

The one serious gap is symlink resolution: the guard uses `path.resolve` (pure text), not `realpathSync`, so a symlink planted inside a pack defeats the containment check and yields arbitrary file read at both build and fetch time. Given the project's portable/third-party rule-pack premise, this reopens the exact arbitrary-read hole IN-05 exists to close. Two robustness gaps (a shallow inject shape guard and a lingering `process.exit`) and several minor items follow.

## Critical Issues

### CR-01: Traversal guard is textual-only — a symlink in the pack bypasses IN-05 (arbitrary file read)

**File:** `src/rules/detail-path.ts:47`, `src/rules/detail-path.ts:52-63` (guard); exploited at `src/index/build.ts:78-79` and `src/cli/commands/rule-detail.ts:104`

**Issue:** `resolveDetailPath` computes containment with `path.resolve` + `path.relative`, which operate on the path string and do **not** resolve symlinks. The containment check therefore validates the *textual* target, but `existsSync` (build, line 79) and `readFileSync` (fetch, line 104) both **follow** symlinks to their real target.

Exploit under the project's portable/third-party rule-pack threat model (rule packs are meant to be shared/distributed):
1. A malicious pack ships `enterprise/details/leak.md` as a symlink → `/etc/passwd` (or `%USERPROFILE%\...` on Windows), plus a rule with `detailPath: details/leak.md`.
2. Build-time D-07: `resolveDetailPath` returns `.../enterprise/details/leak.md` — textually in-pack, guard passes. `existsSync` follows the link, target exists, build succeeds.
3. Fetch-time `governance rule-detail <id>`: guard passes again (still textually in-pack), then `readFileSync(target)` follows the link and prints the contents of `/etc/passwd` to stdout.

The resolver's own docstring claims it prevents a detailPath from resolving "outside the rule pack" — symlinks break that guarantee at the one choke point the whole IN-05 design rests on. Note the existing negative tests (`detail-path.test.ts`, `build-guards.test.ts`) cover absolute and `..`-escape but have **no symlink case**, so the gap is untested.

(If your threat model is strictly repo-trust-only — no untrusted packs — downgrade to Warning, since a symlink-committer already has repo write access. Under the stated portability premise it is a Critical arbitrary-read.)

**Fix:** Resolve symlinks before the containment check, or reject symlinked targets outright. For example, canonicalize both sides and re-check, tolerating a not-yet-existing target:

```typescript
import { realpathSync } from "node:fs";

// after computing `resolved` and BEFORE the containment check:
let real = resolved;
try {
  real = realpathSync(resolved);           // follow symlinks to the true target
} catch {
  /* target may not exist yet (fetch-time missing file) — fall back to the
     lexical path; the caller's readFileSync/existsSync still fails loud */
}
const rel = path.relative(realpathSync(path.resolve(packRoot)), real);
```

Alternatively `lstatSync(resolved).isSymbolicLink()` → throw a loud IN-05 rejection. Add a symlink negative fixture + test to both `detail-path.test.ts` and `build-guards.test.ts`.

## Warnings

### WR-01: `inject` shape guard validates only array-ness, so malformed rules render literal "undefined" instead of failing loud

**File:** `src/cli/commands/inject.ts:70-85`

**Issue:** The guard checks that `selected` and `skipped` are arrays, then casts to `SelectionResult` and calls `renderInjection`. It does **not** validate the fields of each `SelectedRule`. A hand-crafted (or upstream-corrupted) `--input` such as `{"selected":[{"id":"x"}],"skipped":[]}` renders `- [undefined] x: undefined (run \`governance rule-detail x\` for the full rule)` straight into the `<governance>` context. That is silently emitting *wrong* content, which is exactly what the CR-01 fail-loud lesson (cited in the file's own docstring) says to avoid — the guard's comment scopes itself to "not an empty block," but non-empty garbage is just as harmful in governance context. (The normal `select | inject` pipeline is unaffected since `select()` always populates the fields; this is a robustness gap for the CLI's untrusted-input boundary.)

**Fix:** Validate each selected element before rendering (or run an Ajv `SelectionResult` schema, which the docstring already anticipates):

```typescript
for (const r of candidate.selected as SelectedRule[]) {
  if (
    typeof r !== "object" || r === null ||
    typeof r.id !== "string" ||
    typeof r.summary !== "string" ||
    !(r.severity in SEVERITY_ORDINAL)
  ) {
    throw new Error("malformed inject input: each selected rule needs string id/summary and a valid severity");
  }
}
```

### WR-02: `process.exit(2)` in the dispatcher default branch contradicts the CR-02 discipline

**File:** `src/cli/index.ts:34`

**Issue:** Every Phase 2/3 command deliberately uses `process.exitCode` (not `process.exit`) to avoid truncating buffered pipe output on Windows (CR-02, called out in `inject.ts:88-98`, `rule-detail.ts:20-22`, and the self-invocation catch at `cli/index.ts:46`). The unknown-command default still calls `process.exit(2)` synchronously after two buffered `process.stderr.write` calls. On a Windows pipe, stderr writes are asynchronous, so `process.exit` can truncate the usage text before it flushes. Impact is low (diagnostic stderr, not correctness or data), but it is the one place that breaks the pattern the codebase adopted precisely to prevent this.

**Fix:**
```typescript
process.stderr.write(`Unknown command: ${subcommand ?? "(none)"}\n`);
process.stderr.write("Usage:\n" + /* ... */);
process.exitCode = 2;
return;
```

## Info

### IN-01: Redundant / unreachable `rel.startsWith("../")` condition

**File:** `src/rules/detail-path.ts:56`

**Issue:** `` `..${path.sep}` `` already equals `"../"` on POSIX (making line 56 an exact duplicate of line 55) and `path.relative` never emits forward slashes on Windows (making line 56 dead there). Harmless defensive redundancy, but it can mislead a reader into thinking a forward-slash case is reachable. Consider dropping line 56 or adding a comment that it is intentional belt-and-suspenders.

### IN-02: D-07 uses `existsSync`, not an is-file check

**File:** `src/index/build.ts:79`

**Issue:** `existsSync(target)` passes for a directory. A `detailPath` that resolves to a directory survives the build, then fails with an opaque `EISDIR` at fetch time (`rule-detail.ts:104`) — moving the failure from author-time to executor-request time, which is the opposite of D-07's intent. Consider `statSync(target).isFile()` so a directory target is caught (and named) at build time.

### IN-03: Fetch-time containment is repo-wide (`cwd`), not store-scoped

**File:** `src/cli/commands/rule-detail.ts:98`

**Issue:** The fetch-time `packRoot = process.cwd()` is coarser than build-time's `absRoot` (store root), as documented. A consequence: with a hand-crafted `--index`, a `sourceFile` + `..`-heavy `detailPath` can point at any file *inside* cwd (e.g. `.env`) that a store-scoped guard would reject — the guard only blocks escapes *outside* cwd. This does not escalate privilege (crafting the index already requires filesystem access, and the dangerous out-of-repo reads are still blocked), so it is informational, but pinning `packRoot` to the index file's own directory (or recording the store root in the index) would make the fetch guard as tight as the build guard.

### IN-04: Index `JSON.parse` not wrapped with a friendly message (inconsistent with `inject`)

**File:** `src/cli/commands/rule-detail.ts:44` (same pattern in `src/cli/commands/select.ts:200`)

**Issue:** A corrupt index file throws a raw `SyntaxError` from `JSON.parse`, whereas `inject.ts:59-65` wraps its parse in a try/catch with a "malformed ... not valid JSON" message. Both fail loud (non-zero exit via `cli/index.ts`), so this is purely error-message quality/consistency, not a correctness issue. Consider mirroring `inject`'s wrapped-parse idiom in `readIndex`.

---

_Reviewed: 2026-07-06T01:30:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
