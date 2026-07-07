/**
 * AUDIT-04 test-evidence capture (D-01, D-02, D-03, D-04).
 *
 * Parser half (net-new — no codebase analog per 09-PATTERNS.md "No Analog
 * Found"): `parseTapSummary` is a pure transform over `node --test
 * --test-reporter=tap` stdout. The `# tests N` summary line is the load-bearing
 * guard — absence = malformed = throw (D-04). Model-authored narration
 * ("All tests passed.") has no `# tests N` line and is rejected (D-03). Pure
 * function, no I/O — testable in isolation.
 *
 * Store half: clones gate-evidence-store.ts / approval-store.ts 1:1 (atomic
 * write + 4-rung loud-fail read ladder: existsSync→null / try-readFileSync /
 * try-JSON.parse / assertTestEvidence). The validator is inline
 * `validateTestEvidence` (Ajv 2020 + x-binding keyword pre-compile — the 6th
 * instance of the validate.ts pattern). Inline by design: this is the only
 * consumer of the test-evidence schema and the pattern is identical to
 * validate-approval.ts from Plan 01.
 *
 * Runner const: `"node --test --test-reporter=tap"` is the AUDIT-04 trust
 * boundary — anything else fails closed (D-04). Reconciliation of CONTEXT
 * D-01's "run-tests.cjs" naming: no such file exists locally; the actual `npm
 * test` runner is `node --test` with the TAP reporter (the default).
 */
import { existsSync, readFileSync } from "node:fs";
import { atomicWriteFile } from "./atomic-write.js";
import { testEvidencePath } from "./paths.js";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — this module emits a CommonJS require();
// resolveJsonModule handles the JSON import and import attributes are illegal on require().
import schema from "../schema/test-evidence.schema.json";

/** Parsed TAP summary block — the AUDIT-04 tests_executed shape embedded in the v2 audit. */
export interface TestEvidenceSummary {
  total: number;
  pass: number;
  fail: number;
  skipped: number;
  duration_ms: number;
}

/**
 * Durable test-evidence record (D-02). Persisted under
 * `.planning/governance/tests/{NN}.json`. `runner` is the const string — the
 * trust boundary is explicit in the persisted record (T-09-02-02).
 */
export interface TestEvidenceRecord {
  phase: string;
  capturedAt: string;
  runner: "node --test --test-reporter=tap";
  summary: TestEvidenceSummary;
}

