# Phase 10: Selection-Quality Harness - Research

**Researched:** 2026-07-08
**Domain:** Standing recall/precision harness wrapping existing pure `eval-harness.ts` + durable-state + ship-gate fail-closed integration
**Confidence:** HIGH

## Summary

Phase 10 is a **thin I/O wrapper** phase. The measurement math (`scoreCase`/`runCases`/`aggregate`) shipped pure in Phase 2 (`src/select/eval-harness.ts`) and is proven by `recall.test.ts` (the SEL-01 Core-Value gate). Phase 10 wraps it in (1) a CLI producer (`src/select/eval-cli.ts` + `src/cli/commands/eval.ts`), (2) a durable evidence store under `.planning/governance/eval/{NN}.json` + `{NN}-report.md`, (3) a draft-2020-12 schema + Ajv validator (`eval-report.schema.json` + `validate-eval-report.ts`), and (4) a fail-closed consumer in `ship-gate-hook.ts`. Every one of these patterns has a 1:1 template already shipped in Phase 8/9 — this is clone-and-modify work, not new architecture.

The load-bearing invariant is unchanged from Phase 2: **`criticalRecall === 1.0`** (D-05). The whole project's Core Value ("injects only the relevant rules") collapses if a critical rule is silently dropped; the harness exists to make that drop loud AND ship-blocking, persisting the evidence so a regression cannot pass `ship:pre`.

