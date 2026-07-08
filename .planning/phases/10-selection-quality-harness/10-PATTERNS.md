# Phase 10: Selection-Quality Harness - Pattern Map

**Mapped:** 2026-07-08
**Files analyzed:** 13 (8 new + 5 modify)
**Analogs found:** 13 / 13 (every file has a 1:1 in-repo template — Phase 10 is wrap-and-clone)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| NEW `src/select/eval-cli.ts` | controller / CLI producer | request-response (argv→stdout+file) | `src/governance/capture-test-evidence.ts` | exact (producer/CLI `isDirectRun` idiom) |
| NEW `src/cli/commands/eval.ts` | route / CLI shim | request-response | `src/cli/commands/build-index.ts` + `select.ts` | exact (parseArgs shim) |
| MODIFY `src/cli/index.ts` | route registry | request-response | self (`select`/`inject`/`rule-detail` cases) | exact (sibling case) |
| NEW `src/governance/eval-evidence.ts` | store | CRUD + file-I/O | `src/governance/test-evidence.ts` | exact (4-rung ladder + inline validator) |
| NEW `src/schema/eval-report.schema.json` | config / schema | n/a (declarative) | `src/schema/test-evidence.schema.json` | exact (draft 2020-12 + x-binding) |
| NEW `src/enforcement/validate-eval-report.ts` | middleware / validator | transform | `src/enforcement/validate-approval.ts` | exact (7th validate instance) |
| MODIFY `src/governance/paths.ts` | utility | pure (no I/O) | self (`testEvidencePath`/`approvalPath`) | exact (PHASE_NUMBER_RE helper) |
| MODIFY `src/governance/ship-gate-hook.ts` | controller / gate hook | event-driven (hook) | self (`readApprovalOrFail`/`assertNoBlockingApprovals`) | exact (GATE-05 fail-closed prior-evidence) |
| MODIFY `.claude/skills/aidlc-governance-verify/SKILL.md` | config / skill step | n/a (declarative) | self (step 4 capture-test-evidence) | exact (sibling step) |
| MODIFY `package.json` | config | n/a | self (`scripts` block) | exact |
| NEW `src/select/eval-cli.test.ts` | test | test | `src/governance/capture-test-evidence.test.ts` + `src/governance/ship-gate-hook.test.ts` | exact (producer + fail-closed gate) |
| NEW `src/enforcement/validate-eval-report.test.ts` | test | test | `src/enforcement/validate-approval.test.ts` | exact (closed-schema boundary tests) |
| MODIFY `src/governance/ship-gate-hook.test.ts` | test | test | self (approval blocking cases L225-296) | exact (sibling block case) |

## Pattern Assignments

### `src/select/eval-cli.ts` (controller / CLI producer, request-response)

**Analog:** `src/governance/capture-test-evidence.ts` (lines 1-117) — producer/CLI template.

**Imports pattern** (`capture-test-evidence.ts:20-26`):
```typescript
import { spawnSync } from "node:child_process";  // eval-cli: drop, replace with crypto/fs
import path from "node:path";
import {
  parseTapSummary,        // eval-cli: replace with runCases/aggregate from "../select/eval-harness.js"
  writeTestEvidence,      // eval-cli: replace with writeEvalEvidence from "../governance/eval-evidence.js"
  type TestEvidenceRecord,// eval-cli: replace with type EvalReport
} from "./test-evidence.js";
```

**Injectable seam pattern** (`capture-test-evidence.ts:29-36`) — clone so tests inject `buildIndex`/`loadCases` without touching disk:
```typescript
/** Injectable spawn seam — returns captured stdout. Tests substitute a fixture fn. */
export type SpawnRunner = () => string;

export interface CaptureTestEvidenceArgs {
  projectRoot: string;
  phaseNumber: string;
  /** Override the spawn (tests only). Production callers omit → defaultSpawnRunner. */
  spawnRunner?: SpawnRunner;
}
```
For eval-cli: replace `SpawnRunner` with two seams — `indexLoader?: () => RuleIndex` and `casesLoader?: () => EvalCase[]`. Defaults call `buildIndex(EVAL_ROOT)` + `loadCases(CASES_FILE)` (recall.test.ts:32-54 idiom).

