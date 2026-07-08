---
phase: 10-selection-quality-harness
verified: 2026-07-08T00:55:00Z
status: passed
score: 16/16 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 10: Selection-Quality Harness Verification Report

**Phase Goal:** A standing recall/precision harness exercises the selection engine against the labeled eval set and reports under-injection (critical recall) and over-injection (precision) as a repeatable, auditable check that validates the whole governance pipeline.
**Verified:** 2026-07-08T00:55:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | `node dist/select/eval-cli.js <NN>` persists `.planning/governance/eval/{NN}.json` + `{NN}-report.md` (D-09) | VERIFIED | Ran `node dist/select/eval-cli.js 10` from repo root; exit 0; both files written; `evalEvidencePath`/`evalReportPath` in `paths.ts:99-116` route through governance dir |
| 2   | Harness calls `runCases(index, cases)` + `aggregate(index, results)` from `eval-harness.ts`; pure layer NOT modified (D-16) | VERIFIED | `eval-cli.ts:32` imports `runCases, aggregate, type EvalCase` from `./eval-harness.js`; `runEval` calls them at lines 104-105; no re-derivation |
| 3   | criticalRecall < 1.0 → exit 2 + persisted report with criticalMisses populated (D-05 producer) | VERIFIED | Test `D-05 critical-recall miss → exit 2 + persisted failed report (D-08)` (eval-cli.test.ts:365) spawns runner via spawnSync, asserts `child.status === 2`, `criticalMisses.length > 0`, persisted JSON reloads with criticalRecall < 1.0 |
| 4   | Precision reported in `precisionOffenders`, never gates exit code (D-06) | VERIFIED | Test `precision offender reported but not blocked — criticalRecall stays 1.0` (eval-cli.test.ts:291); `eval-cli.ts:144-147` populates offenders; exit code branch (lines 302-306) keys only off `recallBySeverity.critical` |
| 5   | Same corpus + index → byte-identical report modulo capturedAt; corpusHash pinned (D-14) | VERIFIED | Test `determinism` (eval-cli.test.ts:309) byte-compares two runs with capturedAt stripped; cases sorted by name at eval-cli.ts:102 before runCases; corpusHash = sha256 over canonicalized sorted cases (lines 162-164). My own run: two consecutive invocations diff-clean modulo `Captured:` line |
| 6   | Malformed EvalReport rejected by Ajv 2020 + x-binding; validate-before-write (D-11) | VERIFIED | `eval-evidence.ts:77-80` instantiates `Ajv2020` + `addFormats` + `addKeyword x-binding` before compile; `writeEvalEvidence` calls `assertEvalEvidence` BEFORE `atomicWriteFile` (lines 168-170); 20 tests in `validate-eval-report.test.js` pass (reject missing fields, unknown keys, bad severity enum, criticalRecall out of range, NaN/Infinity post-Ajv) |
| 7   | Index built from `test/fixtures/eval/eval-rules/` via buildIndex; corpus from `test/fixtures/eval/cases/eval-cases.json` (D-02) | VERIFIED | `eval-cli.ts:49-58` `defaultIndexLoader`/`defaultCasesLoader` resolve those exact paths; 12 cases loaded + run in production invocation above |
| 8   | New module `src/select/eval-cli.ts` + new shim `src/cli/commands/eval.ts`; pure `eval-harness.ts` unchanged (D-04) | VERIFIED | Both files exist; `eval-harness.ts` is imported only (no modification); shim delegates via `runDirect(argv)` |
| 9   | CLI registered as `governance eval <phaseNumber> [--json]`; `npm run eval` script added (D-01, D-13) | VERIFIED | `cli/index.ts:25-26` `case "eval"`; usage line at index.ts:36; `package.json` scripts block: `"eval": "node dist/select/eval-cli.js"` |
| 10  | Exit codes: 0 pass, 2 critical-recall regression, 3 parse/load error — `process.exitCode` only (D-08) | VERIFIED | `eval-cli.ts:302-306` sets `exitCode = 2` or `0`; `eval-cli.ts:321-326` direct-runner catch sets `exitCode = 3`; no `process.exit()` call; CLI shim `eval.ts:29-34` wraps `runDirect` in try/catch → exit 3 (WR-01 fix); test `WR-01: governance eval shim returns exit 3 on parse/load error` passes |
| 11  | shipGateHook calls readEvalOrFail BEFORE writing ship evidence; missing eval evidence → throws (D-07, GATE-05) | VERIFIED | `ship-gate-hook.ts:208-211` guard `if (args.phaseNumber >= "10")` runs `readEvalOrFail` + `assertNoFailedEval` BEFORE `writeGateEvidence` at line 236; test `shipGateHook fails closed when eval evidence is missing for phase >= 10` passes with `missing eval evidence` message |
| 12  | shipGateHook calls assertNoFailedEval; criticalRecall < 1.0 → throws (D-05 ship boundary) | VERIFIED | `ship-gate-hook.ts:178-187` `assertNoFailedEval` throws `ship gate: eval evidence failed - criticalRecall=<n> (<case misses>)`; test `shipGateHook fails closed when eval evidence has criticalRecall < 1.0` passes |
| 13  | Forward-scoping guard: phaseNumber < "10" skips eval check (RESEARCH Open Q2) | VERIFIED | `ship-gate-hook.ts:208` `if (args.phaseNumber >= "10")` — string compare safe under PHASE_NUMBER_RE 2-digit padding; tests `skips eval check for legacy phases` (phase "08") + `IN-02: forward-scoping guard fires for dotted phase number '10.1'` both pass |
| 14  | `aidlc-governance-verify` SKILL.md step 5 runs `node dist/select/eval-cli.js <phaseNumber>` AFTER capture-test-evidence, BEFORE audit (D-13) | VERIFIED | SKILL.md: step 4 = capture-test-evidence, step 5 = eval harness invocation with exact command, step 6 = propagate failures; audit skill is invoked externally after this skill completes |
| 15  | Passing eval evidence (criticalRecall===1.0) does not block; ship evidence written | VERIFIED | Test `shipGateHook proceeds when eval evidence passes (criticalRecall===1.0) and approval approved` asserts no throw + ship evidence file exists |
| 16  | No ship evidence written on any blocking condition (fail-closed ordering) | VERIFIED | Tests for missing-eval + failed-eval both assert `existsSync(gateEvidencePath(..., "ship")) === false`; guard + assertions run before `writeGateEvidence` call |

