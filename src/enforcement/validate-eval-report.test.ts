/**
 * SEL-06 eval-report runtime integrity gate — acceptance/rejection over the
 * eval-report schema (D-11).
 *
 * Mirrors validate-approval.test.ts idiom: closed severity/enum, the 7 required
 * top-level fields, the closed top-level shape (additionalProperties false), and
 * the TD-01 strict ISO-8601 contract on capturedAt. Adds D-05-specific post-Ajv
 * invariant tests: criticalRecall must be a finite number in [0,1] (a tampered
 * NaN/Infinity cannot slip through even though the schema declares `type:number`).
 *
 * Home choice: validateEvalReport is INLINE in src/governance/eval-evidence.ts
 * (matches test-evidence.ts — single consumer, one-consumer rule). This test
 * imports from there, NOT from a sibling validate-eval-report.ts.
 *
 * RED note: eval-evidence.ts does not exist yet — import resolves to undefined
 * and every case fails. Task 2 turns them GREEN. The schema JSON is the system
 * under test — never paste the schema inline.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEvalReport } from "../governance/eval-evidence.js";

/** Required top-level fields per eval-report.schema.json (D-09/D-10/D-11). */
const REQUIRED_FIELDS = [
  "phase",
  "capturedAt",
  "aggregate",
  "cases",
  "criticalMisses",
  "precisionOffenders",
  "corpusHash",
] as const;

/**
 * Fresh fully-valid eval report per call. New literal every time so a mutation
 * in one case never leaks into another. criticalRecall=1.0 (passing floor).
 */
function makeValidEvalReport(): Record<string, unknown> {
  return {
    phase: "10",
    capturedAt: "2026-07-08T00:00:00.000Z",
    aggregate: {
      microRecall: 1,
      microPrecision: 0.85,
      recallBySeverity: {
        critical: 1,
        high: 1,
        medium: 0.9,
        low: 0.8,
      },
    },
    cases: [
      {
        name: "keywords-input-validation",
        selectedIds: ["input-validation", "secrets-management"],
        expectedRuleIds: ["input-validation", "secrets-management"],
        tp: 2,
        fp: 0,
        fn: 0,
      },
    ],
    criticalMisses: [],
    precisionOffenders: [],
    corpusHash: "a".repeat(64),
  };
}

test("the validator is compiled once at module load", () => {
  // If the schema failed to compile under Ajv 2020 strict, importing the module
  // would have thrown and this whole file would fail to load.
  assert.equal(typeof validateEvalReport, "function");
});

test("accepts a valid eval report with no critical misses", () => {
  assert.doesNotThrow(() => validateEvalReport(makeValidEvalReport()));
});

for (const field of REQUIRED_FIELDS) {
  test(`rejects eval report missing required field: ${field}`, () => {
    const r = makeValidEvalReport();
    delete r[field];
    assert.throws(
      () => validateEvalReport(r),
      (err: Error) => {
        assert.ok(
          err.message.includes("invalid eval-report"),
          `error should be prefixed 'invalid eval-report', got:\n${err.message}`,
        );
        return true;
      },
      `missing '${field}' must be rejected`,
    );
  });
}

test("rejects an unknown top-level key (additionalProperties false)", () => {
  const r = makeValidEvalReport();
  (r as Record<string, unknown>).extra = 1;
  assert.throws(() => validateEvalReport(r));
});

test("rejects a malformed phase (single digit)", () => {
  const r = makeValidEvalReport();
  r.phase = "1";
  assert.throws(() => validateEvalReport(r));
});

test("rejects a malformed capturedAt without milliseconds", () => {
  const r = makeValidEvalReport();
  r.capturedAt = "2026-07-08T00:00:00Z";
  assert.throws(() => validateEvalReport(r));
});

test("rejects a malformed corpusHash (too short)", () => {
  const r = makeValidEvalReport();
  r.corpusHash = "abc";
  assert.throws(() => validateEvalReport(r));
});

test("rejects a bad severity enum value in criticalMisses", () => {
  const r = makeValidEvalReport();
  (r.criticalMisses as unknown[]).push({
    case: "x",
    expectedNotSelected: ["y"],
    severity: "blocker",
  });
  assert.throws(() => validateEvalReport(r));
});

test("rejects aggregate with an unknown severity key", () => {
  const r = makeValidEvalReport();
  const agg = r.aggregate as Record<string, unknown>;
  const sev = agg.recallBySeverity as Record<string, unknown>;
  sev.blocker = 0.5;
  assert.throws(() => validateEvalReport(r));
});

test("rejects criticalRecall outside [0,1] (schema range)", () => {
  const r = makeValidEvalReport();
  const agg = r.aggregate as Record<string, unknown>;
  const sev = agg.recallBySeverity as Record<string, unknown>;
  sev.critical = 1.5;
  assert.throws(() => validateEvalReport(r));
});

test("rejects an additional property inside aggregate (additionalProperties false)", () => {
  const r = makeValidEvalReport();
  const agg = r.aggregate as Record<string, unknown>;
  agg.extra = 1;
  assert.throws(() => validateEvalReport(r));
});

// D-05 non-finite criticalRecall rejection. Ajv 2020 (draft 2020-12) rejects
// NaN/Infinity at the schema level (`type:number` requires a finite JSON number
// — NaN is not valid JSON). The inline post-Ajv `Number.isFinite` check is
// defense-in-depth: belt-and-suspenders for a future schema loosening or an
// alternate code path that bypasses Ajv. These tests verify BOTH barriers
// reject non-finite values — the criticalRecall field can never hold NaN.

test("D-05 rejects criticalRecall = NaN (schema-level + post-Ajv defense-in-depth)", () => {
  const r = makeValidEvalReport();
  const agg = r.aggregate as Record<string, unknown>;
  const sev = agg.recallBySeverity as Record<string, unknown>;
  sev.critical = NaN;
  assert.throws(() => validateEvalReport(r), /invalid eval-report/);
});

test("D-05 post-Ajv rejects criticalRecall = Infinity", () => {
  const r = makeValidEvalReport();
  const agg = r.aggregate as Record<string, unknown>;
  const sev = agg.recallBySeverity as Record<string, unknown>;
  sev.critical = Infinity;
  assert.throws(() => validateEvalReport(r));
});

test("throws with a message naming the failing instancePath on missing field", () => {
  const r = makeValidEvalReport();
  delete r.corpusHash;
  assert.throws(
    () => validateEvalReport(r),
    /invalid eval-report:[\s\S]*corpusHash/,
  );
});