---
phase: 05-audit-artifact-writer
reviewed: 2026-07-06T00:00:00.000Z
depth: deep
files_reviewed: 6
files_reviewed_list:
  - src/governance/audit-artifact.ts
  - src/governance/audit-artifact.test.ts
  - src/governance/audit-hook-contract.test.ts
  - src/governance/consent.test.ts
  - .claude/skills/aidlc-governance-audit/SKILL.md
  - .gsd/capabilities/aidlc-governance/capability.json
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-06T00:00:00.000Z
**Depth:** deep
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The Phase 05 audit-artifact writer is a focused, single-responsibility module that reads persisted selector state, validates it, builds a `GovernanceAudit` record, and writes `GOVERNANCE.md` deterministically. The hardening pass (commit `03287e6`) added enum validation for `phase` / `riskTier` / `severity` / `scope` and ISO timestamp validation, resolving the prior review's BLOCKER. Cross-file tracing against `state-store.ts`, `paths.ts`, `types.ts`, and `risk.ts` confirms the read/build/write call chain is coherent and the `SkipReason` -> `AuditSkipReason` normalization (`out-of-scope` -> `out-of-scope-by-trigger`) is consistent with the type definitions in `types.ts`.

However, one BLOCKER remains that undermines the phase's core "machine-checkable enum" guarantee: `matchedAxis` is a closed enum in the source `SelectedRule` type but is widened to bare `string` in `AuditAppliedRule` and only validated as a non-empty string -- so a corrupted state file can write an invalid axis value into the audit artifact, the exact class of defect the hardening pass was meant to close. Several warnings follow around loose timestamp checking, an unsound `selector_reason` type assertion, a test coverage gap in the consent-to-audit-hook chain, a fragile direct-run detection check, and a temp-file collision risk in the atomic-write path.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `matchedAxis` enum validation missing -- invalid axis values pass through to audit artifact

**File:** `src/governance/audit-artifact.ts:25,118,177`

**Issue:** The source `SelectedRule.matchedAxis` is typed as `MatchedAxis = "taskType" | "keywords" | "paths" | "always-in-phase"` (a closed enum, `src/types.ts:162`). But `AuditAppliedRule.matchedAxis` is declared as bare `string` (line 25), and `assertSelectionArrays` only calls `assertString(rule.matchedAxis, ...)` (line 118) -- NOT `assertOneOf(rule.matchedAxis, ..., MATCHED_AXES)`.

Every other enum-typed field on the record got `assertOneOf` validation in the hardening pass: `severity` -> `SEVERITIES`, `scope` -> `SCOPES`, `phase` -> `PHASES`, `riskTier` -> `RISK_TIERS`. `matchedAxis` is the only closed-enum field that was widened to `string` and left with only a non-empty-string check.

This is the exact class of defect the hardening pass was meant to close. A corrupted or hand-edited `selection-state.json` with `"matchedAxis": "garbage"` (or a future selector bug emitting a non-enum axis) passes validation and is written verbatim into `GOVERNANCE.md`, producing an audit artifact with a non-machine-checkable axis value. Downstream audit consumers that switch on `matchedAxis` will fail or silently mis-classify. The phase's stated contract is that skip reasons (and by symmetry, applied-rule provenance) come from machine-checkable enums; `matchedAxis` is the applied-rule provenance axis and it is not checked. The compiled `dist/governance/audit-artifact.js` (line 71) confirms the gap is present in the built artifact, not just source.

**Fix:** Add a `MATCHED_AXES` constant and validate with `assertOneOf`, matching the pattern used for every other enum field. Type `AuditAppliedRule.matchedAxis` as `MatchedAxis` (import it) rather than `string`.

```typescript
import type { Severity, SkipReason, Scope, MatchedAxis } from "../types.js";

const MATCHED_AXES = ["taskType", "keywords", "paths", "always-in-phase"] as const;

export interface AuditAppliedRule {
  id: string;
  severity: Severity;
  summary: string;
  matchedAxis: MatchedAxis;   // was: string
  matchedValue: string;
}

// inside assertSelectionArrays, selected.forEach block:
assertOneOf(rule.matchedAxis, `selectionResult.selected[${index}].matchedAxis`, MATCHED_AXES);
// was: assertString(rule.matchedAxis, `selectionResult.selected[${index}].matchedAxis`);
```

Add a regression test mirroring the existing `invalid selected severity` case (lines 223-232) that sets `matchedAxis: "garbage"` and asserts `writeGovernanceAudit` throws with no `GOVERNANCE.md` written.

## Warnings

### WR-01: `assertTimestamp` accepts non-ISO date strings -- ISO timestamp claim is not enforced

**File:** `src/governance/audit-artifact.ts:98-103`

