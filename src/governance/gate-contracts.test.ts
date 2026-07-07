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
import { validateGateResult } from "../enforcement/validate-gate-result.js";
import { runAdapter } from "../enforcement/run-adapter.js";
import { type GateAdapter, noopAdapter } from "../enforcement/adapters.js";
import type { GateRequest } from "../enforcement/types.js";

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

function makeValidAppliedRule(): Record<string, unknown> {
  return {
    id: "require-mfa",
    severity: "critical",
    summary: "All access requires MFA.",
    matchedAxis: "always-in-phase",
    matchedValue: "always-in-phase",
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

test("gate-request schema accepts a valid fixture with one applied rule", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(gateRequestSchema);
  const request = makeValidGateRequest();
  request.rules = [makeValidAppliedRule()];
  assert.equal(
    validate(request),
    true,
    `errors: ${JSON.stringify(validate.errors)}`,
  );
});

test("gate-request schema rejects non-TD-01 requestedAt variants", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(gateRequestSchema);
  for (const requestedAt of [
    "2026-07-07T00:00:00Z",
    "2026-07-07T00:00:00.000+07:00",
  ]) {
    const request = makeValidGateRequest();
    request.requestedAt = requestedAt;
    assert.equal(validate(request), false, requestedAt);
  }
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

test("gate-result schema rejects non-TD-01 evaluatedAt variants", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(gateResultSchema);
  for (const evaluatedAt of [
    "2026-07-07T00:00:00Z",
    "2026-07-07T00:00:00.000+07:00",
  ]) {
    const result = makeValidGateResult();
    result.evaluatedAt = evaluatedAt;
    assert.equal(validate(result), false, evaluatedAt);
  }
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

test("audit-artifact schema rejects non-TD-01 selection_timestamp variants", () => {
  const ajv = makeAjv();
  const validate = ajv.compile(auditArtifactSchema);
  for (const selectionTimestamp of [
    "2026-07-07T00:00:00Z",
    "2026-07-07T00:00:00.000+07:00",
  ]) {
    const audit = makeValidGovernanceAudit();
    audit.selection_timestamp = selectionTimestamp;
    assert.equal(validate(audit), false, selectionTimestamp);
  }
});

test("validateGateResult accepts a valid GateResult", () => {
  assert.doesNotThrow(() => validateGateResult(makeValidGateResult()));
});

test("validateGateResult throws on status out of enum (maybe)", () => {
  const r = makeValidGateResult();
  r.status = "maybe";
  assert.throws(() => validateGateResult(r), /invalid gate-result/);
});

test("validateGateResult throws on missing required field evaluatedAt", () => {
  const r = makeValidGateResult();
  delete r.evaluatedAt;
  assert.throws(() => validateGateResult(r), /evaluatedAt|missing/);
});

test("validateGateResult throws on bad ISO-8601 evaluatedAt", () => {
  const r = makeValidGateResult();
  r.evaluatedAt = "2026/07/07";
  assert.throws(() => validateGateResult(r), /invalid gate-result|evaluatedAt/);
});

test("validateGateResult throws on extra property", () => {
  const r = makeValidGateResult();
  (r as Record<string, unknown>).extra = 1;
  assert.throws(() => validateGateResult(r), /invalid gate-result|extra/);
});

test("validateGateResult throws on gateId out of enum", () => {
  const r = makeValidGateResult();
  r.gateId = "review";
  assert.throws(() => validateGateResult(r), /invalid gate-result/);
});

test("validateGateResult throws on finding severity out of enum", () => {
  const r = makeValidGateResult();
  r.findings = [{ id: "F-1", severity: "blocker", message: "x" }];
  assert.throws(() => validateGateResult(r), /invalid gate-result/);
});

test("runAdapter throws on a malformed adapter result (boundary proof)", async () => {
  const bad = {
    name: "bad",
    async evaluate() {
      return {
        gateId: "verify",
        status: "maybe",
        findings: [],
        evaluatedBy: "bad",
        evaluatedAt: "2026-07-07T00:00:00.000Z",
      };
    },
  } as unknown as GateAdapter;
  await assert.rejects(
    runAdapter(bad, makeValidGateRequest() as unknown as GateRequest),
    /invalid gate-result/,
  );
});

test("runAdapter returns a validated result from a noop adapter", async () => {
  const r = await runAdapter(
    noopAdapter("semgrep"),
    makeValidGateRequest() as unknown as GateRequest,
  );
  assert.equal(r.status, "pass");
});
