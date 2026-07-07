---
phase: 03-summary-injection-lazy-detail-loading
reviewed: 2026-07-06T03:10:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/rules/detail-path.ts
  - src/rules/detail-path.test.ts
  - src/index/build.ts
  - src/index/build-guards.test.ts
  - src/cli/commands/rule-detail.ts
  - src/cli/commands/inject.ts
  - src/cli/inject.smoke.test.ts
  - src/inject/inject.ts
  - src/cli/index.ts
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
status: clean
---

# Phase 3: Code Review Report

**Reviewed:** 2026-07-06T03:10:00Z
**Depth:** deep
**Files Reviewed:** 9
**Status:** clean

## Summary

Re-review iteration 3 of Phase 3 (Summary Injection & Lazy Detail Loading). Scope: the three files touched by the iteration-2 fixes (`src/cli/commands/inject.ts`, `src/rules/detail-path.ts`, `src/cli/index.ts`) plus their callers/tests, verifying both Warning fixes closed and introducing no new Critical/Warning defect. Cross-checked the load-bearing Critical (CR-01 symlink hole) still holds across all three iterations and that legitimate detailpath-store resolution still passes.

**Result:** Both iteration-2 Warnings are closed. No new Critical or Warning defect introduced. The 4 prior Info items (IN-01..IN-04) persist as known, deliberately deferred (out-of-scope); per workflow rule, with no Critical/Warning and only known deferred Info remaining, status is `clean`.

**Closure verification:**

- **WR-01 (was `in` operator → prototype-key bypass):** `src/cli/commands/inject.ts:91-105` now reads `typeof r.severity !== "string" || !Object.hasOwn(SEVERITY_ORDINAL, r.severity)`. `SEVERITY_ORDINAL` is a plain object literal (`{critical:0, high:1, medium:2, low:3}`), so `Object.hasOwn` excludes the prototype chain. Traced against `"toString"`, `"__proto__"`, `"constructor"` → all return `false` → throw fires. Legitimate `"critical"` → `true` → passes. The Case D smoke test (`src/cli/inject.smoke.test.ts:130-161`) feeds `{selected:[{id:"evil",summary:"pwned",severity:"toString"}],skipped:[]}` and asserts non-zero exit, non-empty stderr, and that stdout does NOT carry `[toString]` — it exercises the actual reject path through the built dist CLI via spawnSync, so it's a real end-to-end reject assertion, not logic-only. The NaN-comparator determinism side-effect (the bracket lookup `SEVERITY_ORDINAL[severity]` returned `undefined` → `undefined - undefined = NaN` → `Array.sort` behavior implementation-defined) is gone because the prototype-key severities that produced it are now rejected at the boundary before reaching `renderInjection`'s comparator. `in`-bypass confirmed gone.

- **WR-02 (was canonicalize asymmetry → false-positive symlink-escape on missing target under symlinked packRoot):** `src/rules/detail-path.ts:116-134` now wraps `realpathSync(resolved)` in its own try/catch. On ENOENT (or any throw), it returns `resolved` (lexical, already proven in-pack by the lexical guard at lines 92-98) WITHOUT running the realpath containment check. (a) Missing in-pack target: `realpathSync(resolved)` throws → catch → returns lexical → caller `existsSync` (build D-07) returns false → loud "does not exist" error; or fetch's `readFileSync` throws ENOENT. No symlink-escape message fires. (b) Existing symlinked target that escapes: `realpathSync(resolved)` succeeds → realTarget outside pack → `realRoot = canonicalize(packRoot)` succeeds → `escapesRoot(realRel)` true → throws the symlink-naming IN-05 error. Still rejected. (c) Dangling symlink (link present, target gone): `realpathSync` on the link throws ENOENT → catch returns lexical `resolved` → caller's `existsSync`/`readFileSync` follow the link, also fail ENOENT. The caller never opens anything — no arbitrary-read payload reaches disk. `canonicalize(packRoot)` (lines 51-57, 126) is now reached ONLY when the target realpath succeeded, so the prefix-asymmetry false positive cannot fire. Verified.

**Critical re-confirmations across all three iterations:**