**Orchestrator pattern (pure-ish, no persist)** (`capture-test-evidence.ts:65-75`):
```typescript
export function captureTestEvidence(args: CaptureTestEvidenceArgs): TestEvidenceRecord {
  const runner = args.spawnRunner ?? (() => defaultSpawnRunner(args.projectRoot));
  const stdout = runner();
  const summary = parseTapSummary(stdout);
  return {
    phase: args.phaseNumber,
    capturedAt: new Date().toISOString(),
    runner: "node --test --test-reporter=tap",
    summary,
  };
}
```
eval-cli equivalent: `runEval(args): EvalReport` calls `runCases(index, cases)` → `aggregate(index, results)` → builds `{phase, capturedAt, aggregate, cases, criticalMisses, precisionOffenders, corpusHash}`. Does NOT persist — runDirect calls `writeEvalEvidence`.

**CLI main + isDirectRun + exitCode pattern** (`capture-test-evidence.ts:81-117`) — clone verbatim, swap exit code `1` → `3` on parse/load error + add `2` path for critical-recall miss (D-08):
```typescript
function runDirect(argv: string[]): void {
  if (argv.length !== 1) {
    throw new Error("usage: node dist/governance/capture-test-evidence.js <phaseNumber>");
  }
  const [phaseNumber] = argv;
  const projectRoot = process.cwd();
  const record = captureTestEvidence({ projectRoot, phaseNumber });
  writeTestEvidence(projectRoot, phaseNumber, record);
  const filePath = path.join(projectRoot, ".planning", "governance", "tests", `${phaseNumber}.json`);
  process.stdout.write(`capture-test-evidence: persisted ${filePath}\n`);
}

// TD-05: match THIS compiled dist entry specifically, not any file named
// capture-test-evidence.js elsewhere on the PATH.
function isDirectRun(): boolean {
  const invokedPath = process.argv[1];
  if (invokedPath === undefined) return false;
  return path.resolve(invokedPath) === __filename;
}

if (isDirectRun()) {
  try {
    runDirect(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(
      `capture-test-evidence: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;   // eval-cli: 3 on parse/load (caught here); 2 on critical-recall miss (set inside runDirect after write)
  }
}
```
**Critical:** use `process.exitCode = N`, NOT `process.exit(N)` — lets piped stdout drain (CR-02, Pitfall 6).

**Corpus hash pattern** (no analog — RESEARCH §Don't Hand-Roll):
```typescript
import { createHash } from "node:crypto";
const corpusHash = createHash("sha256")
  .update(JSON.stringify(cases, null, 2))  // stable pretty-print ordering = deterministic
  .digest("hex");
```

---

### `src/cli/commands/eval.ts` (route / CLI shim, request-response)

**Analog:** `src/cli/commands/build-index.ts` (entire file, 33 lines) + `src/cli/commands/select.ts:93-107` (parseArgs).

**Command shim pattern** (`build-index.ts:1-32`) — clone verbatim, swap flags:
```typescript
/**
 * `governance build-index [--root <dir>] [--out <file>]`
 *
 * Reads the rule-pack store, builds the index, writes `rule-index.json`.
 */
import { parseArgs } from "node:util";
import { buildIndex, writeIndex } from "../../index/build.js";