**Score:** 16/16 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `src/select/eval-cli.ts` | VERIFIED | 327 lines; producer + I/O + renderMarkdown + runDirect; imports runCases/aggregate (D-16); exit codes via process.exitCode only |
| `src/governance/eval-evidence.ts` | VERIFIED | 218 lines; EvalReport/CriticalMiss/PrecisionOffender types; inline `validateEvalReport` (Ajv 2020 + x-binding); 4-rung read ladder (readEvalEvidence/writeEvalEvidence/writeEvalReportMarkdown) |
| `src/schema/eval-report.schema.json` | VERIFIED | Draft 2020-12; `additionalProperties:false`; required fields: phase/capturedAt/aggregate/cases/criticalMisses/precisionOffenders/corpusHash; `x-binding:"binding"` root keyword; severity enum closed |
| `src/cli/commands/eval.ts` | VERIFIED | 35 lines; parseArgs shim → delegates to `eval-cli.runDirect`; try/catch → exit 3 (WR-01) |
| `src/cli/commands/eval.test.ts` | VERIFIED | WR-01 exit-3 coverage test passes |
| `src/select/eval-cli.test.ts` | VERIFIED | 10 cases including D-05 exit-2 + determinism + --json |
| `src/enforcement/validate-eval-report.test.ts` | VERIFIED | 20 cases (missing fields, unknown keys, bad enum, criticalRecall range, NaN/Infinity) |
| `src/governance/ship-gate-hook.ts` (modified) | VERIFIED | +readEvalOrFail +assertNoFailedEval +forward-scoping guard; inserted before writeGateEvidence |
| `src/governance/ship-gate-hook.test.ts` (extended) | VERIFIED | 4 new eval cases + IN-02 dotted phase; all 19 tests pass |
| `.claude/skills/aidlc-governance-verify/SKILL.md` (modified) | VERIFIED | Step 5 inserted; step 6 renumbered |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| eval-cli.runEval | eval-harness.runCases/aggregate | direct import + call | WIRED | `eval-cli.ts:32,104-105` |
| eval-cli.runDirect | writeEvalEvidence + writeEvalReportMarkdown | direct call before exit-code decision | WIRED | `eval-cli.ts:281-282` |
| eval-evidence.validateEvalReport | ajv.compile(eval-report.schema.json) | schema imported + compiled at module load | WIRED | `eval-evidence.ts:29,77-80` |
| shipGateHook | readEvalEvidence (Plan 01) | import + call inside guard | WIRED | `ship-gate-hook.ts:14-16,208-211` |
| shipGateHook | assertNoFailedEval | inline call | WIRED | `ship-gate-hook.ts:210` |
| aidlc-governance-verify SKILL.md | dist/select/eval-cli.js | bash invocation in step 5 | WIRED | SKILL.md:51-53 |
| cli/index.ts switch | cli/commands/eval.ts run() | dynamic import case | WIRED | `cli/index.ts:25-26` |
| npm run eval | dist/select/eval-cli.js | package.json scripts.eval | WIRED | `package.json` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| eval-cli.runEval | `results` (CaseResult[]) | `runCases(index, sorted)` over 12 fixture cases | Yes — 12 rows with TP/FP/FN counts | FLOWING |
| eval-cli.runEval | `aggregateResult` | `aggregate(index, results)` | Yes — microRecall=1.0, microPrecision=1.0, per-severity all 1.0 | FLOWING |
| eval-cli.runEval | `corpusHash` | sha256 over canonicalized sorted cases JSON | Yes — `b3c83e8d...` (64-char hex) | FLOWING |
| shipGateHook | `evalReport.criticalRecall` | readEvalEvidence → persisted `aggregate.recallBySeverity.critical` | Yes — read from disk, re-validated on read | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Harness produces report, exits 0, criticalRecall=1.0 | `node dist/select/eval-cli.js 10` | exit 0; JSON + markdown persisted; 12 cases; criticalRecall=1.0; microPrecision=1.0 | PASS |
| Determinism (byte-identical modulo capturedAt) | two consecutive runs, diff stripped of `Captured:` | no diff | PASS |
| `--json` stdout is parseable JSON | `node dist/select/eval-cli.js 10 --json` \| JSON.parse | parses; phase=10, cases=12 | PASS |
| `governance eval` CLI shim works | `node dist/cli/index.js eval 10` | exit 0; markdown emitted | PASS |
| Exit-2 path on critical miss | spawnSync in test D-05 | child.status === 2; failed report persisted with criticalMisses non-empty | PASS |
| Ship gate blocks on failed eval | test failed-eval-fails-closed | throws `ship gate: eval evidence failed - criticalRecall=0.5` | PASS |
| Ship gate skips eval check for legacy phases | test legacy-phase-skips phase "08" | no throw; ship evidence written | PASS |
| Full test suite | `npm test` | 417 tests, 414 pass, 0 fail, 3 skipped | PASS |
| Build succeeds, emits dist/select/eval-cli.js | `npm run build` | exit 0; dist artifacts present | PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| eval-cli harness | `node dist/select/eval-cli.js 10` | exit 0, full report written | PASS |
| ship-gate-hook tests | `node --test dist-test/governance/ship-gate-hook.test.js` | 19/19 pass | PASS |
| validate-eval-report tests | `node --test dist-test/enforcement/validate-eval-report.test.js` | 20/20 pass | PASS |
| eval-cli tests | `node --test dist-test/select/eval-cli.test.js` | 10/10 pass | PASS |
| CLI shim test | `node --test dist-test/cli/commands/eval.test.js` | 1/1 pass (WR-01 exit-3) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| SEL-06 | 10-01, 10-02 | A standing recall/precision harness exercises the selection engine against the labeled eval set and reports under-injection (critical recall) and over-injection (precision) as a repeatable, auditable check | SATISFIED | eval-cli.ts producer + eval-evidence.ts store + ship-gate-hook consumer + SKILL.md verify:post step; 12-case labeled corpus; report persisted under `.planning/governance/eval/`; blocks ship on criticalRecall < 1.0 |