- **CR-01 stays closed:** `src/rules/detail-path.ts:100-134` re-runs `escapesRoot` on `realpathSync(resolved)` against `canonicalize(packRoot)`. Traced both call sites: build (`src/index/build.ts:78`) and fetch (`src/cli/commands/rule-detail.ts:99`) call the same single-sourced `resolveDetailPath`. A symlink inside the pack pointing at an outside file (e.g. `details/leak.md` → `/etc/passwd`) is rejected at both: `realpathSync` succeeds → `realRel` is `..`-prefixed → `escapesRoot` true → loud symlink-naming throw. Both `detail-path.test.ts:84-133` (unit) and `build-guards.test.ts:153-222` (build integration) assert the reject path with a runtime-built symlink fixture (POSIX-only, `t.skip` on EACCES/EPERM).
- **No body leak / lazy-load / determinism regression:** `src/index/build.ts:29-49` still assembles records via explicit field whitelist, never spreads the parse result, never references `gray-matter`'s `content`. `src/inject/inject.ts:1-18` imports no `node:fs`/no `gray-matter`; `renderInjection` reads only `id`/`severity`/`summary`. `src/cli/commands/rule-detail.ts:104-105` still reads ONLY the one resolved target after the guard — never iterates the index (SEL-03). Determinism holds: no clock, no `Math.random`, no I/O in the render path; the iter-2 fix's `Object.hasOwn` and try/catch are pure deterministic checks.
- **Existing legitimate resolution unchanged:** `detailpath-store/enterprise/with-detail.md` (real non-symlink relative file) → `realpathSync(resolved)` succeeds, `realRoot = canonicalize(packRoot)` = `packRoot`, `escapesRoot(realRel)` false → returns lexical `resolved`. `build-guards.test.ts:91-103` still passes (pointer carried verbatim, D-07 exists check passes).

**Type check:** `npx tsc --noEmit -p tsconfig.json` clean (no output, exit 0).

**Scan:** no `eval(`, `innerHTML`, `exec(`, `debugger;` in `src/`.

## Info

The 4 prior Info items persist (deliberately deferred — out of scope per prior iterations). Listed for traceability; NOT blocking.

### IN-01: Redundant / unreachable `rel.startsWith("../")` condition

**File:** `src/rules/detail-path.ts:33`
**Issue:** The `rel.startsWith("../")` POSIX-literal branch is unreachable on Windows (where `path.sep` is `\\`, caught by the preceding `..${path.sep}` check) and redundant on POSIX (where `path.sep` is `/`, so `..${path.sep}` already matches `../`). Belt-and-suspenders defensive, not a bug.
**Fix:** Optional — drop the `rel.startsWith("../")` clause, or keep as cross-platform paranoia with a comment.

### IN-02: D-07 uses `existsSync`, not an is-file check

**File:** `src/index/build.ts:79`
**Issue:** A directory at the detailPath target would pass `existsSync` and only fail later when `rule-detail` tries to `readFileSync` it. Not exploitable (build accepts a target that fetch rejects), just less precise than `statSync(target).isFile()`.
**Fix:** Optional — replace `existsSync(target)` with `statSync(target).isFile()`.

### IN-03: Fetch-time containment is repo-wide (`cwd`), not store-scoped

**File:** `src/cli/commands/rule-detail.ts:98`
**Issue:** Documented as intentional coarse backstop (build-time D-07 store-scoped guard is authoritative). Fetch guard accepts any detailPath inside cwd, narrower than the build guard. Not a defect — flagged for prior visibility.
**Fix:** None — keep as designed backstop.

### IN-04: Index `JSON.parse` not wrapped with a friendly message

**File:** `src/cli/commands/rule-detail.ts:44` (same pattern in `src/cli/commands/select.ts:200`)
**Issue:** A malformed `--index` JSON throws an opaque `Unexpected token` rather than a "malformed index" prefixed error like `inject` does for its input. Inconsistent error surfacing, not a bug.
**Fix:** Optional — wrap in try/catch with a "malformed index file" prefix.

---

_Reviewed: 2026-07-06T03:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