export async function run(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      root: { type: "string", default: "aidlc-rules" },
      out: { type: "string", default: "rule-index.json" },
    },
    allowPositionals: false,   // Fail loud on unknown flag / stray positional (T-2-CLI-INJECT)
  });
  // ... orchestrate
  process.stdout.write(`build-index: wrote ${out} ...\n`);
}
```
eval.ts: one positional `phaseNumber` (so `allowPositionals: true` — mirrors `rule-detail <id>`), `--json` boolean flag. Delegates to `eval-cli.ts:runEval`/`writeEvalEvidence`. Output goes through eval-cli (stdout + file), not the shim.

**parseArgs + fail-loud pattern** (`select.ts:93-107`):
```typescript
const { values } = parseArgs({
  args: rest,
  options: { /* ... */ },
  allowPositionals: false,  // fail loud on unknown flag
});
```

---

### `src/cli/index.ts` (MODIFY — register `eval` command)

**Analog:** self — `src/cli/index.ts:9-42` switch + usage.

**Registration pattern** (`cli/index.ts:12-32`):
```typescript
switch (subcommand) {
  case "build-index":
    return (await import("./commands/build-index.js")).run(rest);
  case "select":
    return (await import("./commands/select.js")).run(rest);
  case "inject":
    return (await import("./commands/inject.js")).run(rest);
  case "rule-detail":
    return (await import("./commands/rule-detail.js")).run(rest);
  // ADD: case "eval": return (await import("./commands/eval.js")).run(rest);
  default:
    process.stderr.write(`Unknown command: ${subcommand ?? "(none)"}\n`);
    process.stderr.write(
      "Usage:\n" +
        "  governance build-index [--root <dir>] [--out <file>]\n" +
        "  governance select --phase <p> ...\n" +
        // ADD: "  governance eval <phaseNumber> [--json]\n"
        "",
    );
    process.exitCode = 2;
    return;
}
```
**Lazy import + usage line appended** — both edits in one go. Exit code 2 (usage) already there.

---

### `src/governance/eval-evidence.ts` (NEW store — CRUD + file-I/O)

**Analog:** `src/governance/test-evidence.ts` (lines 1-240) — 4-rung ladder + inline validator. **Clone 1:1, swap names + schema + post-Ajv invariant.**

**Header + imports pattern** (`test-evidence.ts:24-31`):
```typescript
import { existsSync, readFileSync } from "node:fs";
import { atomicWriteFile } from "./atomic-write.js";
import { testEvidencePath } from "./paths.js";        // eval: evalEvidencePath/evalReportPath
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — CJS require(); resolveJsonModule handles JSON import.
import schema from "../schema/test-evidence.schema.json";  // eval: ../schema/eval-report.schema.json
```

**Inline validator pattern** (`test-evidence.ts:60-113`) — clone verbatim, change `validateTestEvidence`→`validateEvalReport`, swap post-Ajv invariant (eval: `Number.isFinite(aggregate.recallBySeverity.critical)` instead of summary counts):
```typescript
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });  // MANDATORY pre-compile
const validate: ValidateFunction = ajv.compile(schema);

function formatErrors(errors: ValidateFunction["errors"]): string {
  if (!errors || errors.length === 0) return "unknown validation error";
  return errors.map((e) => {
    const where = e.instancePath || "(root)";
    let detail = e.message ?? "invalid";
    const params = e.params as Record<string, unknown> | undefined;
    if (params && typeof params.missingProperty === "string") {
      detail = `${detail} (missing '${params.missingProperty}')`;
    }
    if (params && Array.isArray(params.allowedValues)) {
      detail = `${detail} (allowed: ${params.allowedValues.join(", ")})`;
    }
    if (params && typeof params.additionalProperty === "string") {
      detail = `${detail} (unexpected key '${params.additionalProperty}')`;
    }
    return `${where} ${detail}`;
  }).join("\n");
}

export function validateEvalReport(result: unknown): asserts result is EvalReport {
  if (!validate(result)) {
    throw new Error(`invalid eval-report:\n${formatErrors(validate.errors)}`);
  }
  // Post-Ajv D-05 invariant: criticalRecall must be finite in [0,1]
  const r = result as EvalReport;
  if (!Number.isFinite(r.aggregate.recallBySeverity.critical)) {
    throw new Error(`invalid eval-report: criticalRecall must be finite`);
  }
}
```
**Note duplication is intentional** (09-01: one crash doesn't take down sibling validators) — do NOT extract a shared `formatErrors`.

**4-rung loud-fail read ladder pattern** (`test-evidence.ts:166-240`) — clone verbatim, swap `TestEvidenceRecord`→`EvalReport`:
```typescript
function fail(filePath: string, detail: string): never {
  throw new Error(`malformed test evidence at ${filePath}: ${detail}`);
}

function assertTestEvidence(value, filePath, phaseNumber): asserts value is TestEvidenceRecord {
  try { validateTestEvidence(value); } catch (err) { fail(filePath, String(err)); }
  const record = value as TestEvidenceRecord;
  if (record.phase !== phaseNumber) {
    fail(filePath, `phase must be ${phaseNumber}`);   // cross-phase leakage guard
  }
}

export function writeTestEvidence(projectRoot, phaseNumber, record): void {
  const filePath = testEvidencePath(projectRoot, phaseNumber);
  assertTestEvidence(record, filePath, phaseNumber);  // validate BEFORE write
  atomicWriteFile(filePath, JSON.stringify(record, null, 2));
}

