---
phase: 10-selection-quality-harness
plan: 01
subsystem: selection-quality-harness
tags: [selection, eval, recall, precision, cli, durable-state, schema]
dependency_graph:
  requires:
    - src/select/eval-harness.ts (runCases/aggregate/EvalCase/Aggregate — pure layer, unchanged)
    - src/index/build.ts (buildIndex — eval corpus index)
    - src/governance/atomic-write.ts (atomicWriteFile — TD-03)
    - src/governance/paths.ts (PHASE_NUMBER_RE, governanceDir — extended)
    - ajv@8.20.0 (Ajv 2020 + x-binding keyword — 7th validator instance)
  provides:
    - src/select/eval-cli.ts (runEval, renderMarkdown, runDirect, loadCases)
    - src/governance/eval-evidence.ts (EvalReport type, validateEvalReport, writeEvalEvidence, readEvalEvidence, writeEvalReportMarkdown)
    - src/schema/eval-report.schema.json (draft 2020-12 + x-binding, closed object)
    - src/governance/paths.ts evalEvidencePath + evalReportPath
    - 'governance eval <phaseNumber> [--json]' CLI command
    - 'npm run eval' script
  affects:
    - .planning/governance/eval/{NN}.json + {NN}-report.md (new durable-state dir, gitignored)
    - src/cli/index.ts (new 'eval' case + usage line)
    - package.json (eval script)
    - .gitignore (.planning/governance/ now ignored)
tech_stack:
  added: []
  patterns:
    - 4-rung loud-fail read ladder (clone of test-evidence.ts)
    - inline Ajv 2020 validator + x-binding keyword (7th instance — crash-isolation by duplication)
    - producer/CLI isDirectRun + runDirect + process.exitCode (clone of capture-test-evidence.ts)
    - atomicWriteFile validate-before-write (TD-03)
key_files:
  created:
    - src/select/eval-cli.ts
    - src/governance/eval-evidence.ts
    - src/schema/eval-report.schema.json
    - src/cli/commands/eval.ts
    - src/select/eval-cli.test.ts
    - src/enforcement/validate-eval-report.test.ts
  modified:
    - src/governance/paths.ts
    - src/cli/index.ts
    - package.json
    - .gitignore
decisions:
  - D-02 reconciled: buildIndex("test/fixtures/eval/eval-rules") (recall.test.ts idiom); corpusHash pins the corpus, not the built index
  - D-05 criticalRecall===1.0 floor enforced via process.exitCode=2 AFTER persistence (failed evidence still lands on disk)
  - D-06 precision reported in precisionOffenders, NEVER gates exit code
  - D-14 determinism: cases sorted by name before runCases; sha256 corpusHash over canonicalized cases JSON
  - D-08 exit codes: 0 pass, 2 critical-recall regression, 3 parse/load error; process.exitCode only (never process.exit)
  - Inline validateEvalReport in eval-evidence.ts (matches test-evidence.ts one-consumer rule, not a sibling validate-eval-report.ts)
  - Status lines to stderr so --json stdout is pure JSON (machine-parseable)
metrics:
  duration: ~9 min
  completed: 2026-07-08
  tasks: 3
  files: 10 (6 created, 4 modified)
  tests: 28 new (eval-cli: 10, validate-eval-report: 18)
  commits: 2 (RED + GREEN; REFACTOR intentional no-op)
requirements-completed: [SEL-06]
status: complete
---

# Phase 10 Plan 01: Standing Eval Harness Producer Summary

Wrapped the existing pure `eval-harness.ts` measurement layer (`runCases`/`aggregate` — D-16: no re-derivation of selection math) into a standing recall/precision harness: CLI producer + durable evidence store + draft-2020-12 schema + `governance eval` CLI command + `npm run eval` script. The D-05 `criticalRecall === 1.0` floor makes critical-rule drops loud (exit 2) AND persisted as ship-blocking evidence.

## Tasks Completed

| Task | Name | Commit | Key Files |
| ---- | ---- | ------ | --------- |
| 1 | RED — schema skeleton + failing tests | `5b583e6` | `src/schema/eval-report.schema.json`, `src/select/eval-cli.test.ts`, `src/enforcement/validate-eval-report.test.ts` |
| 2 | GREEN — implement producer + store + CLI + registration | `c3e2c9b` | `src/governance/eval-evidence.ts`, `src/select/eval-cli.ts`, `src/cli/commands/eval.ts`, `src/governance/paths.ts`, `src/cli/index.ts`, `package.json`, `.gitignore` |
| 3 | REFACTOR — intentional no-op | (no commit) | — |

## Verification Results

- `npm test`: **411 tests, 408 pass, 0 fail, 3 skipped** (pre-existing skips unchanged).
- `npm run build`: succeeds; `dist/select/eval-cli.js` emitted.
- `node dist/select/eval-cli.js 10` from repo root: exits **0**, persists `.planning/governance/eval/10.json` + `10-report.md`, all 12 eval cases pass, criticalRecall=1.0, microPrecision=1.0.
- `node dist/select/eval-cli.js 10 --json`: emits valid JSON to stdout (parses without error).
- `git diff package.json`: ONLY the `scripts.eval` line added (zero new runtime deps).
- `git diff .gitignore`: `.planning/governance/` added (generated durable state ignored).

## Decisions Made

