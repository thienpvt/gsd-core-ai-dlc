/**
 * ENF-03 GateAdapter stubs and static registries.
 *
 * RED note: the module under test does not exist yet. build:test must fail on
 * the missing adapters import; Task 2 turns these behavior checks GREEN.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type GateAdapter,
  noopAdapter,
  echoAdapter,
  ADAPTERS,
  ECHO_ADAPTERS,
  STUB_NAMES,
} from "./adapters.js";
import type { GateRequest } from "./types.js";

const EXPECTED_STUB_NAMES = [
  "bandit",
  "checkov",
  "generic-exit-ci",
  "gitleaks",
  "grype",
  "human-approval",
  "semgrep",
] as const;

function makeValidGateRequest(): GateRequest {
  return {
    gateId: "verify",
    phase: "construction",
    taskSignal: { taskType: "feature", keywords: [], paths: [] },
    rules: [
      {
        id: "require-mfa",
        severity: "critical",
        summary: "All access requires MFA.",
        matchedAxis: "always-in-phase",
        matchedValue: "always-in-phase",
      },
    ],
    requestedAt: "2026-07-07T00:00:00.000Z",
  };
}

test("noopAdapter returns an adapter with the given name", async () => {
  const adapter: GateAdapter = noopAdapter("semgrep");
  assert.equal(adapter.name, "semgrep");
});

test("noopAdapter.evaluate returns pass with empty findings", async () => {
  const result = await noopAdapter("semgrep").evaluate(makeValidGateRequest());
  assert.equal(result.status, "pass");
  assert.equal(result.findings.length, 0);
});

test("noopAdapter.evaluate sets evaluatedBy to the adapter name", async () => {
  const result = await noopAdapter("semgrep").evaluate(makeValidGateRequest());
  assert.equal(result.evaluatedBy, "semgrep");
});

test("noopAdapter.evaluate preserves the request gateId", async () => {
  const result = await noopAdapter("semgrep").evaluate(makeValidGateRequest());
  assert.equal(result.gateId, "verify");
});

test("noopAdapter.evaluate sets a valid ISO-8601 evaluatedAt", async () => {
  const result = await noopAdapter("semgrep").evaluate(makeValidGateRequest());
  assert.match(result.evaluatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("echoAdapter returns an adapter with the given name", async () => {
  const adapter: GateAdapter = echoAdapter("bandit");
  assert.equal(adapter.name, "bandit");
});

test("echoAdapter.evaluate mirrors request.rules as findings", async () => {
  const result = await echoAdapter("bandit").evaluate(makeValidGateRequest());
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0]?.id, "require-mfa");
  assert.equal(result.findings[0]?.severity, "critical");
});

test("echoAdapter.evaluate sets evaluatedBy to the adapter name", async () => {
  const result = await echoAdapter("bandit").evaluate(makeValidGateRequest());
  assert.equal(result.evaluatedBy, "bandit");
});

test("ADAPTERS Map has exactly 7 entries keyed by stub name", async () => {
  assert.equal(ADAPTERS.size, 7);
  assert.deepEqual([...ADAPTERS.keys()].sort(), [...EXPECTED_STUB_NAMES]);
});

for (const name of STUB_NAMES) {
  test(`ADAPTERS has a noop stub for ${name}`, async () => {
    const adapter = ADAPTERS.get(name);
    assert.ok(adapter);
    assert.equal(adapter.name, name);
  });
}

test("ECHO_ADAPTERS Map has exactly 7 entries keyed by stub name", async () => {
  assert.equal(ECHO_ADAPTERS.size, 7);
  assert.deepEqual([...ECHO_ADAPTERS.keys()].sort(), [...EXPECTED_STUB_NAMES]);
});

test("STUB_NAMES contains exactly the 7 AI-DLC-implied names", async () => {
  assert.deepEqual([...STUB_NAMES].sort(), [...EXPECTED_STUB_NAMES]);
});

test("each noop stub in ADAPTERS evaluates to pass", async () => {
  for (const name of STUB_NAMES) {
    const adapter = ADAPTERS.get(name);
    assert.ok(adapter);
    const result = await adapter.evaluate(makeValidGateRequest());
    assert.equal(result.status, "pass", `${name} should pass`);
  }
});

test("each echo stub in ECHO_ADAPTERS mirrors request rules as findings", async () => {
  for (const name of STUB_NAMES) {
    const adapter = ECHO_ADAPTERS.get(name);
    assert.ok(adapter);
    const result = await adapter.evaluate(makeValidGateRequest());
    assert.equal(result.findings.length, 1, `${name} should mirror one rule`);
  }
});