export function readTestEvidence(projectRoot, phaseNumber): TestEvidenceRecord | null {
  const filePath = testEvidencePath(projectRoot, phaseNumber);
  if (!existsSync(filePath)) return null;                    // rung 1: absent = null
  let raw;
  try { raw = readFileSync(filePath, "utf8"); }              // rung 2: read
  catch (err) { fail(filePath, `unreadable (${String(err)})`); }
  let parsed;
  try { parsed = JSON.parse(raw); }                          // rung 3: parse
  catch (err) { fail(filePath, String(err)); }
  assertTestEvidence(parsed, filePath, phaseNumber);         // rung 4: validate
  return parsed;
}
```
**Add a markdown writer helper** (no analog in test-evidence — eval needs `{NN}-report.md`):
```typescript
import { atomicWriteFile } from "./atomic-write.js";  // already imported
export function writeEvalReportMarkdown(projectRoot, phaseNumber, markdown: string): void {
  atomicWriteFile(evalReportPath(projectRoot, phaseNumber), markdown);
}
```

---

### `src/schema/eval-report.schema.json` (NEW schema)

**Analog:** `src/schema/test-evidence.schema.json` (entire file, 40 lines) — clone header + `x-binding`.

**Schema header pattern** (`test-evidence.schema.json:1-9`):
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gsd.dev/schemas/test-evidence.schema.json",
  "title": "Test Runner Evidence",
  "description": "AUDIT-04 ... x-binding: binding — parsed state blocks ship via the audit fold.",
  "type": "object",
  "additionalProperties": false,
  "required": ["phase", "capturedAt", "runner", "summary"],
  "properties": { /* ... */ },
  "x-binding": "binding"
}
```
eval-report.schema.json:
- `$id`: `https://gsd.dev/schemas/eval-report.schema.json`
- `required`: `["phase", "capturedAt", "aggregate", "cases", "criticalMisses", "precisionOffenders", "corpusHash"]`
- `additionalProperties: false` (Pitfall 4 — closed object)
- Top-level `phase`: same pattern `^\\d{2}(?:\\.\\d+)?$`
- `capturedAt`: same strict ISO 8601 pattern `^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$`
- `aggregate.microRecall`/`microPrecision`/`recallBySeverity.{critical,high,medium,low}`: `{ "type": "number", "minimum": 0, "maximum": 1 }`
- `severity` enum wherever used: `["critical","high","medium","low"]`
- `x-binding: "binding"` at root (mandatory — Ajv 2020 strict keyword registered in validator)

---

### `src/enforcement/validate-eval-report.ts` (NEW — 7th validate instance)

**Analog:** `src/enforcement/validate-approval.ts` (lines 1-99).

**NOTE:** `eval-evidence.ts` already inlines this validator (test-evidence.ts pattern). If the planner chooses the inline pattern (recommended — matches test-evidence.ts exactly), this file is NOT needed. If the planner chooses the separated pattern (matches validate-approval.ts), use:

**Standalone validator pattern** (`validate-approval.ts:24-99`) — clone verbatim, swap schema import + post-Ajv invariant:
```typescript
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../schema/eval-report.schema.json";
import type { EvalReport } from "../governance/eval-evidence.js";

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
// MANDATORY: register x-binding BEFORE compile. Ajv 2020 strict REJECTS unknown keywords.
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });
const validate: ValidateFunction = ajv.compile(schema);

// ... formatErrors clone ...

export function validateEvalReport(result: unknown): asserts result is EvalReport {
  if (!validate(result)) {
    throw new Error(`invalid eval-report:\n${formatErrors(validate.errors)}`);
  }
  // Post-Ajv D-05 invariant (replaces approval's decidedBy check)
  const r = result as EvalReport;
  if (!Number.isFinite(r.aggregate.recallBySeverity.critical)) {
    throw new Error(`invalid eval-report: criticalRecall must be finite`);
  }
}
```

**Planner recommendation:** pick ONE home for `validateEvalReport` — inline in `eval-evidence.ts` (matches `test-evidence.ts`) OR standalone here (matches `validate-approval.ts`). CONTEXT D-11 says "Runtime validation via existing Ajv/validate pattern" — both satisfy. Inline keeps the diff smaller; standalone matches validate-approval.ts more directly. RESEARCH p.13 recommends inline.

---

### `src/governance/paths.ts` (MODIFY — add 2 helpers)

**Analog:** self — `paths.ts:81-92` (`testEvidencePath`) and `paths.ts:68-79` (`approvalPath`).