No orphaned requirements — REQUIREMENTS.md maps only SEL-06 to Phase 10; both plans claim it.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | - | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers in phase-modified production files | - | - |
| (none) | - | No `return null` / `=> {}` / `console.log` stub patterns in eval-cli.ts / eval-evidence.ts / ship-gate-hook.ts | - | - |

### Deferred Review Findings (non-blocking)

| ID | Description | Disposition | Why non-blocking |
| -- | ----------- | ----------- | ---------------- |
| IN-01 | `CriticalMiss.severity` union allows all 4 severities but producer only emits `"critical"` | Deferred — contract decision | Forward-compat path: schema + TS interface permissive; producer strictly emits `"critical"`; widening the union does not corrupt data or weaken the D-05 floor. Reviewer explicitly notes "both options are valid design choices." |
| IN-03 | Redundant double-parse of argv in `eval.ts` CLI shim | Deferred — refactor with behavior implications | Shim parses `rest`, reconstructs argv, runDirect re-parses. Works correctly today (verified by tests). Simplification would shift usage-error exit code/message — defensible but not trivially safe. Reviewer labels "Not a bug; minor simplification." |

Both deferred in `10-REVIEW-FIX.md` with explicit rationale. INFO-severity, neither weakens the harness goal or the D-05 ship-blocking invariant.

### Gaps Summary

No gaps. All 16 must-have truths verified with behavioral evidence (tests + production runs). All artifacts exist, are substantive, are wired, and have real data flowing. All key links connected. SEL-06 fully satisfied. Both deferred review findings are INFO-severity design/refactor opportunities with documented rationale — not must-have failures.

---

_Verified: 2026-07-08T00:55:00Z_
_Verifier: Claude (gsd-verifier)_