**Primary recommendation:** Single TDD plan (D-16). RED the harness fails to load/run/report. GREEN: `eval-cli.ts` (orchestrator + CLI main + `isDirectRun`) → `eval-report.schema.json` + `validate-eval-report.ts` (7th validate instance) → `eval-evidence-store.ts` (clone of `test-evidence.ts`) → `paths.ts` additions → `ship-gate-hook.ts` consumer → `cli/commands/eval.ts` + `cli/index.ts` registration → `aidlc-governance-verify` SKILL.md step insertion → `package.json` `eval` script. REFACTOR: extract shared formatErrors only if surface area warrants (recall the 09-01 decision: duplication across validators is intentional — one crash doesn't take down siblings).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Invocation & CLI:**
- **D-01:** New CLI command `governance eval` — joins existing `select`/`inject`/`rule-detail`/`build-index` family in `src/cli/commands/`; registered via `src/index.ts`.
- **D-02:** Harness loads the built `rule-index.json` (from `build-index`) + labeled corpus `test/fixtures/eval/cases/eval-cases.json` — single-sourced SEL-01 ground truth. No separate eval-corpus copy, no in-process rebuild.
- **D-03:** Output modes — `--json` emits machine-readable JSON; default emits pretty markdown to stdout.
- **D-04:** New module `src/select/eval-cli.ts` (CLI entrypoint + I/O) alongside pure `src/select/eval-harness.ts`; new command shim `src/cli/commands/eval.ts`. Pure measurement layer stays pure; all I/O in the CLI wrapper.

**Blocking & Ship Integration:**
- **D-05:** `criticalRecall === 1.0` — hard floor. ANY missed critical rule blocks.
- **D-06:** Precision REPORTED + warned, NEVER blocked.
- **D-07:** New SEL-06 eval-evidence record at `.planning/governance/eval/{NN}.json` per phase; ship gate consumes it and fails closed on missing/failed — same GATE-05 pattern as Phase 8/9.
- **D-08:** Exit codes — `0` pass, `2` critical-recall regression, `3` parse/index/load error.

**Report Format & Audit Evidence:**
- **D-09:** Artifacts under `.planning/governance/eval/`: `{NN}-report.md` (human) + `{NN}.json` (machine) per phase.
- **D-10:** Markdown report contains: aggregate scores (microRecall, microPrecision, per-severity recall), per-case TP/FP/FN table, named critical misses (under-injection), precision offenders (over-injection, advisory), timestamp, corpus hash pinning the eval-set version.
- **D-11:** New `src/schema/eval-report.schema.json` (draft 2020-12 + `x-binding`, cloned from `test-evidence.schema.json`). Runtime validation via existing Ajv pattern; malformed = hard fail.
- **D-12:** Phase 10 does NOT bump `audit-artifact.schema.json`. `eval_summary` in audit deferred to v3.

**Repeatability & Standing Integration:**
- **D-13:** `npm run eval` runs `node dist/select/eval-cli.js`. `aidlc-governance-verify` skill (verify:post) gets a new step invoking `node dist/select/eval-cli.js <phaseNumber>` AFTER `capture-test-evidence` and BEFORE audit.
- **D-14:** Determinism — deterministic case ordering (sort by name), no clock/random in measurement path, corpus hash pins eval-set version.
- **D-15:** Eval corpus growth — new cases appended to single `test/fixtures/eval/cases/eval-cases.json`.
- **D-16:** Single TDD plan (RED/GREEN/REFACTOR). Reuses existing `eval-harness.ts` pure functions. NO re-derivation of selection math.

### Claude's Discretion
- Exact CLI flag names beyond `--json` (e.g. `--threshold`).
- Exact markdown table column ordering / styling (D-10 content required).
- Whether ship-gate reads eval via new `readEvalOrFail` (mirrors `readApprovalOrFail`) OR a generic `readGateEvidence` extension — keep sibling-store idiom consistent.

### Deferred Ideas (OUT OF SCOPE)
- `eval_summary` field in audit artifact (future v3 bump).
- Configurable recall threshold (`--threshold`).
- Precision regression alerts / cross-phase trend dashboards.
- Cross-corpus / external benchmark eval sets.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEL-06 | A standing recall/precision harness exercises the selection engine against the labeled eval set and reports under-injection (critical recall) and over-injection (precision) as a repeatable, auditable check | Pure math (`eval-harness.ts:runCases`/`aggregate`) ships; `eval-cli.ts` wraps with I/O; durable evidence under `.planning/governance/eval/`; ship-gate consumes via fail-closed read ladder; `aidlc-governance-verify` step wires verify:post; corpus hash pins reproducibility. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recall/precision math | Pure core (`src/select/eval-harness.ts`) | — | Already shipped Phase 2; deterministic, no I/O. Phase 10 reuses, does NOT re-derive. |
| Case corpus loading | CLI producer (`src/select/eval-cli.ts`) | `test/fixtures/eval/cases/eval-cases.json` | Single source. Read at runtime; never imported as a module. |
| Index loading | CLI producer | `test/fixtures/eval/eval-rules/` corpus | Built via `buildIndex(rootDir)` — same idiom as `recall.test.ts`. |
| Evidence persistence | Durable store (`src/governance/eval-evidence-store.ts`) | `.planning/governance/eval/{NN}.json` | Mirrors `gate-evidence-store.ts` / `test-evidence.ts` 4-rung read ladder. |
| Schema validation | Enforcement boundary (`src/enforcement/validate-eval-report.ts`) | `src/schema/eval-report.schema.json` | Ajv 2020 + `x-binding` keyword. 7th validator instance. |
| Ship blocking | Gate hook (`src/governance/ship-gate-hook.ts`) | `.planning/governance/eval/{NN}.json` | Read eval evidence BEFORE writing ship evidence; fail closed on missing/failed. |
| Human report rendering | CLI producer | `.planning/governance/eval/{NN}-report.md` | Markdown table emitted alongside JSON; not the audit artifact. |

## Standard Stack

### Core (NO new dependencies — all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ajv` | 8.20.0 | JSON Schema validator (draft 2020-12 via `ajv/dist/2020`) | Already used by 6 prior validators. `eval-report.schema.json` validator is the 7th instance — same options, same `x-binding` keyword registration. `[VERIFIED: package.json + src/enforcement/validate-*.ts]` |
| `ajv-formats` | 3.0.1 | Format assertions (date-time on timestamps) | Paired with every prior Ajv 2020 instance. `[VERIFIED: package.json]` |
| `node:test` + `node:assert/strict` | built-in (Node ≥22) | Test framework | Matches `capture-test-evidence.test.ts` / `ship-gate-hook.test.ts` idiom; zero extra deps. `[VERIFIED: package.json scripts.test]` |
| `node:util.parseArgs` | built-in | CLI flag parsing | Mirrors `cli/commands/select.ts`. `[VERIFIED: src/cli/commands/select.ts:21]` |
| `node:fs` + `node:crypto` + `node:path` | built-in | Atomic write + corpus hash + path derivation | `atomicWriteFile` (TD-03 suffix `.<pid>-<uuid>.tmp`) + `crypto.createHash("sha256")` for corpus hash. `[VERIFIED: src/governance/atomic-write.ts]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `eval-harness.ts` (in-repo) | n/a | Pure measurement | Import `runCases`/`aggregate`/`EvalCase`/`CaseResult`/`Aggregate`. Do NOT modify. |
| `gate-evidence-store.ts` (in-repo) | n/a | Durable-store template | Clone 4-rung read ladder + atomicWrite + metadata-phase assertion. |
| `capture-test-evidence.ts` (in-repo) | n/a | Producer/CLI template | Clone `isDirectRun` + `runDirect` + `process.exitCode` idiom. |

**Installation:**
```bash
# Nothing to install. All dependencies already declared in package.json:
#   dependencies: ajv@8.20.0, ajv-formats@3.0.1, gray-matter@4.0.3, picomatch@4.0.5
# Phase 10 adds ZERO new packages.
```

## Package Legitimacy Audit

> No new packages installed in this phase. Every dependency already shipped in v1.0 / Phases 6-9.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| ajv | npm | (existing) | (existing) | github.com/ajv-validator/ajv | OK | Approved (already in package.json) |
| ajv-formats | npm | (existing) | (existing) | github.com/ajv-validator/ajv-formats | OK | Approved (already in package.json) |

**Packages added in this phase:** none.

## Architecture Patterns

### System Architecture Diagram

```
                    verify:post skill (.claude/skills/aidlc-governance-verify)
                                |
                                v
   step 4: capture-test-evidence.js <phaseNumber>
           (writes .planning/governance/tests/{NN}.json)
                                |
                                v
   step 5: node dist/select/eval-cli.js <phaseNumber>     <-- NEW Phase 10 STEP
           |                                               
           v                                               
   eval-cli.ts:runDirect(argv)                            
   |                                                     
   |-- read+parse test/fixtures/eval/cases/eval-cases.json (JSON array)
   |-- buildIndex(test/fixtures/eval/eval-rules)  // OR load prebuilt
   |-- runCases(index, cases)  -->  CaseResult[]            
   |-- aggregate(index, results)  -->  Aggregate {microRecall, microPrecision, recallBySeverity}
   |-- compute corpus hash (sha256 over canonicalized cases JSON)
   |-- build EvalReport {phase, capturedAt, aggregate, cases, criticalMisses, precisionOffenders, corpusHash}
   |-- validateEvalReport(report)  // Ajv 2020 + x-binding
   |-- writeEvalEvidence(root, "10", report)  -->  .planning/governance/eval/10.json
   |-- write markdown to .planning/governance/eval/10-report.md
   |-- emit pretty markdown to stdout (or JSON if --json)
   |-- exitCode: 0 pass | 2 critical-recall miss | 3 parse/load error
                               
                                v
   (later, at ship:pre)                                     
   ship-gate-hook.ts:shipGateHook                           
   |                                                       
   |-- readRequiredEvidence("plan")   // existing            
   |-- readRequiredEvidence("verify") // existing            
   |-- readEvalOrFail()               <-- NEW Phase 10 CONSUMER
   |-- assertNoFailedEval()           <-- NEW (throws if report.status === "fail")
   |-- readApprovalOrFail()           // existing            
   |-- writeGateEvidence("ship")                            
```

### Recommended Project Structure
```
src/
├── select/
│   ├── eval-harness.ts          # EXISTING pure math — DO NOT MODIFY
│   └── eval-cli.ts              # NEW — orchestrator + isDirectRun + runDirect
├── cli/commands/
│   └── eval.ts                  # NEW — thin shim (parseArgs -> eval-cli.run)
├── governance/
│   ├── eval-evidence-store.ts   # NEW — clone of test-evidence.ts (4-rung ladder)
│   ├── ship-gate-hook.ts        # MODIFY — add readEvalOrFail + assertNoFailedEval
│   └── paths.ts                 # MODIFY — add evalEvidencePath + evalReportPath
├── enforcement/
│   └── validate-eval-report.ts  # NEW — 7th validate.ts instance
└── schema/
    └── eval-report.schema.json  # NEW — clone of test-evidence.schema.json

.planning/governance/
└── eval/                        # NEW durable-state dir
    ├── 10-report.md             # human
    └── 10.json                  # machine

test/fixtures/eval/
├── cases/eval-cases.json       # EXISTING — single source (12 cases currently)
└── eval-rules/                 # EXISTING — controlled corpus (10 winners)
```

### Pattern 1: Producer/CLI `isDirectRun` + `runDirect` idiom

**What:** Module exposes pure-ish orchestrator + CLI main + `isDirectRun` self-invocation guard.
**When to use:** Any module that must run both as `node dist/X.js <args>` AND be require()'d by tests/siblings.

**Example (clone of `src/governance/capture-test-evidence.ts:81-117`):**
```typescript
// Source: src/governance/capture-test-evidence.ts lines 81-117 [VERIFIED]

function runDirect(argv: string[]): void {
  if (argv.length !== 1) {
    throw new Error("usage: node dist/select/eval-cli.js <phaseNumber> [--json]");
  }
  const [phaseNumber] = argv;
  const projectRoot = process.cwd();
  // ...orchestrate: load cases, buildIndex, runCases, aggregate, persist
}

// TD-05: match THIS compiled dist entry specifically (path.resolve + __filename)
function isDirectRun(): boolean {
  const invokedPath = process.argv[1];
  if (invokedPath === undefined) return false;
  return path.resolve(invokedPath) === __filename;
}

if (isDirectRun()) {
  try {
    runDirect(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`eval-cli: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 3;  // D-08: parse/load error (distinct from 1 generic, 2 regression)
  }
}
```

### Pattern 2: Durable-store 4-rung loud-fail read ladder

**What:** `readX` returns `null` on absent (legitimate pre-state), throws `malformed X at <absPath>: <detail>` on any other failure. Validates BEFORE write so malformed never lands on disk.
**When to use:** Every governance evidence store.

**Example (clone of `src/governance/test-evidence.ts:166-240`):**
```typescript
// Source: src/governance/test-evidence.ts lines 166-240 + gate-evidence-store.ts [VERIFIED]

function fail(filePath: string, detail: string): never {
  throw new Error(`malformed eval evidence at ${filePath}: ${detail}`);
}

function assertEvalEvidence(value, filePath, phaseNumber): asserts value is EvalReport {
  try { validateEvalReport(value); } catch (err) { fail(filePath, String(err)); }
  const record = value as EvalReport;
  if (record.phase !== phaseNumber) {
    fail(filePath, `phase must be ${phaseNumber}`);  // cross-phase leakage guard
  }
}

export function writeEvalEvidence(projectRoot, phaseNumber, report): void {
  const filePath = evalEvidencePath(projectRoot, phaseNumber);
  assertEvalEvidence(report, filePath, phaseNumber);  // validate BEFORE write
  atomicWriteFile(filePath, JSON.stringify(report, null, 2));
}

export function readEvalEvidence(projectRoot, phaseNumber): EvalReport | null {
  const filePath = evalEvidencePath(projectRoot, phaseNumber);
  if (!existsSync(filePath)) return null;                    // rung 1: absent = null
  let raw;
  try { raw = readFileSync(filePath, "utf8"); }              // rung 2: read
  catch (err) { fail(filePath, `unreadable (${String(err)})`); }
  let parsed;
  try { parsed = JSON.parse(raw); }                          // rung 3: parse
  catch (err) { fail(filePath, String(err)); }
  assertEvalEvidence(parsed, filePath, phaseNumber);         // rung 4: validate
  return parsed;
}
```

### Pattern 3: Ship-gate fail-closed prior-evidence consumption

**What:** Ship gate reads each prior evidence; missing = fail closed, failed = fail closed.
**When to use:** Adding eval to the ship-gate prior-evidence chain.

**Example (clone of `src/governance/ship-gate-hook.ts:26-38 + 47-53`):**
```typescript
// Source: src/governance/ship-gate-hook.ts lines 26-53 [VERIFIED]

function readEvalOrFail(projectRoot, phaseNumber): EvalReport {
  const report = readEvalEvidence(projectRoot, phaseNumber);
  if (report === null) {
    throw new Error(
      `ship gate: missing eval evidence ${evalEvidencePath(projectRoot, phaseNumber)}`,
    );
  }
  return report;
}

function assertNoFailedEval(report: EvalReport): void {
  // D-05: critical-recall regression blocks ship
  if (report.aggregate.recallBySeverity.critical < 1.0) {
    const misses = report.criticalMisses.map(m => `${m.case}: ${m.expectedNotSelected.join(", ")}`).join("; ");
    throw new Error(
      `ship gate: eval evidence failed - criticalRecall=${report.aggregate.recallBySeverity.critical} (${misses})`,
    );
  }
}
```

### Pattern 4: Ajv 2020 + `x-binding` keyword (7th validate instance)

**What:** Draft 2020-12 schema with `x-binding` annotation keyword; runtime validation asserts schema + post-Ajv invariants.
**When to use:** Every persisted governance record.

**Example (clone of `src/enforcement/validate-approval.ts`):**
```typescript
// Source: src/enforcement/validate-approval.ts lines 22-44 [VERIFIED]

import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../schema/eval-report.schema.json";

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
// MANDATORY: register x-binding BEFORE compile (Ajv 2020 strict rejects unknown keywords)
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });
const validate = ajv.compile(schema);

export function validateEvalReport(result: unknown): asserts result is EvalReport {
  if (!validate(result)) {
    throw new Error(`invalid eval-report:\n${formatErrors(validate.errors)}`);
  }
  // Post-Ajv D-05 invariant: criticalRecall must be a finite number in [0,1]
  const r = result as EvalReport;
  if (!Number.isFinite(r.aggregate.recallBySeverity.critical)) {
    throw new Error(`invalid eval-report: criticalRecall must be finite`);
  }
}
```

### Anti-Patterns to Avoid

- **Re-deriving recall math in the CLI:** `eval-harness.ts` ships pure. The CLI imports `runCases`/`aggregate` — does NOT recompute TP/FP/FN inline. Violates D-16.
- **Injecting `new Date()` into the pure layer:** `aggregate`/`runCases` must stay clock-free. Timestamps live ONLY in `EvalReport.capturedAt` at the I/O layer (D-14).
- **Gating precision (D-06 violation):** Any `if (microPrecision < threshold) throw` blocks ship → pressures engine toward under-injection, the project's defining anti-pattern.
- **Loading production `rule-index.json` instead of the eval corpus index:** The eval-cases.json `expectedRuleIds` reference EVAL fixture rules (`input-validation`, `secrets-management`, etc.) — NOT production aidlc-rules. Use `buildIndex("test/fixtures/eval/eval-rules")` or a prebuilt eval index (see Open Questions).
- **`process.exit(N)` instead of `process.exitCode = N`:** Forces immediate exit, can truncate piped stdout on Windows. `capture-test-evidence.ts:115` + `cli/index.ts:38` use `process.exitCode` deliberately.
- **Forgetting `x-binding` keyword registration before `ajv.compile`:** Ajv 2020 strict mode REJECTS unknown keywords → module fails to load → fail-closed (T-07-05).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recall/precision math | Recompute TP/FP/FN | `eval-harness.ts:scoreCase`/`runCases`/`aggregate` | Already pure, tested by `recall.test.ts`, severity-partitioned on index ground truth. |
| Atomic file write | `writeFileSync` direct | `atomicWriteFile` (TD-03) | Concurrent-writer race; `.<pid>-<uuid>.tmp` then rename. |
| Path derivation | String concat | `evalEvidencePath`/`evalReportPath` in `paths.ts` | Phase-padding validation (`PHASE_NUMBER_RE`); single source. |
| JSON validation | Hand-written shape checks | Ajv 2020 + `eval-report.schema.json` | 6 prior instances; `x-binding` made explicit; `formatErrors` surfaces actionable diagnostics. |
| CLI dispatch | Custom argv parsing | `cli/index.ts` switch + `cli/commands/eval.ts` shim | Lazy import pattern; existing usage message + exit codes. |
| Severity partition | Walk index in CLI | `aggregate(index, results)` already builds `severityById` internally | Severity-by-ground-truth invariant (WR-02) lives IN the pure function. |
| Corpus hashing | Custom canonicalization | `crypto.createHash("sha256").update(JSON.stringify(cases, null, 2)).digest("hex")` | Node stdlib; stable pretty-print ordering = deterministic hash. |

**Key insight:** Phase 10 adds ONE net-new concept (the `EvalReport` shape + its schema). Everything else — pure math, atomic write, path derivation, fail-closed gate read, CLI isDirectRun, validate pattern — has a 1:1 template. Resisting "improvement" of the sibling patterns keeps crash-isolation (09-01: validator duplication is deliberate) and keeps the diff small.

## Runtime State Inventory

> Phase 10 does not rename, rebrand, or migrate. It ADDS a new durable-state directory. Skip detailed inventory — no stored data, live config, OS registrations, secrets, or build artifacts change identity.

**New durable state created:**
- `.planning/governance/eval/{NN}-report.md` + `{NN}.json` per phase — created by the harness, consumed by ship gate.

**Modified consumers:**
- `src/governance/ship-gate-hook.ts` — adds read of eval evidence BEFORE writing ship evidence. New failure modes surface as `ship gate: missing eval evidence ...` and `ship gate: eval evidence failed ...`.

**No existing keys/IDs renamed.** No migration step required.

## Common Pitfalls

### Pitfall 1: Loading the wrong index
**What goes wrong:** Harness loads production `rule-index.json` (built from `aidlc-rules/`). Eval cases reference EVAL fixture rule ids → every case scores FN across the board → false "critical regression" signal.
**Why it happens:** D-02 phrasing "the built rule-index.json (from build-index)" is ambiguous between the production artifact and an eval-corpus index.
**How to avoid:** Build/load the index from `test/fixtures/eval/eval-rules/` — same path `recall.test.ts:33-38` uses. Either `buildIndex(EVAL_ROOT)` inline, OR ship a prebuilt `test/fixtures/eval/eval-rules/rule-index.json` and load it.
**Warning signs:** Test asserting `criticalRecall === 1.0` fails immediately after wiring the harness — every case reports all expected ids missing.

### Pitfall 2: Injecting non-determinism into the report
**What goes wrong:** Two harness runs over the same corpus produce non-byte-identical reports. The corpus hash can't prove reproducibility.
**Why it happens:** `new Date().toISOString()` for `capturedAt` is fine (timestamp is expected to differ); but `cases` array order, `selectedIds` order, or float formatting in the JSON can vary.
**How to avoid:** Sort `cases` by `name` BEFORE calling `runCases` (D-14). `select()` already sorts `selected`/`skipped` by id ascending (Pitfall 7 of `select.ts`). `scoreCase`/`aggregate` use Sets — order-independent. `JSON.stringify(report, null, 2)` with stable key order.
**Warning signs:** Determinism test (string-compare two runs) fails on `capturedAt` only — that's expected. Fails on anything else = real bug.

### Pitfall 3: Severity sourced from selection instead of index
**What goes wrong:** A missed critical rule doesn't lower `criticalRecall` because the severity used to partition came from the SELECTED record (which is absent for misses).
**Why it happens:** Naive "look up severity from selected array" approach.
**How to avoid:** `aggregate` already uses `severityById = new Map(index.rules.map((r) => [r.id, r.severity]))` (line 123) — severity from the INDEX ground truth, never the selection. The harness inherits this for free by calling `aggregate(index, results)`. DO NOT re-source severity.
**Warning signs:** A held-out critical-miss test passes the gate when it should fail.

### Pitfall 4: Schema `additionalProperties: false` rejects the report
**What goes wrong:** Adding an `evalSummary` or `trend` field to the persisted JSON without a schema update causes `validateEvalReport` to throw on write.
**Why it happens:** Draft 2020-12 strict mode + closed objects (every prior schema uses `additionalProperties: false`).
**How to avoid:** Any new field MUST be added to `eval-report.schema.json` `properties` first. Keep the schema minimal per D-09/D-10. Defer `eval_summary` per D-12.
**Warning signs:** `invalid eval-report: (root) must NOT have additional properties (unexpected key 'X')`.

### Pitfall 5: Ship-gate eval check fires on legacy phases
**What goes wrong:** Phases 6-9 have no `.planning/governance/eval/{NN}.json`. After Phase 10 lands, ship gate fails closed on those phases.
**Why it happens:** `readEvalOrFail` throws on missing evidence.
**How to avoid:** Backfill eval evidence for already-shipped phases by running `node dist/select/eval-cli.js 06` (etc.) once; OR scope the eval check to phase ≥ 10 (config-driven gate); OR document that the eval gate is forward-looking only.
**Warning signs:** Re-running ship gate on Phase 9 after Phase 10 lands throws "missing eval evidence .planning/governance/eval/09.json".

### Pitfall 6: `npm run eval` argv forwarding
**What goes wrong:** `npm run eval` (no args) exits with usage error; user expects it to auto-detect current phase.
**Why it happens:** D-13 scripts `node dist/select/eval-cli.js` with no phase number — script requires `npm run eval -- 10` or `npm run eval 10` for npm to forward the positional.
**How to avoid:** Document the invocation explicitly in the SKILL.md step + package.json description. Verify:post skill invokes `node dist/select/eval-cli.js <phaseNumber>` directly (not via npm), sidestepping the issue.
**Warning signs:** `npm run eval` prints usage error; `npm run eval -- 10` works.

## Code Examples

### Existing pure signatures (DO NOT MODIFY — wrap only)

```typescript
// Source: src/select/eval-harness.ts lines 26-54 + 60-93 + 122-190 [VERIFIED]

export interface EvalCase {
  name: string;
  signal: TaskSignal;        // { taskType, keywords[], paths[] }
  phase: Phase;              // "inception" | "construction" | "operations" | "common"
  scopeConfig: { domains: string[] };
  expectedRuleIds: string[];
}

export interface Aggregate {
  microRecall: number;
  microPrecision: number;
  recallBySeverity: Record<Severity, number>;  // Severity = "critical"|"high"|"medium"|"low"
}

export function runCases(index: RuleIndex, cases: EvalCase[]): CaseResult[];
export function aggregate(index: RuleIndex, results: CaseResult[]): Aggregate;
// aggregate builds severityById internally from index.rules — harness does NOT pass it
```

### Eval corpus shape (single source — top-level JSON array, NO wrapper)

```json
// Source: test/fixtures/eval/cases/eval-cases.json [VERIFIED — 12 cases currently]
[
  {
    "name": "keywords-input-validation",
    "signal": { "taskType": "refactor", "keywords": ["input", "validation"], "paths": [] },
    "phase": "construction",
    "scopeConfig": { "domains": [] },
    "expectedRuleIds": ["input-validation", "secrets-management"]
  },
  ...
  {
    "name": "empty-expected-silent-operations",
    "signal": { "taskType": "docs", "keywords": ["changelog"], "paths": [] },
    "phase": "operations",
    "scopeConfig": { "domains": [] },
    "expectedRuleIds": []
  }
]
```

**Loading idiom (clone of `recall.test.ts:49-54`):**
```typescript
const raw = readFileSync(CASES_FILE, "utf8");
const parsed = JSON.parse(raw) as unknown;
assert.ok(Array.isArray(parsed), "eval-cases.json must parse as a JSON array");
const cases = parsed as EvalCase[];
```

### Path helpers (extend `src/governance/paths.ts`)

```typescript
// Mirror existing testEvidencePath/approvalPath idiom (lines 74-92) [VERIFIED]

export function evalEvidencePath(projectRoot: string, phaseNumber: string): string {
  if (!PHASE_NUMBER_RE.test(phaseNumber)) {
    throw new Error(`invalid eval evidence phase number: ${phaseNumber}`);
  }
  return path.join(governanceDir(projectRoot), "eval", `${phaseNumber}.json`);
}

export function evalReportPath(projectRoot: string, phaseNumber: string): string {
  if (!PHASE_NUMBER_RE.test(phaseNumber)) {
    throw new Error(`invalid eval report phase number: ${phaseNumber}`);
  }
  return path.join(governanceDir(projectRoot), "eval", `${phaseNumber}-report.md`);
}
```

### CLI registration (extend `src/cli/index.ts`)

```typescript
// Source: src/cli/index.ts lines 9-42 [VERIFIED]

case "eval":
  return (await import("./commands/eval.js")).run(rest);
// And append to usage:
//   "  governance eval <phaseNumber> [--json]\n"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `recall.test.ts` only — recall measured at test time | Standing harness + persisted evidence + ship-gate consumption | Phase 10 | Recall regression is now ship-blocking + auditable, not just a failing test. |
| Ship gate reads plan/verify/approval evidence | Ship gate ALSO reads eval evidence | Phase 10 | Critical-recall miss is a first-class ship-blocker alongside failed verify/pending approval. |
| 6 validate.ts instances (frontmatter/index/signal/gate-result/approval/test-evidence) | 7 instances (add `validate-eval-report`) | Phase 10 | Same pattern; one more self-contained crash-island. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "D-02's `rule-index.json` (from build-index)" means an index built FROM the eval corpus (`test/fixtures/eval/eval-rules/`), NOT the production `aidlc-rules/rule-index.json`. Rationale: `eval-cases.json` `expectedRuleIds` reference eval-fixture rule ids, not production rule ids. Mirrors `recall.test.ts:33-38`. | Standard Stack, Pitfall 1, Open Questions | Wrong = harness reports every case as critical regression. Planner confirms index source before GREEN. |
| A2 | `npm run eval` forwards argv (`npm run eval 10` or `npm run eval -- 10`). D-13 scripts `node dist/select/eval-cli.js` with no embedded positional. | Pitfall 6 | Wrong = user-facing CLI broken; verify:post skill bypasses this by invoking `node dist/select/eval-cli.js <NN>` directly. Low risk. |
| A3 | Ship-gate eval check applies forward-looking (phase ≥ 10). Phases 06-09 shipped without eval evidence and should not retroactively fail ship. | Pitfall 5 | Wrong = re-running ship gate on legacy phases throws on missing eval evidence. Planner chooses: backfill legacy phases OR scope gate to phase ≥ 10. |

## Open Questions (RESOLVED)

1. **Index source for the harness** — RESOLVED in Plan 10-01 Task 2(c): `buildIndex("test/fixtures/eval/eval-rules")` (recall.test.ts idiom; option (b)). Hash pins the corpus, not the built index.
   - What we know: `recall.test.ts` builds via `buildIndex("test/fixtures/eval/eval-rules")` at test time. D-02 says "no in-process rebuild".
   - What's unclear: Does "no in-process rebuild" mean (a) ship a prebuilt `test/fixtures/eval/eval-rules/rule-index.json` and load it, or (b) build on-the-fly via `buildIndex` (the recall.test.ts path) and "no rebuild" just means "don't rebuild from production aidlc-rules"?
   - Recommendation: Option (b) — call `buildIndex(EVAL_ROOT)` in the harness. It's what `recall.test.ts` does, mirrors the purity boundary, and avoids a stale prebuilt artifact drifting from the source corpus. The hash pins the corpus, not the built index.

2. **Ship-gate scoping for legacy phases** — RESOLVED in Plan 10-02 Task 2(a): forward-looking guard `if (phaseNumber >= "10")` — legacy phases 06-09 are NOT retroactively failed (no eval evidence expected before Phase 10). Test case (d) covers.
   - What we know: Phases 6-9 shipped without `.planning/governance/eval/{NN}.json`.
   - What's unclear: Should `readEvalOrFail` apply to ALL phases or only phase ≥ 10?
   - Recommendation: Add a forward-looking guard — check eval evidence only when `phaseNumber >= "10"` (string compare works for 2-digit padding). OR run the harness once per shipped phase to backfill (low cost; gives baseline evidence).

3. **Markdown report table column ordering (D-10 discretion)** — RESOLVED in Plan 10-01 Task 2(c): implementer discretion; tests assert content presence (aggregate, per-case TP/FP/FN, critical misses, precision offenders, timestamp, corpus hash), not column ordering/formatting.
   - What we know: Required content (aggregate, per-case TP/FP/FN, critical misses, precision offenders, timestamp, corpus hash).
   - What's unclear: Exact column ordering and styling.
   - Recommendation: Mirror a standard precision/recall table layout. Leave to implementer; tests assert content presence, not formatting.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥22 | All | ✓ | matches `engines.node` | — |
| `ajv@8.20.0` | Schema validation | ✓ | installed | — |
| `ajv-formats@3.0.1` | date-time format | ✓ | installed | — |
| `tsc` (typescript ^6.0.3) | Build | ✓ | dev dep | — |
| `node --test` | Test runner | ✓ | built-in | — |
| `test/fixtures/eval/eval-rules/` | Corpus for index | ✓ | in-repo | — |
| `test/fixtures/eval/cases/eval-cases.json` | Eval cases | ✓ | in-repo | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — section REQUIRED.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node ≥22 built-in) + `node:assert/strict` |
| Config file | none (built-in runner; `node --test "dist-test/**/*.test.js"`) |
| Quick run command | `node --test dist-test/select/eval-cli.test.js` |
| Full suite command | `npm test` (= `pretest` → build + build:test → `node --test "dist-test/**/*.test.js"`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEL-06 | Harness loads eval corpus + index, runs every case through select(), produces report | unit + integration | `node --test dist-test/select/eval-cli.test.js -t "loads"` | ❌ Wave 0 |
| SEL-06 / D-05 | Critical-recall miss → exit 2 + failed evidence + ship gate blocks | integration | `node --test dist-test/select/eval-cli.test.js -t "critical-recall"` | ❌ Wave 0 |
| D-14 | Determinism: same corpus + index → byte-identical report (modulo capturedAt); corpus hash pinned | unit | `node --test dist-test/select/eval-cli.test.js -t "determinism"` | ❌ Wave 0 |
| D-06 | Precision offender reported but NOT blocked (exit 0 with over-injection) | unit | `node --test dist-test/select/eval-cli.test.js -t "precision-reported"` | ❌ Wave 0 |
| D-11 | Malformed report hard-fails Ajv schema (matches validate-approval boundary) | unit | `node --test dist-test/enforcement/validate-eval-report.test.js` | ❌ Wave 0 |
| D-07 | Ship gate reads eval evidence, fails closed on missing/failed | integration | `node --test dist-test/governance/ship-gate-hook.test.js -t "eval"` | ✅ exists (extend) |
| D-13 | End-to-end: `node dist/select/eval-cli.js 10` writes `10-report.md` + `10.json` + ship-gate reads it | smoke | `node --test dist-test/select/eval-cli.test.js -t "end-to-end"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test dist-test/select/eval-cli.test.js dist-test/governance/ship-gate-hook.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + `node dist/select/eval-cli.js 10` produces both artifacts before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/select/eval-cli.test.ts` — producer CLI end-to-end (clone of `capture-test-evidence.test.ts`): injectable build-index/load-cases seam, critical-recall miss → exit 2, determinism (string-compare), precision-reported-not-blocked, malformed report → exit 3.
- [ ] `src/enforcement/validate-eval-report.test.ts` — Ajv boundary tests (clone of `validate-approval.test.ts`): missing required field, bad enum, additional property, post-Ajv invariant.
- [ ] Extend `src/governance/ship-gate-hook.test.ts` — add: missing eval evidence fails closed; failed eval evidence fails closed with finding details; passing eval proceeds to approval check.
- [ ] No framework install needed — `node:test` built-in.

### Specific test invariants (from objective)

1. **Critical-recall gate:** Held-out eval case expecting a critical rule that `select()` misses → harness exits 2 + persists failed evidence (status="fail", criticalMisses populated) + ship gate throws `ship gate: eval evidence failed`.
2. **Determinism:** Same corpus + same index → byte-identical report (string-compare, ignoring `capturedAt`) + corpus hash pinned in report.
3. **Precision reported-not-blocked:** A case with over-injection (extra selected) → reported in `precisionOffenders`, exit still 0 (no critical miss).
4. **Malformed report hard-fail:** Ajv schema rejects missing required field / bad enum / additional property — matches `validate-approval.ts` boundary.
5. **End-to-end:** `node dist/select/eval-cli.js 10` produces `.planning/governance/eval/10-report.md` + `10.json` + ship-gate reads it without throwing.

## Security Domain

> `security_enforcement: true` + `security_asvs_level: 1` + `security_block_on: high` in config. Section REQUIRED.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — governance evidence has no auth surface |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a — read-only durable state |
| V5 Input Validation | yes | Ajv 2020 + `eval-report.schema.json` (`additionalProperties: false`, strict ISO timestamp pattern, phase regex, enum severities). Malformed = hard fail per ENF-02. |
| V6 Cryptography | partial | Corpus hash via `node:crypto.createHash("sha256")` — stdlib, NOT hand-rolled. Integrity-of-evidence use only, not for secrets. |
| V7 Error Handling | yes | 4-rung loud-fail read ladder; malformed evidence NEVER lands on disk (validate-before-write); exit codes distinguish infra vs regression (D-08). |
| V8 Data Protection | yes | Atomic write (TD-03) eliminates truncation race; `.planning/governance/eval/` lives alongside existing governance ledger (no new trust boundary). |

### Known Threat Patterns for governance-evidence persistence

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampered eval evidence on disk | Tampering | `validateEvalReport` re-validates parsed JSON on every read (4-rung ladder rung 4); metadata-phase check rejects cross-phase leakage |
| Concurrent writer clobber | Tampering | `atomicWriteFile` unique temp suffix `.<pid>-<uuid>.tmp` then rename (TD-03) |
| Path traversal via phaseNumber | Tampering | `PHASE_NUMBER_RE = /^\d{2}(?:\.\d+)?$/` validation in `evalEvidencePath`/`evalReportPath` rejects `..`/absolute paths |
| Forged criticalRecall value | Spoofing | Post-Ajv invariant: `Number.isFinite(criticalRecall)` + range check; severity re-sourced from index inside `aggregate`, NOT from the persisted report |
| Stale corpus pretending fresh | Repudiation | Corpus hash pinned in report; mismatch on re-run = report regeneration from a different corpus |
| Process.exit truncates piped output | DoS | `process.exitCode = N` (NOT `process.exit(N)`) — lets buffered stdout drain (CR-02 idiom) |

## Sources

### Primary (HIGH confidence)
- `src/select/eval-harness.ts` — full pure-math surface (EvalCase/CaseScore/CaseResult/Aggregate, scoreCase/runCases/aggregate). Lines 1-190.
- `src/select/select.ts` — `select(index, signal, config)` signature + SelectionResult shape. Lines 1-330.
- `test/fixtures/eval/cases/eval-cases.json` — corpus shape (top-level JSON array, 12 cases, expectedRuleIds reference eval-fixture rule ids).
- `src/governance/capture-test-evidence.ts` — producer/CLI template (isDirectRun, runDirect, spawnRunner seam). Lines 1-117.
- `src/governance/test-evidence.ts` — durable-store template (4-rung ladder, validate-before-write, inline validator). Lines 1-240.
- `src/governance/gate-evidence-store.ts` — durable-store fail ladder + assertEvidence chain. Lines 1-168.
- `src/governance/ship-gate-hook.ts` — GATE-05 fail-closed prior-evidence pattern (readRequiredEvidence/assertNonBlocking/readApprovalOrFail). Lines 1-208.
- `src/enforcement/validate-approval.ts` + `validate-gate-result.ts` — Ajv 2020 + x-binding pattern (5th/6th instance). Lines 1-99.
- `src/schema/test-evidence.schema.json` + `approval.schema.json` — draft 2020-12 + x-binding schema templates.
- `src/governance/paths.ts` — path helper idiom (PHASE_NUMBER_RE validation, governanceDir layout). Lines 1-92.
- `src/cli/index.ts` + `src/cli/commands/select.ts` + `build-index.ts` + `rule-detail.ts` — CLI registration + parseArgs + renderText patterns. Lines 1-53 / 1-204 / 1-33 / 1-107.
- `.claude/skills/aidlc-governance-verify/SKILL.md` — verify:post step flow (capture-test-evidence = step 4; Phase 10 inserts eval as step 5).
- `src/index/build.ts` — `buildIndex(rootDir): RuleIndex` + `writeIndex(index, outPath)`. Lines 1-104.
- `package.json` — scripts chain (build/build:test/pretest/test/test:coverage), dependencies (NO new deps for Phase 10).
- `.planning/config.json` — `workflow.nyquist_validation: true`, `security_enforcement: true`, `tdd_mode: true`.

### Secondary (MEDIUM confidence)
- None. All findings verified directly against in-repo source.

### Tertiary (LOW confidence)
- None. No external sources consulted; no `[ASSUMED]` claims beyond the 3 planner-confirmation items in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency already installed and used by 6 prior phases.
- Architecture: HIGH — every pattern has a 1:1 in-repo template; this is wrap-and-clone work.
- Pitfalls: HIGH — derived from observed invariants in the actual source (severity-by-ground-truth at eval-harness.ts:123, deterministic sort at select.ts:304-305, atomic-write suffix at atomic-write.ts:31).
- Open Questions: 3 items for planner confirmation (index source, ship-gate scoping, npm argv forwarding) — none block planning.

**Research date:** 2026-07-08
**Valid until:** 2026-08-07 (30 days — stable internal codebase; no external API surface to drift)

## RESEARCH COMPLETE
