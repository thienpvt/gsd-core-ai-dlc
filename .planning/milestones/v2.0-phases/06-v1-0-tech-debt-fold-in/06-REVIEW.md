---
phase: 06-v1-0-tech-debt-fold-in
reviewed: 2026-07-06T23:45:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/governance/atomic-write.ts
  - src/governance/atomic-write.test.ts
  - src/governance/audit-artifact.ts
  - src/governance/audit-artifact.test.ts
  - src/governance/audit-hook-contract.test.ts
  - src/governance/config-no-warnings.test.ts
  - src/governance/consent-verify-post.test.ts
  - src/governance/state-store.ts
  - src/governance/state-store.test.ts
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
status: clean
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-06T23:45:00Z
**Depth:** deep
**Files Reviewed:** 9
**Status:** clean

## Summary

Iteration 2 re-review of v1.0 tech-debt fold-in (9 governance-layer files). All
3 warnings from iteration 1 confirmed resolved by commits b1732f6, 56b753c,
0c6a0d3. No new Critical or Warning issues introduced by the fixes. Suite
remains green (191 pass, 0 fail, 2 skipped).

Headline fixes traced end-to-end:

- **WR-01 resolved** — `auditFromUnsafeRecord` helper deleted from
  `audit-artifact.test.ts` (commit b1732f6, -8 lines). Grep across `src/`
  confirms zero remaining references. Malformed-payload tests (lines 197-289,
  376-403) still use the inline `writeUnsafeState` + `writeGovernanceAudit`
  pattern inside `withTempRoot`, which is the canonical path. No test coverage
  lost — helper was dead code.
- **WR-02 resolved** — `grantConsent` in `consent-verify-post.test.ts`
  (commit 56b753c) now single-path: directly calls
  `consent.recordProjectConsent` with `contentHash: consent.bundleContentHash(capDir)`
  as the security binding. The `gsd capability install --yes` spawn attempt and
  its `proc.status === 0` fallback branch were removed. A `ponytail:` comment
  (lines 244-251) documents: (a) install path not the contract under test, (b)
  `contentHash` is the binding exercised, (c) `integrity`/`disclosureSignature`
  left empty because tamper test asserts content-hash detection not
  disclosure-signature binding, (d) ceiling — if future gsd-core tightens
  `recordProjectConsent` to require non-empty `disclosureSignature`, populate a
  non-empty signature. Post-consent test still asserts `status === "active"`,
  which holds because `recordProjectConsent` with the content-hash binding is
  the path that was already producing active status in the shimmed runtime (the
  install lifecycle was the path that was failing).
- **WR-03 resolved** — pre-consent test (commit 0c6a0d3) no longer declares
  `let consent: ConsentModule | undefined` nor `let projectRoot = ""`.
  `projectRoot` is now `const projectRoot = fixture.projectRoot` inside the try
  block. The `finally` block's dead `if (consent && projectRoot)` revoke branch
  is gone; finally now only runs `rmSync(tmpRoot, { recursive, force })`. No
  test coverage lost — the branch was unreachable (consent never assigned in
  that test body).

Deep cross-file tracing re-verified on the post-fix state:

- **TD-03 atomic-write** — `atomicWriteFile` unique `.<pid>-<uuid>.tmp` suffix;
  `rmSync({force:true})` in catch swallows ENOENT; `mkdirSync` outside try
  (acceptable — if parent-dir creation fails, no temp file exists to clean).
  Concurrent-writer test (atomic-write.test.ts:38-84) asserts content-integrity
  invariant not all-success, acknowledging Windows `renameSync` EPERM race.
- **TD-01 ISO-8601** — `ISO_8601_STRICT` regex in `audit-artifact.ts:111`
  rejects slash-sep, date-only, missing-ms, missing-tz variants. Positive case
  (audit-artifact.test.ts:406-418) accepts canonical `toISOString()` shape and
  asserts `result.outputPath` is absolute (TD-07).
- **TD-04 selector_reason** — `assertSelectionArrays` validates
  `selector_reason` per-element against `SELECTOR_REASONS` before
  `normalizeSkipReason` runs (audit-artifact.ts:152-156). Single unified error
  message naming `selector_reason`.
