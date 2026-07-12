---
phase: 18-verify-ship-wire-consumer-docs
reviewed: 2026-07-12T17:46:31Z
depth: deep
files_reviewed: 15
files_reviewed_list:
  - .gsd/capabilities/aidlc-governance/capability.json
  - README.md
  - docs/governance-workflow.md
  - docs/java-spring-coverage.md
  - docs/onboarding.md
  - src/governance/config.ts
  - src/governance/config.test.ts
  - src/governance/discuss-hook.ts
  - src/governance/discuss-hook.test.ts
  - src/governance/plan-hook.ts
  - src/governance/plan-hook.test.ts
  - src/governance/verify-gate-hook.ts
  - src/governance/verify-gate-hook.test.ts
  - src/governance/ship-gate-hook.test.ts
  - src/governance/phase-18-contract.test.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-07-12T17:46:31Z
**Depth:** deep
**Files Reviewed:** 15
**Status:** issues_found
**Diff base:** `e070111^`..`15fcfe1` (master Phase 18 commits; worktree lacked files — reviewed via `git show master:…`)

## Summary

Phase 18 wires config domains into discuss/plan, forces `coverage-report` when binding rule is selected, and documents consumer setup. Unit routing and config parsing tests are solid. Fail-closed path for empty report path and adapter-name bypass is correct.

Core product claim fails under real GSD phase numbers: `phaseFromNumber` maps any phase ≥5 to `operations`, so construction-only binding rule `java-spring-unit-line-coverage` never enters selection-state for this repo (`current_phase: 18`) or any consumer past phase 4. Verify then keeps `generic-exit-ci` (always-pass stub). Plan does not refresh selection-state, so even correct plan-time selection cannot feed verify.

## Critical Issues

### CR-01: phaseFromNumber maps GSD phases ≥5 to operations — binding rule never selected in real use

**File:** `src/governance/discuss-hook.ts:78-87` (used by `plan-hook.ts:127`)
**Issue:** Binding rule frontmatter is `phases: [construction]` only. Hook phase resolution:

```ts
if (n === 1) return "inception";
if (n >= 2 && n <= 4) return "construction";
return "operations";
```

This repo’s `.planning/STATE.md` has `current_phase: 18` → `operations` → rule skipped `out-of-phase` → `selection-state.json` never contains `java-spring-unit-line-coverage` → `verifyGateHook` takes the non-binding branch and defaults to `generic-exit-ci` (pass). Consumer following `docs/java-spring-coverage.md` with correct domains + report path still gets no coverage gate after phase 4. Phase 18’s stated purpose (JAVA-DOC-01 runtime: config drives real adapter, not always-pass stub) is defeated for every multi-phase GSD project, including this one.

Tests only lock phase `2 → construction` and `5 → operations`; they never assert that later construction work (phases 6–18+) can select construction rules. Docs say “construction task” without stating only GSD phases 2–4 map to AI-DLC construction.

**Fix:** Map AI-DLC phase from roadmap/state semantics that allow many GSD construction phases, e.g. explicit phase-type field, or treat all non-1 non-ops milestones as construction until an operations marker exists. Minimum:

```ts
// Until STATE carries an AI-DLC phase enum, prefer construction for active build phases.
// Do NOT hard-cap construction at GSD phase 4.
export function phaseFromNumber(n: number): Phase {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(
      `malformed STATE.md: current_phase ${JSON.stringify(n)} is not a positive integer`,
    );
  }
  if (n === 1) return "inception";
  // Option A: explicit ops threshold from config; Option B: inception only at 1, rest construction
  // until project declares operations. Pick one and document it.
  return "construction";
}
```

Add regression: STATE `current_phase: 18` + domains `java-spring` + path `src/main/java/...` → selected includes `java-spring-unit-line-coverage`. Update docs with the mapping contract.

### CR-02: planHook never writes selection-state; verify only reads discuss selection

**File:** `src/governance/plan-hook.ts:187-229` vs `src/governance/verify-gate-hook.ts:67-76` vs `src/governance/discuss-hook.ts:210`
**Issue:** D-05 binds coverage routing to **persisted** selection state. Only `discussHook` calls `writeSelection`. `planHook` now reads config domains and may select the binding rule into plan gate evidence, but does not update `.planning/governance/selection-state.json`. `verifyGateHook` ignores plan evidence and only inspects discuss-era selection.

Sequence that breaks binding even if CR-01 were fixed:

1. Discuss with docs/test signal or missing domains → no binding in selection-state.
2. Plan with Java paths + config domains → binding selected in `{NN}-plan.json` only.
3. Verify → no binding in selection-state → `generic-exit-ci` pass.
4. Ship → verify pass → release without coverage.

Phase 18 wired domains into both hooks but left the only verify-facing store discuss-only. No Phase 18 test covers discuss→state→verify with a real select of the binding rule (tests hand-seed `bindingRecord()` into the store).

**Fix:** Either (preferred) have plan re-run selection and `writeSelection` when planner signal is authoritative, or document+enforce that discuss must re-run with final Java paths before verify, and add an integration test:

