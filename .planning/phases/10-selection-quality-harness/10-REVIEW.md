---
phase: 10-selection-quality-harness
reviewed: 2026-07-08T00:41:07Z
depth: deep
files_reviewed: 13
files_reviewed_list:
  - src/select/eval-cli.ts
  - src/governance/eval-evidence.ts
  - src/schema/eval-report.schema.json
  - src/cli/commands/eval.ts
  - src/cli/index.ts
  - src/governance/paths.ts
  - src/governance/ship-gate-hook.ts
  - .claude/skills/aidlc-governance-verify/SKILL.md
  - package.json
  - .gitignore
  - src/select/eval-cli.test.ts
  - src/enforcement/validate-eval-report.test.ts
  - src/governance/ship-gate-hook.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-07-08T00:41:07Z
**Depth:** deep
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Deep review of the SEL-06 standing recall/precision harness + ship-gate forward-scoping consumption. Traced the full call chain: `eval-cli.runDirect` → `runEval` → `runCases`/`aggregate` (eval-harness) → `select` (pure core) → `writeEvalEvidence` → `readEvalEvidence` → `assertNoFailedEval` (ship-gate-hook). Cross-checked the schema (`eval-report.schema.json`) against the producer (`runEval`) and the consumer (`ship-gate-hook`).

The D-05 critical-recall gate is sound: `criticalRecall < 1.0` → exit 2 (direct runner) / throw (ship gate). No silent-pass path exists in code — `aggregate` throws on expected-id-absent-from-index and on duplicate case names, so a mislabeled critical expected id cannot vacuously pass `criticalRecall === 1.0`. `subsetRecall` is correct (empty subset → 1.0 vacuous by design; any miss → < 1.0). Precision offenders are reported but never gate. Determinism holds: `select` sorts output by id, cases sorted by name, corpusHash over canonicalized sorted cases, `capturedAt` is the only expected diff. The forward-scoping guard (`phaseNumber >= "10"`) is safe because `PHASE_NUMBER_RE` (`^\d{2}(?:\.\d+)?$`) restricts to 2-digit zero-padded numbers where lexical order matches numeric for the "10" threshold.

No BLOCKERs found. Three WARNINGs around exit-code contract drift on the CLI shim path, path-layout duplication, and a latent `process.exitCode` accumulation footgun.

## Warnings

### WR-01: CLI shim `governance eval` returns exit 1 (not the documented exit 3) on parse/load errors

**File:** `src/cli/commands/eval.ts:11-26`, `src/cli/index.ts:52-57`
**Issue:** The D-08 contract (documented in `eval-cli.ts:24-25` and `SKILL.md:60-62`) distinguishes exit 3 = parse/index/load error from exit 2 = critical-recall regression. The direct runner `eval-cli.ts` honors this: `isDirectRun` wraps `runDirect` in a try/catch that sets `process.exitCode = 3` (lines 314-319). But the CLI shim `eval.ts` calls `runDirect(argv)` with NO try/catch. When `runDirect` throws (parse/load error), the error propagates through `main()` to `index.ts`'s top-level catch, which sets `process.exitCode = 1` (line 55) — the generic failure code, not 3. So `governance eval <bad-input>` exits 1 instead of 3.

The verify:post SKILL.md step 5 invokes the direct runner (`node dist/select/eval-cli.js`), which is correct — so the ship-blocking path is unaffected. But the public `governance eval` CLI surface violates the documented exit-code contract, degrading diagnostic precision.