**Issue:** `assertTimestamp` calls `Date.parse(value)` and only rejects `NaN`. `Date.parse` is locale-format-lenient: it accepts `"2026/07/06"`, `"July 6 2026"`, and other non-ISO 8601 forms as valid (verified at runtime: both return epoch millis, not NaN). The hardening pass described this as "ISO timestamp validation," and the thrown error message says `must be an ISO timestamp`, but the check does not actually enforce ISO 8601. A state file with `timestamp: "2026/07/06"` passes validation and is recorded as `selection_timestamp` in the audit artifact. This weakens the reproducibility/determinism guarantee: two semantically-equivalent timestamps in different formats would produce byte-different artifacts while both claiming to be ISO.

**Fix:** Tighten the check to require strict ISO 8601 format:

```typescript
function assertTimestamp(value: unknown, field: string): asserts value is string {
  assertString(value, field);
  // Date.parse accepts non-ISO forms (e.g. "2026/07/06", "July 6 2026");
  // require strict ISO 8601: YYYY-MM-DDTHH:MM:SS(.sss)?(Z|+/-HH:MM)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      Number.isNaN(Date.parse(value))) {
    throw new Error(`malformed governance state: ${field} must be an ISO timestamp`);
  }
}
```

### WR-02: `selector_reason` stored as `SkipReason` without enum validation -- type assertion is unsound

**File:** `src/governance/audit-artifact.ts:33,126,180-184`

**Issue:** `AuditSkippedRule.selector_reason` is typed as `SkipReason` (line 33), and `buildAuditRecord` writes `selector_reason: rule.reason` (line 184) directly from the persisted state. The validation at line 126 only asserts `rule.reason` is a non-empty string -- it does NOT call `assertOneOf(rule.reason, ..., SKIP_REASONS)`. The `reason` field is then passed to `normalizeSkipReason` which throws if it is not a recognized audit enum value, so garbage values DO get caught -- but only via the normalize call, and the error message (`invalid audit skip reason`) is a different error-shape from the `malformed governance state: ...` form used for every other field validation. More importantly, the `selector_reason: rule.reason` assignment at line 184 relies on the normalize call having already thrown for invalid values; if `normalizeSkipReason`'s throw branch were ever refactored or the call order changed, the assignment would silently emit an unvalidated string typed as `SkipReason`. The validation is split across two functions with different error contracts, and the `SkipReason` type assertion is unsound.

**Fix:** Validate `rule.reason` against the `SkipReason` enum in `assertSelectionArrays` for consistency with the other enum fields, so `selector_reason` is provably a valid `SkipReason` before assignment:

```typescript
const SKIP_REASONS = ["out-of-phase", "out-of-scope", "out-of-scope-by-trigger", "superseded"] as const;

// inside skipped.forEach:
assertOneOf(rule.reason, `selectionResult.skipped[${index}].reason`, SKIP_REASONS);
// was: assertString(rule.reason, `selectionResult.skipped[${index}].reason`);
```

### WR-03: Consent integration test does not exercise the verify:post / audit hook

**File:** `src/governance/consent.test.ts:301-303`, `test/fixtures/governance-render-hooks.sh:35-47`

**Issue:** `assertHelperRuns` asserts the helper script output matches `aidlc-governance-discuss` and `aidlc-governance-execute` (lines 301-302) but does NOT assert `aidlc-governance-audit`. The helper script `governance-render-hooks.sh` only renders `discuss:pre` and `execute:pre` -- it never renders `verify:post`. So the consent-grant -> audit-hook-activation chain is untested by the consent integration test. `audit-hook-contract.test.ts` does test `verify:post` rendering separately (line 114), but that test does not exercise the consent gate. The cross-cutting concern -- "consent revocation also deactivates the audit hook" -- has no test coverage. Given the phase's `onError: "halt"` semantics on the audit step (vs `skip` for the other two in `capability.json` lines 44,55,64), a consent-bypass on the audit hook is the most dangerous silent-failure mode and should be covered.

**Fix:** Add a `verify:post` render block to `governance-render-hooks.sh` and an `aidlc-governance-audit` assertion in `assertHelperRuns`; also assert in the tamper branch of `consent.test.ts` that `verify:post` omits the audit hook after consent revocation.

### WR-04: `isDirectRun` basename check is over-broad -- matches any `audit-artifact.js`, not just the dist entry

**File:** `src/governance/audit-artifact.ts:219-222`

**Issue:** `isDirectRun` returns true when `path.basename(process.argv[1]) === "audit-artifact.js"`. This matches ANY file with that basename, not just `dist/governance/audit-artifact.js`. If the module is ever imported by another script that happens to be named `audit-artifact.js` (e.g. a test harness, a copy, or a symlink), it will spuriously enter direct-run mode and call `runDirect(process.argv.slice(2))`, either throwing a usage error or attempting to write `GOVERNANCE.md` from whatever argv happens to be present. The `SKILL.md` (line 29) instructs `node dist/governance/audit-artifact.js`, so the intended invocation path is known and could be matched more precisely.

