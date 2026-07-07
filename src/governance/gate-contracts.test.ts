/**
 * Enforcement contract schema-compile + valid-fixture smoke test (ENF-02).
 *
 * 07-01 scope: prove the 3 contract schemas (gate-request, gate-result,
 * audit-artifact) compile under a local Ajv 2020 strict instance and accept
 * well-formed input. 07-04 appends malformed-fixture cases (after
 * validateGateResult + runAdapter exist); those are out of scope here.
 *
 * Runs against a LOCAL Ajv 2020 instance (not the production validator that
 * ships in 07-02) — mirroring src/schema/validate.ts setup, plus the two
 * MANDATORY pre-compile registrations called out in 07-01-PLAN.md:
 *   1. ajv.addKeyword({ keyword: "x-binding", ... }) — Ajv 2020 strict rejects
 *      unknown keywords at compile; all 3 schemas carry x-binding.
 *   2. ajv.addSchema(taskSignalSchema) — gate-request's taskSignal is a $ref
 *      to task-signal.schema.json by $id; Ajv cannot resolve the $ref without
 *      the referenced schema registered first.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import gateRequestSchema from "../schema/gate-request.schema.json";
import gateResultSchema from "../schema/gate-result.schema.json";
import auditArtifactSchema from "../schema/audit-artifact.schema.json";
import taskSignalSchema from "../schema/task-signal.schema.json";

/** Local Ajv 2020 strict instance with the two MANDATORY pre-compile registrations. */
function makeAjv(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  addFormats(ajv);
  // MANDATORY #1: register x-binding as a no-op annotation keyword (Area 3) —
  // Ajv 2020 strict rejects unknown keywords at compile.
  ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });
  // MANDATORY #2: register task-signal schema so gate-request's $ref to its
  // $id (https://gsd.dev/schemas/task-signal.schema.json) resolves.
  ajv.addSchema(taskSignalSchema);
  return ajv;
}

/** Fresh valid gate-request fixture per call (no shared references). */
function makeValidGateRequest(): Record<string, unknown> {
  return {
    gateId: "verify",
    phase: "construction",
    taskSignal: { taskType: "feature", keywords: [], paths: [] },
    rules: [],
    requestedAt: "2026-07-07T00:00:00.000Z",
  };
}

/** Fresh valid gate-result fixture per call (no shared references). */
function makeValidGateResult(): Record<string, unknown> {
  return {
    gateId: "verify",
    status: "pass",
    findings: [],
    evaluatedBy: "semgrep",
    evaluatedAt: "2026-07-07T00:00:00.000Z",
  };
}

/** Fresh valid GovernanceAudit fixture per call — exact GovernanceAudit shape. */
function makeValidGovernanceAudit(): Record<string, unknown> {
  return {
    schema_version: 1,
    phase: "construction",
    riskTier: "baseline",
    selection_timestamp: "2026-07-07T00:00:00.000Z",
    generated_from: ".planning/governance/selection-state.json",
    rules_applied: [],
    rules_skipped: [],
  };
}

test("gate-request schema compiles under Ajv 2020 strict", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(gateRequestSchema);
  assert.equal(typeof validate, "function");
});

test("gate-result schema compiles under Ajv 2020 strict", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(gateResultSchema);
  assert.equal(typeof validate, "function");
});

test("audit-artifact schema compiles under Ajv 2020 strict", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(auditArtifactSchema);
  assert.equal(typeof validate, "function");
});

test("gate-request schema accepts a valid fixture", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(gateRequestSchema);
  assert.equal(
    validate(makeValidGateRequest()),
    true,
    `errors: ${JSON.stringify(validate.errors)}`,
  );
});

test("gate-result schema accepts a valid fixture", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(gateResultSchema);
  assert.equal(
    validate(makeValidGateResult()),
    true,
    `errors: ${JSON.stringify(validate.errors)}`,
  );
});

test("audit-artifact schema accepts a valid GovernanceAudit fixture", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(auditArtifactSchema);
  assert.equal(
    validate(makeValidGovernanceAudit()),
    true,
    `errors: ${JSON.stringify(validate.errors)}`,
  );
});