**Path helper pattern** (`paths.ts:81-92`):
```typescript
/**
 * Path to a per-phase test-evidence record (AUDIT-04, D-02). One file per phase
 * under `.planning/governance/tests/{NN}.json`. PHASE_NUMBER_RE-validated.
 */
export function testEvidencePath(projectRoot: string, phaseNumber: string): string {
  if (!PHASE_NUMBER_RE.test(phaseNumber)) {
    throw new Error(`invalid test evidence phase number: ${phaseNumber}`);
  }
  return path.join(governanceDir(projectRoot), "tests", `${phaseNumber}.json`);
}
```
Append:
```typescript
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
`PHASE_NUMBER_RE = /^\d{2}(?:\.\d+)?$/` (paths.ts:16) already exists — reuse, do NOT redefine.

---

### `src/governance/ship-gate-hook.ts` (MODIFY — add eval consumer)

**Analog:** self — `readApprovalOrFail` (lines 108-137) + `assertNoBlockingApprovals` (lines 143-149). Plus `readRequiredEvidence` (lines 26-38) for the simpler "missing = throw" case — eval follows THIS shape (no pending creation).

**readXOrFail pattern** (`ship-gate-hook.ts:26-38` — preferred over approval's pending-create shape):
```typescript
function readRequiredEvidence(
  projectRoot: string,
  phaseNumber: string,
  gateId: GateId,
): GateEvidence {
  const evidence = readGateEvidence(projectRoot, phaseNumber, gateId);
  if (evidence === null) {
    throw new Error(
      `ship gate: missing governance evidence ${gateEvidencePath(projectRoot, phaseNumber, gateId)}`,
    );
  }
  return evidence;
}
```
eval equivalent (no pending lifecycle — just missing = fail closed):
```typescript
function readEvalOrFail(projectRoot: string, phaseNumber: string): EvalReport {
  const report = readEvalEvidence(projectRoot, phaseNumber);
  if (report === null) {
    throw new Error(
      `ship gate: missing eval evidence ${evalEvidencePath(projectRoot, phaseNumber)}`,
    );
  }
  return report;
}
```

**assertX blocking pattern** (`ship-gate-hook.ts:47-53` `assertNonBlocking` + lines 143-149 `assertNoBlockingApprovals`):
```typescript
function assertNonBlocking(evidence: GateEvidence, gateId: "plan" | "verify"): void {
  if (evidence.result.status === "fail") {
    throw new Error(
      `ship gate: ${gateId} governance evidence failed - ${findingDetails(evidence)}`,
    );
  }
}

function assertNoBlockingApprovals(approval: ApprovalRecord): void {
  if (approval.decision === "pending" || approval.decision === "rejected") {
    throw new Error(
      `ship gate: approval ${approval.approvalId} is ${approval.decision} — human resolution required`,
    );
  }
}
```
eval equivalent — D-05 criticalRecall floor:
```typescript
function assertNoFailedEval(report: EvalReport): void {
  // D-05: critical-recall regression blocks ship (any critical miss)
  if (report.aggregate.recallBySeverity.critical < 1.0) {
    const misses = report.criticalMisses
      .map((m) => `${m.case}: ${m.expectedNotSelected.join(", ")}`)
      .join("; ");
    throw new Error(
      `ship gate: eval evidence failed - criticalRecall=${report.aggregate.recallBySeverity.critical} (${misses})`,
    );
  }
}
```

**Hook wiring point** (`ship-gate-hook.ts:151-162`) — insert eval read AFTER verify+approval reads but BEFORE writeGateEvidence. Planner picks ordering (RESEARCH Pitfall 5 says forward-looking `phase >= "10"` guard or legacy backfill):
```typescript
export function shipGateHook(args: ShipGateHookArgs): ShipGateHookResult {
  const planEvidence = readRequiredEvidence(args.projectRoot, args.phaseNumber, "plan");
  const verifyEvidence = readRequiredEvidence(args.projectRoot, args.phaseNumber, "verify");
  assertNonBlocking(planEvidence, "plan");
  assertNonBlocking(verifyEvidence, "verify");

  // INSERT: eval evidence (forward-looking guard or backfill legacy — Pitfall 5)
  const evalReport = readEvalOrFail(args.projectRoot, args.phaseNumber);
  assertNoFailedEval(evalReport);

  const approval = readApprovalOrFail(args.projectRoot, args.phaseNumber, verifyEvidence.request.phase);
  assertNoBlockingApprovals(approval);
  // ... writeGateEvidence (unchanged)
}
```

---

### `.claude/skills/aidlc-governance-verify/SKILL.md` (MODIFY — insert eval step)

**Analog:** self — step 4 capture-test-evidence (SKILL.md:30-45) becomes the template for step 5 eval.

**Step pattern** (SKILL.md:30-45):
```markdown
4. **Capture test evidence (AUDIT-04 producer side).** BEFORE the audit skill
   (`aidlc-governance-audit`) reads `.planning/governance/tests/{NN}.json`, this
   step MUST run to write it. Invoke the compiled capture entrypoint:

   ```bash
   node dist/governance/capture-test-evidence.js <phaseNumber>
   ```

   Pass the concrete `{NN}` phase number. ... If the runner exits non-zero, surface stderr and fail the `verify:post` step.
