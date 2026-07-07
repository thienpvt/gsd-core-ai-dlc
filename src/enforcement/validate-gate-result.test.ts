/**
 * ENF-02 runtime integrity gate — table-driven acceptance/rejection.
 *
 * Drives the gate-result contract: closed status/gateId/severity enums, the
 * required top-level set, the closed top-level shape (additionalProperties
 * false), and the TD-01 strict ISO-8601 contract on `evaluatedAt`. Tests run
 * against the COMPILED validator (dist-test/enforcement/validate-gate-result.js)
 * — the same artifact runAdapter (07-04) wires into the evaluate() boundary.
 *
 * RED note: the module under test does not exist yet — import resolves to
 * undefined and every case fails. Task 2 turns them GREEN. The schema JSON is
 * deliberately never pasted here — the schema is the system under test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGateResult } from "./validate-gate-result.js";

/** Required top-level fields (ENF-02 gate-result contract). Data so the loop names each one. */
const REQUIRED_FIELDS = [
  "gateId",
  "status",
  "findings",
  "evaluatedBy",
  "evaluatedAt",
] as const;

/**
 * A fresh, fully-valid gate-result per call — a new literal every time so a
 * mutation in one case never leaks into another (no shared nested references).
 * Mirrors the makeValidFrontmatter / makeValidSignal helper convention.
 */
function makeValidGateResult(): Record<string, unknown> {
  return {
    gateId: "verify",
    status: "pass",
    findings: [],
    evaluatedBy: "semgrep",
    evaluatedAt: "2026-07-07T00:00:00.000Z",
  };
}

test("the validator is compiled once at module load", () => {
  // If the schema failed to compile under Ajv strict, importing the module
  // would have thrown and this whole file would fail to load.
  assert.equal(typeof validateGateResult, "function");
});

test("accepts a valid gate-result", () => {
  assert.doesNotThrow(() => validateGateResult(makeValidGateResult()));
});

test("accepts a gate-result with findings", () => {
  const r = makeValidGateResult();
  r.findings = [
    {
      id: "F-1",
      severity: "high",
      message: "eval in source",
      evidence: { path: "src/foo.ts", lineRange: [10, 12] },
    },
  ];
  assert.doesNotThrow(() => validateGateResult(r));
});

test("accepts a waived status", () => {
  const r = makeValidGateResult();
  r.status = "waived";
  assert.doesNotThrow(() => validateGateResult(r));
});

for (const field of REQUIRED_FIELDS) {
  test(`rejects gate-result missing required field: ${field}`, () => {
    const r = makeValidGateResult();
    delete r[field];
    assert.throws(
      () => validateGateResult(r),
      (err: Error) => {
        assert.ok(
          err.message.includes("invalid gate-result"),
          `error should be prefixed 'invalid gate-result', got:\n${err.message}`,
        );
        return true;
      },
      `missing '${field}' must be rejected`,
    );
  });
}

test("rejects a status out of enum (maybe)", () => {
  const r = makeValidGateResult();
  r.status = "maybe";
  assert.throws(() => validateGateResult(r));
});

test("rejects a gateId out of enum (review)", () => {
  const r = makeValidGateResult();
  r.gateId = "review";
  assert.throws(() => validateGateResult(r));
});

test("rejects a malformed ISO-8601 evaluatedAt (2026/07/07)", () => {
  const r = makeValidGateResult();
  // Slashes are not ISO-8601 separators — the date-time format check must fire.
  r.evaluatedAt = "2026/07/07";
  assert.throws(() => validateGateResult(r));
});

test("rejects evaluatedAt without milliseconds", () => {
  const r = makeValidGateResult();
  r.evaluatedAt = "2026-07-07T00:00:00Z";
  assert.throws(() => validateGateResult(r));
});

test("rejects evaluatedAt with a non-UTC offset", () => {
  const r = makeValidGateResult();
  r.evaluatedAt = "2026-07-07T00:00:00.000+07:00";
  assert.throws(() => validateGateResult(r));
});

test("rejects a finding missing required field id", () => {
  const r = makeValidGateResult();
  r.findings = [{ severity: "high", message: "x" }];
  assert.throws(() => validateGateResult(r));
});

test("rejects an unknown top-level key (additionalProperties false)", () => {
  const r = makeValidGateResult();
  (r as Record<string, unknown>).extra = 1;
  assert.throws(() => validateGateResult(r));
});

test("rejects inverted evidence lineRange", () => {
  const r = makeValidGateResult();
  r.findings = [
    {
      id: "F-1",
      severity: "high",
      message: "x",
      evidence: { path: "src/foo.ts", lineRange: [10, 2] },
    },
  ];
  assert.throws(() => validateGateResult(r), /lineRange start/);
});

test("accepts single-line evidence lineRange", () => {
  const r = makeValidGateResult();
  r.findings = [
    {
      id: "F-1",
      severity: "high",
      message: "x",
      evidence: { path: "src/foo.ts", lineRange: [10, 10] },
    },
  ];
  assert.doesNotThrow(() => validateGateResult(r));
});

test("rejects a finding with severity out of enum (blocker)", () => {
  const r = makeValidGateResult();
  r.findings = [{ id: "F-1", severity: "blocker", message: "x" }];
  assert.throws(() => validateGateResult(r));
});

test("throws with a message naming the failing instancePath", () => {
  // On a missing required field, the thrown Error.message must surface the
  // field name (either via instancePath or params.missingProperty) so the
  // ENF-02 failure is actionable — not a bare "schema rejected".
  const r = makeValidGateResult();
  delete r.status;
  assert.throws(
    () => validateGateResult(r),
    /invalid gate-result:[\s\S]*status/,
  );
});
