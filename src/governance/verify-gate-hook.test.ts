import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ECHO_ADAPTERS, type GateAdapter } from "../enforcement/adapters.js";
import type { GateRequest, GateResult } from "../enforcement/types.js";
import {
  deriveRuleGateStatuses,
  verifyGateHook,
} from "./verify-gate-hook.js";
import { readGateEvidence } from "./gate-evidence-store.js";
import { gateEvidencePath } from "./paths.js";
import { type GovernanceRecord, writeSelection } from "./state-store.js";

const STRICT_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-verify-gate-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function record(): GovernanceRecord {
  return {
    phase: "construction",
    taskSignal: {
      taskType: "test",
      keywords: ["verify gate adapter evidence"],
      paths: ["src/governance/verify-gate-hook.ts"],
    },
    selectionConfig: { phase: "construction", domains: [] },
    selectionResult: {
      selected: [
        {
          id: "require-mfa",
          severity: "critical",
          summary: "Protect privileged access with MFA.",
          matchedAxis: "always-in-phase",
          matchedValue: "always-in-phase",
        },
        {
          id: "require-logging",
          severity: "high",
          summary: "Record security-relevant events.",
          matchedAxis: "paths",
          matchedValue: "src/governance/verify-gate-hook.ts",
        },
      ],
      skipped: [],
    },
    riskTier: "critical",
    timestamp: "2026-07-07T00:00:00.000Z",
  };
}

function requestForRules(ruleIds: string[]): GateRequest {
  return {
    gateId: "verify",
    phase: "construction",
    taskSignal: { taskType: "test", keywords: [], paths: [] },
    rules: ruleIds.map((id) => ({
      id,
      severity: "high",
      summary: `${id} summary`,
      matchedAxis: "always-in-phase",
      matchedValue: "always-in-phase",
    })),
    requestedAt: "2026-07-07T00:00:00.000Z",
  };
}

function result(status: GateResult["status"], findingIds: string[]): GateResult {
  return {
    gateId: "verify",
    status,
    findings: findingIds.map((id) => ({
      id,
      severity: "high",
      message: `${id} finding`,
    })),
    evaluatedBy: "fixture",
    evaluatedAt: "2026-07-07T00:00:00.000Z",
  };
}

test("verifyGateHook defaults to ADAPTERS generic-exit-ci and writes validated pass evidence", async () => {
  await withTempRoot(async (root) => {
    const seeded = record();
    writeSelection(seeded, root);

    const hookResult = await verifyGateHook({ projectRoot: root, phaseNumber: "08" });
    const evidence = readGateEvidence(root, "08", "verify");

    assert.ok(evidence, "expected persisted verify evidence");
    assert.deepEqual(hookResult.evidence, evidence);
    assert.equal(evidence.request.gateId, "verify");
    assert.equal(evidence.request.phase, seeded.phase);
    assert.deepEqual(evidence.request.taskSignal, seeded.taskSignal);
    assert.deepEqual(evidence.request.rules, seeded.selectionResult.selected);
    assert.match(evidence.request.requestedAt, STRICT_ISO);
    assert.equal(evidence.result.status, "pass");
    assert.equal(evidence.result.evaluatedBy, "generic-exit-ci");
    assert.deepEqual(evidence.result.findings, []);
    assert.equal(evidence.metadata.phase, "08");
    assert.equal(evidence.metadata.source, "aidlc-governance-verify");
    assert.match(evidence.metadata.writtenAt, STRICT_ISO);
    assert.deepEqual(
      hookResult.ruleStatuses.map((entry: { status: string }) => entry.status),
      ["pass", "pass"],
    );
  });
});

test("verifyGateHook rejects malformed adapter output through runAdapter and writes no evidence", async () => {
  await withTempRoot(async (root) => {
    writeSelection(record(), root);
    const badAdapter = {
      name: "bad-adapter",
      async evaluate() {
        return {
          gateId: "verify",
          status: "maybe",
          findings: [],
          evaluatedBy: "bad-adapter",
          evaluatedAt: "2026-07-07T00:00:00.000Z",
        };
      },
    } as unknown as GateAdapter;

    await assert.rejects(
      verifyGateHook({
        projectRoot: root,
        phaseNumber: "08",
        adapterName: "bad-adapter",
        adapters: new Map([["bad-adapter", badAdapter]]),
      }),
      /invalid gate-result/,
    );
    assert.equal(existsSync(gateEvidencePath(root, "08", "verify")), false);
  });
});

test("verifyGateHook allows injected ECHO_ADAPTERS for tests and persists findings", async () => {
  await withTempRoot(async (root) => {
    writeSelection(record(), root);

    const hookResult = await verifyGateHook({
      projectRoot: root,
      phaseNumber: "08",
      adapterName: "generic-exit-ci",
      adapters: ECHO_ADAPTERS,
    });
    const evidence = readGateEvidence(root, "08", "verify");

    assert.ok(evidence, "expected persisted verify evidence");
    assert.equal(evidence.result.status, "fail");
    assert.deepEqual(
      evidence.result.findings.map((finding) => finding.id),
      ["require-mfa", "require-logging"],
    );
    assert.deepEqual(hookResult.ruleStatuses, [
      { ruleId: "require-mfa", status: "fail", findingIds: ["require-mfa"] },
      { ruleId: "require-logging", status: "fail", findingIds: ["require-logging"] },
    ]);
  });
});

test("verifyGateHook fails loud when selection state is missing and does not synthesize evidence", async () => {
  await withTempRoot(async (root) => {
    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "08" }),
      /verifyGateHook: missing governance selection state at .*selection-state\.json/,
    );
    assert.equal(existsSync(gateEvidencePath(root, "08", "verify")), false);
  });
});

test("deriveRuleGateStatuses maps findings to exact or distinct-token rule ids only", () => {
  const request = requestForRules([
    "require-mfa",
    "require-logging",
    "require-encryption",
    "auth",
  ]);
  const statuses = deriveRuleGateStatuses(
    request,
    result("fail", [
      "require-mfa",
      "scan:require-logging:src",
      "other-rule",
      "oauth-failure",
    ]),
  );

  assert.deepEqual(statuses, [
    { ruleId: "require-mfa", status: "fail", findingIds: ["require-mfa"] },
    {
      ruleId: "require-logging",
      status: "fail",
      findingIds: ["scan:require-logging:src"],
    },
    { ruleId: "require-encryption", status: "pass", findingIds: [] },
    { ruleId: "auth", status: "pass", findingIds: [] },
  ]);
});

test("deriveRuleGateStatuses inherits overall pass or waived when no finding matches", () => {
  assert.deepEqual(deriveRuleGateStatuses(requestForRules(["require-mfa"]), result("pass", [])), [
    { ruleId: "require-mfa", status: "pass", findingIds: [] },
  ]);
  assert.deepEqual(
    deriveRuleGateStatuses(requestForRules(["require-mfa"]), result("waived", [])),
    [{ ruleId: "require-mfa", status: "waived", findingIds: [] }],
  );
});