```
Insert as new step 5 (renumber current step 5 "Propagate failures" → 6):
```markdown
5. **Run the standing eval harness (SEL-06).** AFTER test evidence and BEFORE
   the audit step, run the recall/precision harness so every governed phase's
   ship evidence includes a fresh eval run. Invoke the compiled entrypoint:

   ```bash
   node dist/select/eval-cli.js <phaseNumber>
   ```

   The harness loads `test/fixtures/eval/cases/eval-cases.json` + builds the
   index from `test/fixtures/eval/eval-rules/`, runs every case through
   `select()`, persists `.planning/governance/eval/{NN}.json` +
   `{NN}-report.md`, and emits pretty markdown to stdout (or JSON with `--json`).
   Exit 0 = pass; exit 2 = critical-recall regression (blocking); exit 3 =
   parse/index/load error. Any non-zero exit fails `verify:post`.
```

---

### `package.json` (MODIFY — add `eval` script)

**Analog:** self — `scripts` block (package.json:19-25).

**Scripts block** (package.json:19-25):
```json
"scripts": {
  "build": "tsc -p tsconfig.build.json",
  "build:test": "tsc -p tsconfig.json",
  "pretest": "npm run build && npm run build:test",
  "test": "node --test \"dist-test/**/*.test.js\"",
  "test:coverage": "c8 node --test \"dist-test/**/*.test.js\""
}
```
Add (after `test:coverage`):
```json
  ,
  "eval": "node dist/select/eval-cli.js"
```
Note (Pitfall 6): `npm run eval` requires `npm run eval -- 10` or `npm run eval 10` to forward the positional. The verify:post skill invokes `node dist/select/eval-cli.js <NN>` directly, sidestepping this. Document in the script description if desired.

---

### `src/select/eval-cli.test.ts` (NEW test — producer end-to-end)

**Analog:** `src/governance/capture-test-evidence.test.ts` (entire file, 204 lines) — producer + fail-closed guard tests.

**Test scaffolding pattern** (`capture-test-evidence.test.ts:14-47`):
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { captureTestEvidence, type CaptureTestEvidenceArgs } from "./capture-test-evidence.js";
import { readTestEvidence, writeTestEvidence } from "./test-evidence.js";
import { testEvidencePath } from "./paths.js";

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-capture-test-evidence-"));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
```
For eval-cli.test.ts: import from `../select/eval-cli.js` + `../governance/eval-evidence.js`. Inject `indexLoader`/`casesLoader` seams (no `buildIndex(EVAL_ROOT)` against real disk in unit tests — use a fixture index/cases pair).

**Producer persists + reloads test** (`capture-test-evidence.test.ts:108-123`):
```typescript
test("captureTestEvidence persists via writeTestEvidence to .planning/governance/tests/{NN}.json (D-02)", () => {
  withTempRoot((root) => {
    const record = captureTestEvidence({ projectRoot: root, phaseNumber: "09", spawnRunner: () => TAP_OK });
    writeTestEvidence(root, "09", record);
    const reloaded = readTestEvidence(root, "09");
    assert.ok(reloaded !== null, "test evidence file must exist");
    assert.deepEqual(reloaded!.summary, record.summary);
    assert.equal(existsSync(testEvidencePath(root, "09")), true);
  });
});
```

**End-to-end producer→store→consumer** (`capture-test-evidence.test.ts:161-182`) — clone shape for eval-cli → writeEvalEvidence → shipGateHook:
```typescript
test("End-to-end: captureTestEvidence → writeTestEvidence → readTestEvidence → writeGovernanceAudit ...", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    // ... producer + consumer sequence
  });
});
```

**Determinism test** (no direct analog — RESEARCH §Pitfall 2): string-compare two runs of `runEval`, ignoring `capturedAt`. Assert `corpusHash` equal.

**Critical-recall miss → exit 2 test**: inject a cases fixture where one critical-severity expected id is NOT selected. Assert `runDirect` sets `process.exitCode = 2` AND the persisted report has `criticalMisses` populated AND `aggregate.recallBySeverity.critical < 1.0`. Spawn the compiled runner (`spawnSync(process.execPath, [RUNNER, root, "10"])`) — mirrors `ship-gate-hook.test.ts:315-323`.

