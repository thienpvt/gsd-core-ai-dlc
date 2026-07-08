---
phase: 10-selection-quality-harness
fixed_at: 2026-07-08T01:12:00Z
review_path: .planning/phases/10-selection-quality-harness/10-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 4
skipped: 2
status: partial
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-07-08T01:12:00Z
**Source review:** `.planning/phases/10-selection-quality-harness/10-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (3 warnings + 3 info; fix_scope=critical_warning includes all 6 per task brief — Info assessed individually)
- Fixed: 4 (WR-01, WR-02, WR-03, IN-02)
- Skipped/Deferred: 2 (IN-01, IN-03)

All fixes verified against full test suite: **414 pass, 0 fail, 3 skipped** (was 412 pass before fixes; +2 new tests added: WR-01 shim exit-3 test, IN-02 dotted-phase test).

## Fixed Issues

### WR-01: CLI shim `governance eval` returns exit 1 (not documented exit 3) on parse/load errors

**Files modified:** `src/cli/commands/eval.ts`, `src/cli/commands/eval.test.ts` (new)
**Commit:** `76e6469`
**Applied fix:** Wrapped the shim's `runDirect(argv)` call in try/catch. On any throw (parse/load/usage error), write the error to stderr prefixed with `eval:` and set `process.exitCode = 3` (D-08 contract). `runDirect` sets `process.exitCode = 2` directly for critical-recall regression WITHOUT throwing, so the catch never masks a regression — exit 2 is preserved. Added `src/cli/commands/eval.test.ts` spawning `node dist/cli/index.js eval 10` against a temp root with a valid rules dir + malformed `eval-cases.json`, asserting exit status === 3 and stderr contains `eval:`.

### WR-02: `runDirect` hardcodes governance path layout in stderr status messages instead of using `paths.ts` helpers

**Files modified:** `src/select/eval-cli.ts`
**Commit:** `fc1f0d9`
**Applied fix:** Replaced the inline `path.join(projectRoot, ".planning", "governance", "eval", ...)` reconstructions at the persist-status block with calls to `evalEvidencePath(projectRoot, phaseNumber)` and `evalReportPath(projectRoot, phaseNumber)`. Added `evalEvidencePath`/`evalReportPath` to the existing `../governance/paths.js` import. `writeEvalEvidence`/`writeEvalReportMarkdown` already call these helpers internally, so by the time the status lines execute the phase number has already been validated — the helper calls here are redundant validation but no behavior change for valid inputs (and invalid inputs threw earlier).

### WR-03: `process.exitCode` never reset to 0 on pass — latent footgun for in-process loop reuse

**Files modified:** `src/select/eval-cli.ts`
**Commit:** `d31a0fc`
**Applied fix:** Added `else { process.exitCode = 0; }` branch to the exit-code decision in `runDirect`. On pass (criticalRecall === 1.0), `process.exitCode` is now explicitly reset to 0 so a prior exit 2/3 from an earlier run in the same process cannot leak. Defensive fix — today no caller invokes `runDirect` more than once per process, but this protects future in-process loop reuse (e.g., a batch harness running eval across phases).

### IN-02: Forward-scoping guard untested with dotted phase numbers (e.g. "10.1")

**Files modified:** `src/governance/ship-gate-hook.test.ts`
**Commit:** `e783b19`
**Applied fix:** Added a test with `phaseNumber: "10.1"` seeded with passing eval evidence + prior plan/verify gate evidence + approval. Asserts `shipGateHook` writes ship evidence (forward-scoping guard `phaseNumber >= "10"` fires — `"10.1" >= "10"` is true lexically — and eval evidence is consumed). Confirms `PHASE_NUMBER_RE` (`^\d{2}(?:\.\d+)?$`) and the lexical compare handle dotted phases correctly. Trivial, zero-risk coverage gap.

## Skipped / Deferred Issues

### IN-01: `CriticalMiss.severity` union allows all four severities but producer only ever emits `"critical"`

**File:** `src/governance/eval-evidence.ts:43-47`, `src/schema/eval-report.schema.json:76`, `src/select/eval-cli.ts:134-141`
**Reason:** deferred — contract decision, not trivially safe.
**Original issue:** The `CriticalMiss` interface declares `severity: "critical" | "high" | "medium" | "low"` and the schema enum matches, but the producer only ever emits `severity: "critical"`. The wider union is deliberate forward-compat: the review itself notes "Either narrow the type to `"critical"` (matching the producer contract) or document that `criticalMisses` is reserved for critical-only misses and the severity field is forward-compat." Narrowing is a public schema/contract change that would remove the forward-compat path (e.g., if a future phase promotes high-severity misses to blocking). Not a bug — both options are valid design choices. Defer to a deliberate decision: if the team confirms `criticalMisses` will stay critical-only, narrow the type + schema enum in a follow-up; otherwise add a doc comment to the interface clarifying the reservation. Out of scope for an automated fix (would need to update the JSON schema enum, TS interface, and re-validate the schema test fixtures).

### IN-03: Redundant double-parse of argv in `eval.ts` CLI shim

**File:** `src/cli/commands/eval.ts:11-26`
**Reason:** deferred — refactor with behavior implications, not zero-risk.
**Original issue:** The shim parses `rest` via `parseArgs`, reconstructs `argv`, and passes it to `runDirect`, which calls `parseArgs` again. The double-parse works correctly but is maintenance overhead — if `runDirect` adds a new flag, the shim must be updated in lockstep. The simpler design is `runDirect(rest)` directly (runDirect already parses argv).
**Why deferred:** Dropping the shim's `parseArgs` changes observable behavior: (1) the usage error message changes from `"usage: governance eval..."` to runDirect's `"usage: node dist/select/eval-cli.js..."`; (2) with WR-01 applied, the shim's own usage throw currently propagates to `index.ts` → exit 1, but delegating directly would route it through the new try/catch → exit 3 (arguably more consistent, but a behavior change). Both shifts are defensible but not trivially safe. The review explicitly labels this "Not a bug; a minor simplification opportunity." Defer to a deliberate refactor that decides the exit code + message contract for usage errors.

---

_Fixed: 2026-07-08T01:12:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