**Fix:** Match against the resolved dist path, not just the basename:

```typescript
function isDirectRun(): boolean {
  const invokedPath = process.argv[1];
  if (!invokedPath) return false;
  const resolved = path.resolve(invokedPath);
  return resolved === path.resolve(process.cwd(), "dist", "governance", "audit-artifact.js");
}
```

### WR-05: `atomicWriteText` reuses a fixed `.tmp` suffix -- concurrent writers race on the same temp path

**File:** `src/governance/audit-artifact.ts:67-72`

**Issue:** `atomicWriteText` writes to `${finalPath}.tmp` then renames. Two concurrent invocations targeting the same `GOVERNANCE.md` (e.g. two verify:post hooks, or a hook plus a manual re-run) share the same `.tmp` path: writer A's `writeFileSync` can be overwritten by writer B before A's `renameSync`, so A renames B's content under A's invocation, and the final file does not correspond to either invocation's audit record. The same pattern exists in `state-store.ts` (`atomicWriteJson`, line 62-67). For the single-writer audit flow this is low probability, but the audit artifact is the authoritative compliance record -- a torn-write that mixes two runs' content would be an audit-trail integrity defect, not just a performance issue. Given the project's "auditability" constraint, this warrants a unique temp suffix.

**Fix:** Use a per-invocation unique temp name so concurrent writers do not collide:

```typescript
import { randomUUID } from "node:crypto";

function atomicWriteText(finalPath: string, content: string): void {
  mkdirSync(path.dirname(finalPath), { recursive: true });
  const tmpPath = `${finalPath}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(tmpPath, content, "utf8");
  try {
    renameSync(tmpPath, finalPath);
  } catch (err) {
    try { unlinkSync(tmpPath); } catch {}
    throw err;
  }
}
```

## Info

### IN-01: `buildAuditRecord` exported but only consumed by tests + `writeGovernanceAudit`

**File:** `src/governance/audit-artifact.ts:165`

**Issue:** `buildAuditRecord` is exported as a public API, but the only non-test caller is `writeGovernanceAudit` (line 205). No other module in `src/` imports it (grep confirms only `audit-artifact.test.ts` and `audit-hook-contract.test.ts` reference it). This is acceptable as a testable seam, but if it is not intended as a stable public API, the export is wider than necessary. Not a defect -- noting for API surface awareness.

**Fix:** No change required if the export is intentional for testing. If the surface should be minimal, consider a `@internal` JSDoc tag or moving the test seam to a separate export.

### IN-02: `writeGovernanceAudit` returns the input `outputPath`, not the resolved absolute path

**File:** `src/governance/audit-artifact.ts:207`

**Issue:** `assertGovernanceOutputPath` resolves `outputPath` to an absolute path internally (line 147) for validation, and `atomicWriteText` writes to that resolved location (via `path.resolve` on the final path inside the rename). But `WriteGovernanceAuditResult.outputPath` (line 207) returns `args.outputPath` -- the original, possibly-relative input. A caller passing a relative `outputPath` would get back that relative path while the file was actually written to the resolved absolute phase directory. Minor consistency issue; could mislead a caller that re-uses the returned path for a follow-up read without re-resolving.

**Fix:** Return the resolved path so the result points at the actual file:

```typescript
export function writeGovernanceAudit(args: WriteGovernanceAuditArgs): WriteGovernanceAuditResult {
  assertGovernanceOutputPath(args.projectRoot, args.outputPath);
  const resolvedOutput = path.resolve(args.outputPath);
  // ...
  atomicWriteText(resolvedOutput, renderGovernanceMarkdown(audit));
  return { outputPath: resolvedOutput, audit };
}
```

### IN-03: `audit-hook-contract.test.ts` `resolveGsdTools` casts `candidates[0]` to string without existence check

**File:** `src/governance/audit-hook-contract.test.ts:61-69`

**Issue:** `resolveGsdTools` returns `candidates.find((c) => existsSync(c)) ?? candidates[0] as string`. The `as string` cast suppresses the `undefined` type from the nullish-coalescing fallback. In practice `candidates` always has 3 entries so `candidates[0]` is defined, but the cast is unsound -- if the array were ever emptied during refactoring, the return would be `undefined as string` and the later `existsSync(GSD_TOOLS)` check (line 115) would receive `undefined` and return `false`, triggering the skip branch rather than failing loudly. Low impact given the hardcoded array, but the pattern is fragile.

**Fix:** Drop the cast and let the type system prove the fallback is defined:

```typescript
function resolveGsdTools(): string {
  const candidates = [/* ... */] as const;
  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? candidates[0]; // candidates is non-empty by construction
}
```

---

_Reviewed: 2026-07-06T00:00:00.000Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