---

### `src/enforcement/validate-eval-report.test.ts` (NEW test — schema boundary)

**Analog:** `src/enforcement/validate-approval.test.ts` (entire file, 203 lines).

**Validator boundary test pattern** (`validate-approval.test.ts:46-147`):
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateApproval } from "./validate-approval.js";

const REQUIRED_FIELDS = [...] as const;

function makeValidApproval(): Record<string, unknown> { /* fresh literal per call */ }

test("the validator is compiled once at module load", () => {
  assert.equal(typeof validateApproval, "function");
});

test("accepts a valid ...", () => {
  assert.doesNotThrow(() => validateApproval(makeValidApproval()));
});

for (const field of REQUIRED_FIELDS) {
  test(`rejects ... missing required field: ${field}`, () => {
    const r = makeValidApproval();
    delete r[field];
    assert.throws(() => validateApproval(r), (err: Error) => {
      assert.ok(err.message.includes("invalid approval"));
      return true;
    });
  });
}

test("rejects an unknown top-level key (additionalProperties false)", () => { /* ... */ });
```
For validate-eval-report.test.ts: `makeValidEvalReport()` returns a minimal valid record. Test missing each required field, bad severity enum, `criticalRecall` outside `[0,1]`, `additionalProperties: false`. Post-Ajv invariant test: `criticalRecall = NaN` rejected even if schema-wise numeric.

---

### `src/governance/ship-gate-hook.test.ts` (MODIFY — add eval blocking cases)

**Analog:** self — approval blocking cases (ship-gate-hook.test.ts:225-296).

**Block-on-missing pattern** (`ship-gate-hook.test.ts:124-134`):
```typescript
test("shipGateHook fails closed when plan evidence is missing and writes no ship evidence", () => {
  withTempRoot((root) => {
    writeGateEvidence(root, "08", evidence("verify"));
    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "08" }),
      /ship gate: missing governance evidence .*\.planning[\\/]governance[\\/]gates[\\/]08-plan\.json/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), false);
  });
});
```
Clone 3 cases for eval:
1. Missing eval evidence → `ship gate: missing eval evidence ... 08.json`
2. Failed eval (criticalRecall < 1.0) → `ship gate: eval evidence failed - criticalRecall=...`
3. Passing eval proceeds to approval check (assert ship evidence written after)

Use the existing `seedPriorEvidence` + `makeApproval("approved")` helpers. Insert `writeEvalEvidence(root, "08", evalReportFixture("pass"))` between verify seed and approval seed.

## Shared Patterns

### Producer/CLI `isDirectRun` + `runDirect` + `process.exitCode`
**Source:** `src/governance/capture-test-evidence.ts:81-117`
**Apply to:** `src/select/eval-cli.ts`
```typescript
function isDirectRun(): boolean {
  const invokedPath = process.argv[1];
  if (invokedPath === undefined) return false;
  return path.resolve(invokedPath) === __filename;  // TD-05: match THIS dist entry
}