- **TD-07 return shape** — `writeGovernanceAudit` returns
  `{ outputPath: path.resolve(args.outputPath), audit }` (audit-artifact.ts:238).
  Test at audit-artifact.test.ts:414-417 asserts absolute path.
- **TD-02 consent-gated verify:post** — post-consent test asserts
  `hook.onError === "halt"` (consent-verify-post.test.ts:343-346), the
  TD-02 silent-failure contract. Revoke and tamper tests assert fail-closed
  deactivation. `grantConsent` rebinds `contentHash` via
  `bundleContentHash(capDir)` so tamper test (mutates `manifest.description`)
  forces hash mismatch → deactivation.
- **TD-08 / TD-09** — `resolveGsdTools` in audit-hook-contract.test.ts:64-75
  returns `string | null` explicit; caller guards null with `t.skip`.
  `config-no-warnings` test exercises real `gsd-tools query init.plan-phase 6`
  against `.planning/config.json`; five warned keys asserted absent from output.

4 Info items from iteration 1 carried forward (out of fix_scope for this
iteration): IN-01 duplicated ConsentModule/LedgerModule types across two test
files, IN-02 inline `require("node:os")`/`require("node:fs")` in
config-no-warnings.test.ts, IN-03 divergent gsd-tools candidate lists between
two test files, IN-04 concurrent-writer test theoretical flake under all-EPERM
race. None are correctness/security defects; all remain info-tier hygiene.

## Info

### IN-01: Duplicated `ConsentModule` / `LedgerModule` type definitions across two test files

**File:** `src/governance/consent-verify-post.test.ts:52-73`, `src/governance/consent.test.ts:45-66`
**Issue:** `ConsentModule` and `LedgerModule` TS types are duplicated. Maintenance hazard if a future gsd-core release changes `recordProjectConsent`'s arg shape — stale copy produces silent type-mismatch at runtime.
**Fix:** Extract a single `src/governance/consent-test-types.ts` exporting both types, import in both test files. Low priority — worth doing only if a third consent test appears.

### IN-02: `config-no-warnings.test.ts` inline `require("node:os")` / `require("node:fs")` inside `resolveGsdTools`

**File:** `src/governance/config-no-warnings.test.ts:16-29`
**Issue:** `resolveGsdTools` uses `require("node:os").homedir()` and `require("node:fs").existsSync(c)` inline, while the file's top already imports `readFileSync` from `node:fs`. Inconsistent with `audit-hook-contract.test.ts` which imports `os`/`existsSync` at top. Not a bug — CJS `require` is idempotent/cached.
**Fix:** Hoist `import os from "node:os"` and add `existsSync` to the existing `node:fs` import at top of file; replace inline `require` calls.

### IN-03: `config-no-warnings.test.ts` resolves gsd-tools via a different candidate list than `audit-hook-contract.test.ts`

**File:** `src/governance/config-no-warnings.test.ts:17-21` vs `src/governance/audit-hook-contract.test.ts:64-75`
**Issue:** `config-no-warnings` candidate list is `[process.env.CODEX_HOME, ~/.codex, ~/.claude]` (with empty-string-filter on `CODEX_HOME`), while `audit-hook-contract` uses `[CODEX_CONFIG_DIR, ~/.codex, ~/.claude]` where `CODEX_CONFIG_DIR = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex")`. Divergence means `CODEX_HOME` resolution differs subtly between the two tests.
**Fix:** Extract a shared `test-gsd-tools.cjs` helper with a single candidate-order and null-handling contract, import in both tests.

### IN-04: `atomic-write.test.ts` concurrent-writer test has a theoretical flake under all-EPERM race

**File:** `src/governance/atomic-write.test.ts:38-84`
**Issue:** Concurrent-writer test spawns 6 children and asserts `codes.some((c) => c === 0)` (at least one writer succeeded). Theoretically all children could lose the `renameSync` race on Windows (EPERM on shared destination), failing the "at least one succeeded" assertion. Test comment acknowledges content-integrity is the invariant, not all-success. In practice unlikely (one writer must win) but a theoretical flake source under heavy load or single-core CI.
**Fix:** No code change required if team accepts rare-flake risk. If determinism needed, run the concurrent case in a loop (e.g. 5 iterations) and assert at least one iteration produces a winner — a single iteration's all-EPERM outcome then does not fail the test.

---

_Reviewed: 2026-07-06T23:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_