// ---------------------------------------------------------------------------
// Inline validator — 6th instance of the validate.ts pattern. Duplicated by
// design (one crash doesn't take down sibling validators — same rationale as
// validate-approval.ts / validate-gate-result.ts).
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
 * Assert `result` is a schema-valid {@link TestEvidenceRecord}; throw otherwise.
 * Throws `invalid test evidence:\n<formatErrors lines>` so the AUDIT-04
 * failure is actionable. Post-Ajv defense-in-depth: summary counts are
 * non-negative integers (Ajv enforces via `minimum: 0` / `type: integer` but
 * the assert is kept for the same defense-in-depth reason as
 * gate-evidence-store's metadata-phase check).
 */
export function validateTestEvidence(result: unknown): asserts result is TestEvidenceRecord {
  if (!validate(result)) {
    throw new Error(`invalid test evidence:\n${formatErrors(validate.errors)}`);
  }
  const record = result as TestEvidenceRecord;
  // Defense-in-depth — Ajv already enforces non-negative integers. Confirms the
  // summary shape post-Ajv so a tampered intermediate can't slip through.
  const s = record.summary;
  if (
    !Number.isInteger(s.total) || s.total < 0 ||
    !Number.isInteger(s.pass) || s.pass < 0 ||
    !Number.isInteger(s.fail) || s.fail < 0 ||
    !Number.isInteger(s.skipped) || s.skipped < 0 ||
    typeof s.duration_ms !== "number" || s.duration_ms < 0
  ) {
    throw new Error(`invalid test evidence: summary counts must be non-negative`);
  }
}

// ---------------------------------------------------------------------------
// Parser half — pure function, no I/O.
// ---------------------------------------------------------------------------

/**
 * Regex over the TAP summary block. The `/m` flag anchors `^#` to line starts;
 * `/g` lets `exec` walk all summary lines. Captures the key (tests|pass|fail|
 * skipped|todo|cancelled|duration_ms) and a numeric value (integer or decimal).
 */
const TAP_SUMMARY_RE = /^# (tests|pass|fail|skipped|todo|cancelled|duration_ms) (\d+(?:\.\d+)?)/gm;

/**
 * Parse `node --test --test-reporter=tap` stdout and extract the summary block
 * ({total, pass, fail, skipped, duration_ms}). Pure function — no I/O.
 *
 * D-04 guard: if the `# tests N` summary line is absent or non-numeric, the
 * input is malformed runner output and the function throws. This is the
 * narration-rejection boundary (D-03): model-authored prose has no `# tests N`
 * line.
 *
 * Missing `# pass` / `# fail` / `# skipped` / `# duration_ms` default to 0 —
 * `# tests N` is the only load-bearing line (the total). A TAP run with zero
 * skips still emits `# skipped 0`, but if a future reporter variant drops it,
 * `?? 0` keeps the parser robust without weakening the guard.
 */
export function parseTapSummary(stdout: string): TestEvidenceSummary {
  const counts: Record<string, number> = {};
  // Reset lastIndex — `g` flag makes the regex stateful; a second call on the
  // same input must start from the top (determinism test asserts deepEqual).
  TAP_SUMMARY_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAP_SUMMARY_RE.exec(stdout)) !== null) {
    counts[match[1]] = Number(match[2]);
  }
  // D-04 + D-03: missing `# tests N` summary line = malformed = hard fail.
  if (counts.tests === undefined || !Number.isFinite(counts.tests)) {
    throw new Error("malformed test runner output: missing `# tests N` summary line");
  }
  return {
    total: counts.tests,
    pass: counts.pass ?? 0,
    fail: counts.fail ?? 0,
    skipped: counts.skipped ?? 0,
    duration_ms: counts.duration_ms ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Store half — clone of gate-evidence-store.ts / approval-store.ts.
// ---------------------------------------------------------------------------

function fail(filePath: string, detail: string): never {
  throw new Error(`malformed test evidence at ${filePath}: ${detail}`);
}

/**
 * Assert `value` is a well-formed TestEvidenceRecord. Delegates structural
 * validation to {@link validateTestEvidence} (Ajv 2020), then enforces the
 * per-store metadata contract: the record's `phase` field MUST match the path
 * phaseNumber — no cross-phase leakage (mirrors gate-evidence-store's
 * metadata-phase check).
 */
function assertTestEvidence(
  value: unknown,
  filePath: string,
  phaseNumber: string,
): asserts value is TestEvidenceRecord {
  try {
    validateTestEvidence(value);
  } catch (err) {
    fail(filePath, String(err));
  }
  const record = value as TestEvidenceRecord;
  if (record.phase !== phaseNumber) {
    fail(filePath, `phase must be ${phaseNumber}`);
  }
}

/**
 * Atomically write a test-evidence record to
 * `.planning/governance/tests/{NN}.json`. Validates BEFORE write so a
 * malformed record never lands on disk (TD-03 atomic write eliminates the
 * concurrent-write race).
 */
export function writeTestEvidence(
  projectRoot: string,
  phaseNumber: string,
  record: TestEvidenceRecord,
): void {
  const filePath = testEvidencePath(projectRoot, phaseNumber);
  assertTestEvidence(record, filePath, phaseNumber);
  atomicWriteFile(filePath, JSON.stringify(record, null, 2));
}

/**
 * Read a test-evidence record from `.planning/governance/tests/{NN}.json`.
 *
 * Returns null when the file is absent (the legitimate pre-verify state).
 * Throws `malformed test evidence at <absPath>: <detail>` when the file exists
 * but is unreadable, contains invalid JSON, or fails shape validation — the
 * 4-rung loud-fail ladder mirrors readGateEvidence / readApproval.
 */
export function readTestEvidence(
  projectRoot: string,
  phaseNumber: string,
): TestEvidenceRecord | null {
  const filePath = testEvidencePath(projectRoot, phaseNumber);
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

  assertTestEvidence(parsed, filePath, phaseNumber);
  return parsed;
}