if (isDirectRun()) {
  try { runDirect(process.argv.slice(2)); }
  catch (err) {
    process.stderr.write(`eval-cli: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 3;  // D-08: 3 = parse/load (NOT process.exit — CR-02 truncation)
  }
}
```

### Durable-store 4-rung read ladder + validate-before-write
**Source:** `src/governance/test-evidence.ts:166-240` (+ `gate-evidence-store.ts:22-24, 133-168`)
**Apply to:** `src/governance/eval-evidence.ts`
```
writeX:       validate → atomicWriteFile (NEVER write malformed)
readX:        existsSync? → readFileSync → JSON.parse → assertX (validate + phase check)
fail():       throw `malformed X at <absPath>: <detail>` (never return undefined)
assertX:      validateX(value) → record.phase === phaseNumber (cross-phase leakage guard)
```

### Ajv 2020 + `x-binding` keyword (validator instance)
**Source:** `src/enforcement/validate-approval.ts:24-44` + `src/governance/test-evidence.ts:60-63`
**Apply to:** `src/enforcement/validate-eval-report.ts` (standalone) OR inline in `src/governance/eval-evidence.ts` (recommended)
```typescript
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });  // MANDATORY pre-compile
const validate: ValidateFunction = ajv.compile(schema);
```
**Duplication intentional** (09-01) — do NOT extract shared module.

### Atomic write (TD-03 unique temp suffix)
**Source:** `src/governance/atomic-write.ts:29-41`
**Apply to:** `src/governance/eval-evidence.ts` (writeEvalEvidence + writeEvalReportMarkdown)
```typescript
import { atomicWriteFile } from "./atomic-write.js";
atomicWriteFile(filePath, JSON.stringify(report, null, 2));  // .<pid>-<uuid>.tmp then rename
```

### Path helper + PHASE_NUMBER_RE
**Source:** `src/governance/paths.ts:16, 81-92`
**Apply to:** `src/governance/paths.ts` (extend)
```typescript
const PHASE_NUMBER_RE = /^\d{2}(?:\.\d+)?$/;  // already defined — reuse
// Throw on invalid phase (path-traversal guard — rejects ".." / absolute paths)
if (!PHASE_NUMBER_RE.test(phaseNumber)) { throw new Error(`invalid X phase number: ${phaseNumber}`); }
```

### Ship-gate fail-closed prior-evidence read
**Source:** `src/governance/ship-gate-hook.ts:26-38` (readRequiredEvidence) + `47-53` (assertNonBlocking)
**Apply to:** `src/governance/ship-gate-hook.ts` (add readEvalOrFail + assertNoFailedEval)
```
readXOrFail:   null → throw "ship gate: missing X evidence <path>"
assertX:       failed → throw "ship gate: X evidence failed - <details>"
               no ship evidence written (fail-closed ordering)
```

### CLI command shim + parseArgs
**Source:** `src/cli/commands/build-index.ts:1-32` + `src/cli/index.ts:12-32`
**Apply to:** `src/cli/commands/eval.ts` + `src/cli/index.ts` (register case)
- `parseArgs({ options, allowPositionals: <true for eval — phaseNumber positional> })`
- Lazy import in dispatcher switch: `(await import("./commands/eval.js")).run(rest)`
- Append usage line to default branch stderr

### node:test + node:assert/strict + mkdtempSync temp root
**Source:** `src/governance/capture-test-evidence.test.ts:14-47` + `ship-gate-hook.test.ts:1-35`
**Apply to:** all new test files
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os"; import path from "node:path";

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-<suite>-"));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
```
SpawnSync the compiled dist entry for end-to-end exit-code tests (mirrors `ship-gate-hook.test.ts:315-323`):
```typescript
const RUNNER = path.resolve(process.cwd(), "dist-test", "select", "eval-cli.js");
const child = spawnSync(process.execPath, [RUNNER, root, "10"], { encoding: "utf8" });
assert.equal(child.status, 2);  // D-08 critical-recall regression
```

### Determinism (D-14)
**Source:** RESEARCH §Pitfall 2 + `eval-harness.ts:81-93` (already pure)
**Apply to:** `eval-cli.ts`
- Sort cases by `name` BEFORE `runCases` (D-14)
- `select()` already sorts selected/skipped by id (select.ts:304-305)
- `scoreCase`/`aggregate` use Sets — order-independent
- `capturedAt` is the ONLY expected diff between two runs; assert string-compare equal modulo that field
- Severity sourced from index ground truth inside `aggregate` (eval-harness.ts:123) — NOT from selection (Pitfall 3)

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | Every Phase 10 file has a 1:1 in-repo analog. |

The two genuinely net-new concepts — the `EvalReport` shape and the `{NN}-report.md` markdown writer — have no direct analog but are trivial extensions: the report shape is a new schema (template: `test-evidence.schema.json`); the markdown writer is `atomicWriteFile(path, markdownString)` (one-liner over existing helper).

## Metadata

**Analog search scope:**
- `src/governance/` (capture-test-evidence.ts, test-evidence.ts, ship-gate-hook.ts, gate-evidence-store.ts, atomic-write.ts, paths.ts)
- `src/enforcement/` (validate-approval.ts, validate-approval.test.ts)
- `src/schema/` (test-evidence.schema.json, approval.schema.json)
- `src/cli/` (index.ts, commands/select.ts, commands/build-index.ts)
- `src/select/` (eval-harness.ts, recall.test.ts)
- `.claude/skills/aidlc-governance-verify/` (SKILL.md)
- `package.json`, `src/index.ts`

**Files scanned:** 14 analog files (all listed in `<canonical_refs>` of CONTEXT.md)
**Pattern extraction date:** 2026-07-08
**Confidence:** HIGH — every excerpt verified against source via Read; line numbers cited match.