```ts
// discuss with java-spring config + construction phase + java prod path
// assert readSelection(...).selectionResult.selected has binding id
// verifyGateHook → evaluatedBy === "coverage-report"
```

If discuss remains sole writer, plan must not be presented as a domain-subscription path for verify routing.

## Warnings

### WR-01: No end-to-end selection→verify binding test

**File:** `src/governance/verify-gate-hook.test.ts:241-470`, `discuss-hook.test.ts` (Phase 18 block), `plan-hook.test.ts` (Phase 18 block)
**Issue:** Coverage routing tests seed `selectionResult.selected` with the binding id manually. Discuss/plan Phase 18 tests only assert domain string presence / a fixture domain rule, never `java-spring-unit-line-coverage` from the real rule pack. Combined with CR-01/CR-02, green unit tests can ship a non-binding runtime.

**Fix:** One integration test: real index (or fixture copy of binding rule frontmatter), config domains, STATE phase that maps to construction, Java prod path signal → discussHook → verifyGateHook with report fixture → `evaluatedBy === "coverage-report"`.

### WR-02: Docs omit phase-number → AI-DLC phase mapping that gates the binding rule

**File:** `docs/java-spring-coverage.md` (selection section), `docs/onboarding.md` (~149)
**Issue:** Guide requires “a construction task” and domains/path excludes, but never states that construction is only `current_phase` ∈ {2,3,4} under `phaseFromNumber`. Consumers will assume GSD “construction work” at phase 12 qualifies. Onboarding links the guide without the mapping hazard.

**Fix:** Document exact mapping and selection prerequisites (phase enum, domains, path globs, exclude taskTypes). After CR-01 fix, document the new contract.

### WR-03: planHook domain test contains always-true assertion

**File:** `src/governance/plan-hook.test.ts` (~297-300)
**Issue:**

```ts
assert.ok(
  selectedIds.includes("java-spring-domain-rule") ||
    result.evidence.request.rules.length >= 0,
  "planHook with config domains should run",
);
```

`rules.length >= 0` is always true. Dead branch hides a failed domain selection if the stronger assert below were removed or weakened.

**Fix:** Delete the tautology; keep only the strong includes assert.

### WR-04: verify skill does not fail verify:post on coverage status fail (exit 0)

**File:** `src/governance/verify-gate-hook.ts:130-143`, `.claude/skills/aidlc-governance-verify/SKILL.md:64-65`
**Issue:** On coverage fail, hook writes `status: "fail"` evidence and returns; `runDirect` exits 0. Skill step 6 only fails on non-zero process exit. Design D-08 says ship blocks on durable fail evidence (ship regression covers this). Still: verify:post can report success while binding coverage failed, relying entirely on later ship. Operators watching verify alone get a false green.

**Fix (choose one and document):**

```ts
// After writeGateEvidence, fail the process when overall result is fail:
if (result.status === "fail") {
  process.exitCode = 1;
}
```

Or skill step: parse stdout/evidence JSON and halt on `result.status === "fail"`. Prefer process exit so automation cannot miss it.

## Info

### IN-01: config reader trust boundary is sound

**File:** `src/governance/config.ts:37-100`
**Issue:** None material. Missing file/key → empty defaults; wrong types/malformed JSON → throw; domains trim/dedupe; `coverage_report_path` not path-validated here (adapter owns path trust — matches D-03). Tests cover the contract.

**Fix:** n/a

### IN-02: Adapter bypass rejection and empty path fail evidence match D-05/D-06

**File:** `src/governance/verify-gate-hook.ts:74-105`
**Issue:** Non-coverage `adapterName` with binding selected throws before evidence write. Empty `coverage_report_path` builds real adapter → durable fail. Injected map without `coverage-report` falls back to factory. Ship regression asserts fail evidence blocks ship. Good.

**Fix:** n/a

### IN-03: Capability schema + docs links locked by phase-18-contract tests

**File:** `src/governance/phase-18-contract.test.ts`, `.gsd/capabilities/aidlc-governance/capability.json:37-46`
**Issue:** Additive string keys `governance.domains` / `governance.coverage_report_path` present; README/onboarding/workflow link guide. Canary tests are string-includes only (no runtime). Acceptable for D-15.

**Fix:** Optional: assert capability `onError: "halt"` remains on verify/ship steps.

---

## Cross-file notes (deep)

| Path | Role in Phase 18 |
| --- | --- |
| `discuss-hook` → `writeSelection` | Sole selection-state writer; phase + domains feed select |
| `plan-hook` → `writeGateEvidence` only | Domains affect plan evidence, not verify routing |
| `verify-gate-hook` → `readSelection` + optional `createCoverageAdapter` | Binding id forces real adapter |
| `coverage-report.ts` (Phase 17) | Path escape/symlink/size/threshold; finding id matches rule token |
| `ship-gate-hook` (unchanged) | `assertNonBlocking(verify)` — sufficient if verify evidence is real fail |

---

_Reviewed: 2026-07-12T17:46:31Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Note: Worktree lacked Phase 18 sources; reviewed master blobs at `e070111^..15fcfe1`. Temp extract under `.review-p18/` (not committed)._