**Fix:**
```typescript
// src/cli/commands/eval.ts
import { runDirect } from "../../select/eval-cli.js";

export async function run(rest: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: rest,
    options: { json: { type: "boolean", default: false } },
    allowPositionals: true,
  });
  if (positionals.length !== 1) {
    throw new Error("usage: governance eval <phaseNumber> [--json]");
  }
  const argv = [positionals[0], ...(values.json ? ["--json"] : [])];
  try {
    runDirect(argv);
  } catch (err) {
    process.stderr.write(`eval: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 3; // D-08: parse/load error — match the direct-runner contract
  }
}
```

### WR-02: `runDirect` hardcodes governance path layout in stderr status messages instead of using `paths.ts` helpers

**File:** `src/select/eval-cli.ts:283-284`
**Issue:** `paths.ts` is documented as the "single source of the governance layout" (line 8-9). `writeEvalEvidence` and `writeEvalReportMarkdown` correctly call `evalEvidencePath`/`evalReportPath` internally. But the stderr status messages at lines 283-284 re-derive the paths inline:
```typescript
const jsonPath = path.join(projectRoot, ".planning", "governance", "eval", `${phaseNumber}.json");
const mdPath = path.join(projectRoot, ".planning", "governance", "eval", `${phaseNumber}-report.md`);
```
If the layout ever changes (e.g., a subdirectory is added in `paths.ts`), the actual write goes to the new path but the operator-facing status message reports the old path — a silent drift bug. The fix is one import + two helper calls.

**Fix:**
```typescript
// At the top of eval-cli.ts, add to the paths import (currently only governance helpers are imported):
// import { evalEvidencePath, evalReportPath } from "../governance/paths.js";
// (or add to existing governance import block)

// Replace lines 283-284:
const jsonPath = evalEvidencePath(projectRoot, phaseNumber);
const mdPath = evalReportPath(projectRoot, phaseNumber);
```

### WR-03: `process.exitCode` is never reset to 0 on pass — latent footgun if `runDirect` is called multiple times in-process

**File:** `src/select/eval-cli.ts:297-299`
**Issue:** `runDirect` sets `process.exitCode = 2` on critical-recall regression but has no `else` branch to reset `process.exitCode = 0` on pass. Today no caller invokes `runDirect` more than once per process (the direct runner exits after one call; the CLI shim calls it once). But if a future caller (e.g., a batch harness running eval across multiple phases in one process) calls `runDirect` twice — first a failing phase (sets exitCode=2), then a passing phase — the passing call leaves exitCode=2, so the process exits 2 despite the last run passing. This is a footgun for any in-process loop reuse.

**Fix:**
```typescript
// D-05: critical-recall regression → exit 2. Failed evidence already persisted.
// Reset to 0 on pass so a prior failed run in the same process does not leak.
if (report.aggregate.recallBySeverity.critical < 1.0) {
  process.exitCode = 2;
} else {
  process.exitCode = 0;
}
```

## Info

### IN-01: `CriticalMiss.severity` union allows all four severities but producer only ever emits `"critical"`

**File:** `src/governance/eval-evidence.ts:43-47`, `src/select/eval-cli.ts:134-141`
**Issue:** The `CriticalMiss` interface declares `severity: "critical" | "high" | "medium" | "low"`, and the schema enum (`eval-report.schema.json:76`) matches. But the producer (`eval-cli.ts:134-141`) only ever pushes entries with `severity: "critical"` — non-critical misses are reflected solely in `aggregate.recallBySeverity.{high,medium,low}` and never appear in `criticalMisses`. The interface name `CriticalMiss` and field `severity` suggest critical-only, making the union misleading. Either narrow the type to `"critical"` (matching the producer contract) or document that `criticalMisses` is reserved for critical-only misses and the severity field is forward-compat. Low-impact contract clarity issue.

**Fix:** Either narrow the type to `severity: "critical"` (and update the schema enum to `["critical"]`), or rename the field/array to reflect it is the blocking-signal list, not a general miss list.

### IN-02: Forward-scoping guard untested with dotted phase numbers (e.g. "10.1")

**File:** `src/governance/ship-gate-hook.test.ts:478-528`
**Issue:** The forward-scoping guard (`phaseNumber >= "10"`) is tested with `"10"` (eval checked, pass) and `"08"` (legacy skip). Dotted phases like `"10.1"` or `"10.10"` are not exercised. Lexical compare handles these correctly (`"10.1" >= "10"` → true; `"10.10" >= "10"` → true), but the behavior is unverified. A 2-digit phase is the only valid shape (`PHASE_NUMBER_RE`), so this is a minor coverage gap, not a correctness risk.

**Fix:** Add a test with `phaseNumber: "10.1"` seeded with passing eval evidence + prior evidence, asserting ship evidence is written (guard fires, eval consumed).

### IN-03: Redundant double-parse of argv in `eval.ts` CLI shim

**File:** `src/cli/commands/eval.ts:11-26`
**Issue:** The shim parses `rest` via `parseArgs` to extract `positionals` + `values.json`, then reconstructs `argv = [positionals[0], ...(--json ? ["--json"] : [])]` and passes it to `runDirect`, which calls `parseArgs` again on the rebuilt argv. The double-parse works correctly (verified all input shapes: `--json` before/after positional, missing positional, extra positional) but is maintenance overhead — the shim and `runDirect` both own parseArgs options. If `runDirect` ever adds a new flag, the shim must be updated in lockstep. The simpler design would be `runDirect(rest)` directly (runDirect already parses argv), making the shim a pure delegation. Not a bug; a minor simplification opportunity.

**Fix:** Either delegate `rest` directly to `runDirect` (drop the shim's parseArgs), or have `runDirect` accept pre-parsed `{ phaseNumber, json }` and have both the shim and direct runner parse once.

---

_Reviewed: 2026-07-08T00:41:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_