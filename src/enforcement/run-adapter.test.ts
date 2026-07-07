import { test } from "node:test";
import assert from "node:assert/strict";
import { runAdapter } from "./run-adapter.js";
import { type GateAdapter, noopAdapter, echoAdapter } from "./adapters.js";
import type { GateRequest } from "./types.js";

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

test("runAdapter returns a valid GateResult from a noop adapter", async () => {
  const r = await runAdapter(noopAdapter("semgrep"), makeValidGateRequest());
  assert.equal(r.status, "pass");
  assert.equal(r.findings.length, 0);
});

test("runAdapter returns a valid GateResult from an echo adapter", async () => {
  const r = await runAdapter(echoAdapter("bandit"), makeValidGateRequest());
  assert.equal(r.findings.length, 1);
});

test("runAdapter throws when an adapter returns a status out of enum", async () => {
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
  await assert.rejects(runAdapter(bad, makeValidGateRequest()), /invalid gate-result/);
});

test("runAdapter throws when an adapter returns a missing required field", async () => {
  const bad = {
    name: "bad",
    async evaluate() {
      return { gateId: "verify", status: "pass", findings: [], evaluatedBy: "bad" };
    },
  } as unknown as GateAdapter;
  await assert.rejects(runAdapter(bad, makeValidGateRequest()), /evaluatedAt|missing/);
});

test("runAdapter throws when an adapter returns a bad ISO-8601 evaluatedAt", async () => {
  const bad = {
    name: "bad",
    async evaluate() {
      return {
        gateId: "verify",
        status: "pass",
        findings: [],
        evaluatedBy: "bad",
        evaluatedAt: "2026/07/07",
      };
    },
  } as unknown as GateAdapter;
  await assert.rejects(
    runAdapter(bad, makeValidGateRequest()),
    /invalid gate-result|evaluatedAt/,
  );
});

test("runAdapter throws when an adapter returns an extra property", async () => {
  const bad = {
    name: "bad",
    async evaluate() {
      return {
        gateId: "verify",
        status: "pass",
        findings: [],
        evaluatedBy: "bad",
        evaluatedAt: "2026-07-07T00:00:00.000Z",
        extra: 1,
      };
    },
  } as unknown as GateAdapter;
  await assert.rejects(runAdapter(bad, makeValidGateRequest()), /invalid gate-result|extra/);
});

test("runAdapter throws when result gateId does not match the request gateId", async () => {
  const bad = {
    name: "semgrep",
    async evaluate() {
      return {
        gateId: "ship",
        status: "pass",
        findings: [],
        evaluatedBy: "semgrep",
        evaluatedAt: "2026-07-07T00:00:00.000Z",
      };
    },
  } as unknown as GateAdapter;
  await assert.rejects(runAdapter(bad, makeValidGateRequest()), /gateId 'ship'/);
});

test("runAdapter throws when result evaluatedBy does not match the adapter name", async () => {
  const bad = {
    name: "semgrep",
    async evaluate() {
      return {
        gateId: "verify",
        status: "pass",
        findings: [],
        evaluatedBy: "human-approval",
        evaluatedAt: "2026-07-07T00:00:00.000Z",
      };
    },
  } as unknown as GateAdapter;
  await assert.rejects(runAdapter(bad, makeValidGateRequest()), /evaluatedBy 'human-approval'/);
});

test("runAdapter propagates the adapter name into the validated result", async () => {
  const r = await runAdapter(noopAdapter("gitleaks"), makeValidGateRequest());
  assert.equal(r.evaluatedBy, "gitleaks");
});

test("runAdapter does NOT catch a thrown evaluate() - adapter runtime errors propagate", async () => {
  const exploding = {
    name: "boom",
    async evaluate() {
      throw new Error("tool crashed");
    },
  } as unknown as GateAdapter;
  await assert.rejects(runAdapter(exploding, makeValidGateRequest()), /tool crashed/);
});