- **Inline validator home:** `validateEvalReport` lives inline in `src/governance/eval-evidence.ts` (matches `test-evidence.ts` one-consumer rule, not a sibling `validate-eval-report.ts`). Documented in the test file header.
- **Status lines to stderr:** `eval-cli: persisted <path>` lines go to stderr so `--json` stdout is pure machine-parseable JSON (D-03). Default markdown mode also unaffected.
- **Post-Ajv `Number.isFinite` is defense-in-depth:** Ajv 2020 draft 2020-12 already rejects NaN/Infinity at the schema level (`type:number` requires finite JSON). The inline `Number.isFinite` check is belt-and-suspenders for a future schema loosening or alternate code path — both barriers tested.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `runDirect` not exported for CLI shim**
- **Found during:** Task 2 (GREEN)
- **Issue:** `src/cli/commands/eval.ts` imports `runDirect` from `eval-cli.ts`, but the plan's template (`capture-test-evidence.ts`) keeps `runDirect` module-local. The CLI shim needs to delegate to it.
- **Fix:** Exported `runDirect` from `eval-cli.ts` (added `export` keyword). The `isDirectRun` self-invocation guard still works (only fires when `__filename === process.argv[1]`), so the export does not change the self-invocation semantics.
- **Files modified:** `src/select/eval-cli.ts`
- **Commit:** `c3e2c9b`

**2. [Rule 1 - Bug] `--json` stdout polluted by status lines**
- **Found during:** Task 2 (GREEN — first test run)
- **Issue:** `eval-cli: persisted <path>` lines were written to stdout, breaking `JSON.parse(stdout)` in the `--json` test.
- **Fix:** Moved the two status lines to `process.stderr`. stdout is now clean for both `--json` (machine-parseable) and default markdown (human-readable).
- **Files modified:** `src/select/eval-cli.ts`
- **Commit:** `c3e2c9b`

**3. [Rule 1 - Bug] Test expected "corpusHash" literal but markdown emits "Corpus hash"**
- **Found during:** Task 2 (GREEN — first test run)
- **Issue:** The `renderMarkdown` test asserted `assert.match(md, /corpusHash/i)` but the markdown section header is "Corpus hash" (natural English). The camelCase token never appears.
- **Fix:** Changed the test regex to `/corpus hash/i` (matches the actual section header). The hash VALUE is still asserted via `md.includes(report.corpusHash.slice(0, 12))`.
- **Files modified:** `src/select/eval-cli.test.ts`
- **Commit:** `c3e2c9b`

**4. [Rule 2 - Missing critical functionality] Generated governance evidence untracked**
- **Found during:** Task 2 (GREEN — post-commit check)
- **Issue:** `.planning/governance/eval/` (new durable-state dir) appeared as untracked `??` in `git status`. Per task commit protocol: generated runtime output must be gitignored, never left untracked.
- **Fix:** Added `.planning/governance/` to `.gitignore`. Covers gates/tests/approvals/eval — all generated governance durable state (none were tracked before; the dir was empty until this plan).
- **Files modified:** `.gitignore`
- **Commit:** `c3e2c9b`

## TDD Gate Compliance

- RED gate: `test(10-01): RED — eval harness tests + schema skeleton` (`5b583e6`) — 3 files, tests failed at import (modules absent).
- GREEN gate: `feat(10-01): GREEN — eval harness producer + store + CLI` (`c3e2c9b`) — all RED tests pass.
- REFACTOR gate: intentional no-op (09-01 decision — `formatErrors` duplication across 7 validators + 4-rung ladder duplication across stores are deliberate crash-isolation; no shared module extracted).

## Known Stubs

None. All producer-side functionality is wired: `runEval` calls `runCases`/`aggregate` (pure layer, unchanged), `runDirect` persists evidence + markdown, CLI registered, npm script added.

## Threat Flags

None. All threats in the plan's `<threat_model>` are mitigated:
- T-10-01 (tampering): `validateEvalReport` re-validates on every read (rung 4) + cross-phase `record.phase !== phaseNumber` guard.
- T-10-02 (path traversal): `PHASE_NUMBER_RE` in `evalEvidencePath`/`evalReportPath` rejects `..`/absolute.
- T-10-03 (spoofed criticalRecall): post-Ajv `Number.isFinite` + schema `type:number` (both reject NaN/Infinity); severity re-sourced from index inside `aggregate`.
- T-10-04 (stale corpus): `corpusHash` (sha256 over canonicalized cases JSON) pinned in report.
- T-10-05 (DoS truncation): `process.exitCode = N` only, never `process.exit()`.
- T-10-06 (concurrent writer): `atomicWriteFile` unique `.<pid>-<uuid>.tmp` suffix.
- T-10-07 (silent critical drop): D-05 exit 2 + persisted failed report; Plan 02 wires ship-gate block (defense-in-depth).

No new security-relevant surface introduced beyond the plan's threat model.

## Self-Check: PASSED

- FOUND: `src/select/eval-cli.ts`
- FOUND: `src/governance/eval-evidence.ts`
- FOUND: `src/schema/eval-report.schema.json`
- FOUND: `src/cli/commands/eval.ts`
- FOUND: `src/select/eval-cli.test.ts`
- FOUND: `src/enforcement/validate-eval-report.test.ts`
- FOUND: `5b583e6` (RED commit)
- FOUND: `c3e2c9b` (GREEN commit)