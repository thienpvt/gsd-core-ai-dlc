/**
 * SEL-06 eval-evidence store (D-07, D-09, D-11) — clone of test-evidence.ts 1:1.
 *
 * Inline validator (`validateEvalReport`) is the 7th instance of the validate.ts
 * pattern (Ajv 2020 + x-binding keyword pre-compile + formatErrors). Inline by
 * design: this is the only consumer of the eval-report schema and the pattern
 * is identical to test-evidence.ts (one-consumer rule). formatErrors duplication
 * across the 7 validators is INTENTIONAL crash-isolation (09-01 decision — one
 * crash doesn't take down sibling validators); do NOT extract a shared module.
 *
 * 4-rung loud-fail read ladder mirrors readTestEvidence / readGateEvidence /
 * readApproval: existsSync→null / try-readFileSync / try-JSON.parse /
 * assertEvalEvidence (validate + cross-phase check). Validate-before-write so a
 * malformed record never lands on disk (TD-03 atomic write eliminates the
 * concurrent-write race — T-10-06).
 *
 * D-05 post-Ajv invariant: `criticalRecall` must be a finite number in [0,1]. A
 * tampered persisted record with NaN/Infinity slips past the schema's
 * `type:number` but cannot pass this runtime check — the gate reads its value
 * from the persisted record, so the runtime check is load-bearing (T-10-03).
 */
import { existsSync, readFileSync } from "node:fs";
import { atomicWriteFile } from "./atomic-write.js";
import { evalEvidencePath, evalReportPath } from "./paths.js";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — this module emits a CommonJS require();
// resolveJsonModule handles the JSON import and import attributes are illegal on require().
import schema from "../schema/eval-report.schema.json";
import type { Aggregate } from "../select/eval-harness.js";

/** A per-case TP/FP/FN row in the persisted report (D-10 per-case table source). */
export interface EvalCaseRow {
  name: string;
  selectedIds: string[];
  expectedRuleIds: string[];
  tp: number;
  fp: number;
  fn: number;
}

/** Under-injection signal (D-05): expected ids of a severity not selected, per case. */
export interface CriticalMiss {
  case: string;
  expectedNotSelected: string[];
  severity: "critical" | "high" | "medium" | "low";
}

/** Over-injection signal (D-06, advisory only — NEVER gates): selected ids not in expected, per case. */
export interface PrecisionOffender {
  case: string;
  extraSelected: string[];
}

/**
 * Durable eval-evidence record (D-09). Persisted under
 * `.planning/governance/eval/{NN}.json`. `aggregate.recallBySeverity.critical`
 * is the D-05 ship-blocking floor (=== 1.0); `criticalMisses` names the
 * under-injection; `precisionOffenders` is advisory. `corpusHash` pins the
 * eval-set version (D-14 reproducibility).
 */
export interface EvalReport {
  phase: string;
  capturedAt: string;
  aggregate: Aggregate;
  cases: EvalCaseRow[];
  criticalMisses: CriticalMiss[];
  precisionOffenders: PrecisionOffender[];
  corpusHash: string;
}

// ---------------------------------------------------------------------------
// Inline validator — 7th instance of the validate.ts pattern. Duplicated by
// design (one crash doesn't take down sibling validators).
// ---------------------------------------------------------------------------

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });
const validate: ValidateFunction = ajv.compile(schema);

function formatErrors(errors: ValidateFunction["errors"]): string {
  if (!errors || errors.length === 0) {
    return "unknown validation error";
  }
  return errors
    .map((e) => {
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
    })
    .join("\n");
}

/**
 * Assert `result` is a schema-valid {@link EvalReport}; throw otherwise. Throws
 * `invalid eval-report:\n<formatErrors lines>` so the SEL-06 failure is
 * actionable. Post-Ajv D-05 invariant (T-10-03): criticalRecall must be a finite
 * number — a tampered NaN/Infinity slips past `type:number` but cannot pass this
 * check (the ship gate reads criticalRecall from the persisted record).
 */
export function validateEvalReport(result: unknown): asserts result is EvalReport {
  if (!validate(result)) {
    throw new Error(`invalid eval-report:\n${formatErrors(validate.errors)}`);
  }
  const r = result as EvalReport;
  // D-05 post-Ajv invariant: criticalRecall must be finite. NaN/Infinity slip
  // past the schema's `type:number` (Ajv accepts them as numeric); the ship
  // gate reads this value from the persisted record, so the runtime check is
  // load-bearing against a tampered-on-disk record (T-10-03).
  if (!Number.isFinite(r.aggregate.recallBySeverity.critical)) {
    throw new Error(`invalid eval-report: criticalRecall must be finite`);
  }
}

// ---------------------------------------------------------------------------
// Store half — clone of test-evidence.ts (4-rung loud-fail read ladder).
// ---------------------------------------------------------------------------

function fail(filePath: string, detail: string): never {
  throw new Error(`malformed eval evidence at ${filePath}: ${detail}`);
}

/**
 * Assert `value` is a well-formed EvalReport. Delegates structural validation
 * to {@link validateEvalReport} (Ajv 2020), then enforces the per-store
 * metadata contract: the record's `phase` field MUST match the path
 * phaseNumber — no cross-phase leakage (mirrors gate-evidence-store's
 * metadata-phase check, T-10-01).
 */
function assertEvalEvidence(
  value: unknown,
  filePath: string,
  phaseNumber: string,
): asserts value is EvalReport {
  try {
    validateEvalReport(value);
  } catch (err) {
    fail(filePath, String(err));
  }
  const record = value as EvalReport;
  if (record.phase !== phaseNumber) {
    fail(filePath, `phase must be ${phaseNumber}`);
  }
}

/**
 * Atomically write an eval-evidence record to
 * `.planning/governance/eval/{NN}.json`. Validates BEFORE write so a malformed
 * record never lands on disk (TD-03 atomic write eliminates the
 * concurrent-write race — T-10-06).
 */
export function writeEvalEvidence(
  projectRoot: string,
  phaseNumber: string,
  report: EvalReport,
): void {
  const filePath = evalEvidencePath(projectRoot, phaseNumber);
  assertEvalEvidence(report, filePath, phaseNumber);
  atomicWriteFile(filePath, JSON.stringify(report, null, 2));
}

/**
 * Read an eval-evidence record from `.planning/governance/eval/{NN}.json`.
 *
 * Returns null when the file is absent (the legitimate pre-verify state —
 * before the harness has run for a phase). Throws `malformed eval evidence at
 * <absPath>: <detail>` when the file exists but is unreadable, contains
 * invalid JSON, or fails shape validation — the 4-rung loud-fail ladder
 * mirrors readTestEvidence / readGateEvidence / readApproval.
 */
export function readEvalEvidence(
  projectRoot: string,
  phaseNumber: string,
): EvalReport | null {
  const filePath = evalEvidencePath(projectRoot, phaseNumber);
  if (!existsSync(filePath)) return null;

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    fail(filePath, `unreadable (${String(err)})`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(filePath, String(err));
  }

  assertEvalEvidence(parsed, filePath, phaseNumber);
  return parsed;
}

/**
 * Atomically write the human-readable markdown report to
 * `.planning/governance/eval/{NN}-report.md` (D-09, D-10). One-liner over
 * atomicWriteFile — the markdown string is produced by eval-cli.renderMarkdown
 * and is not schema-validated (it is a display artifact, not durable state).
 */
export function writeEvalReportMarkdown(
  projectRoot: string,
  phaseNumber: string,
  markdown: string,
): void {
  atomicWriteFile(evalReportPath(projectRoot, phaseNumber), markdown);
}