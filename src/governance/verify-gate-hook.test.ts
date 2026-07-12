import { test } from "node:test";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { ECHO_ADAPTERS, type GateAdapter } from "../enforcement/adapters.js";
import { buildIndex, writeIndex } from "../index/build.js";
import { discussHook } from "./discuss-hook.js";
import { planHook } from "./plan-hook.js";
import type { GateRequest, GateResult } from "../enforcement/types.js";
import {
  deriveRuleGateStatuses,
  verifyGateHook,
} from "./verify-gate-hook.js";
import { readGateEvidence, writeGateEvidence } from "./gate-evidence-store.js";
import { gateEvidencePath } from "./paths.js";
import { type GovernanceRecord, writeSelection } from "./state-store.js";
import { COVERAGE_FINDING_ID } from "../enforcement/coverage-report.js";

const FIXTURE_DIR = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "coverage",
  "jacoco",
);
const BINDING_RULE_ID = "java-spring-unit-line-coverage";
const COVERAGE_ADAPTER_NAME = "coverage-report";

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

// ── Phase 18: binding coverage routing (D-03, D-05..D-07, D-14) ──────────────

function bindingRecord(): GovernanceRecord {
  return {
    phase: "construction",
    taskSignal: {
      taskType: "test",
      keywords: ["coverage", "java"],
      paths: ["src/main/java/com/example/Service.java"],
    },
    selectionConfig: { phase: "construction", domains: ["java-spring"] },
    selectionResult: {
      selected: [
        {
          id: BINDING_RULE_ID,
          severity: "high",
          summary: "Unit line coverage must meet the 70% threshold.",
          matchedAxis: "paths",
          matchedValue: "src/main/java/**",
        },
      ],
      skipped: [],
    },
    riskTier: "baseline",
    timestamp: "2026-07-12T00:00:00.000Z",
  };
}

function seedReport(
  root: string,
  fixtureName: string,
  relativePath = "build/reports/jacoco/test/jacocoTestReport.xml",
): string {
  const dest = path.join(root, relativePath);
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(path.join(FIXTURE_DIR, fixtureName), dest);
  return relativePath;
}

function writeGovConfig(
  root: string,
  coverageReportPath: string | undefined,
): void {
  const planning = path.join(root, ".planning");
  mkdirSync(planning, { recursive: true });
  const governance: Record<string, unknown> = { domains: "java-spring" };
  if (coverageReportPath !== undefined) {
    governance.coverage_report_path = coverageReportPath;
  }
  writeFileSync(
    path.join(planning, "config.json"),
    JSON.stringify({ governance }),
    "utf8",
  );
}

test("real rule pack selects coverage at GSD phase 18 and verify routes the real report adapter", async () => {
  await withTempRoot(async (root) => {
    const stateDir = path.join(root, ".planning");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      path.join(stateDir, "STATE.md"),
      [
        "---",
        "gsd_state_version: 1.0",
        "current_phase: 18",
        "status: executing",
        "---",
        "",
      ].join("\n"),
      "utf8",
    );
    const reportPath = seedReport(root, "pass-70.xml");
    writeGovConfig(root, reportPath);
    const realRulePack = path.resolve(process.cwd(), "aidlc-rules");
    const indexPath = path.join(root, "rule-index.json");
    writeIndex(buildIndex(realRulePack), indexPath);

    const discussed = discussHook({
      projectRoot: root,
      indexPath,
      taskSignal: {
        taskType: "feature",
        keywords: ["java", "coverage"],
        paths: ["service/src/main/java/com/example/Service.java"],
      },
    });
    assert.ok(
      discussed.record.selectionResult.selected.some((rule) => rule.id === BINDING_RULE_ID),
      "real binding rule must be selected for phase 18 Java production work",
    );

    const planned = planHook({
      projectRoot: root,
      phaseNumber: "18",
      indexPath,
      plannerInputs: {
        phaseGoal: "Implement Java service behavior",
        requirementIds: [],
        riskThreatModel: [],
        acceptanceCriteria: ["Coverage report passes"],
        impactedFiles: ["service/src/main/java/com/example/Service.java"],
      },
    });
    assert.ok(
      planned.evidence.request.rules.some((rule) => rule.id === BINDING_RULE_ID),
      "authoritative plan evidence must retain the binding rule",
    );

    const verified = await verifyGateHook({ projectRoot: root, phaseNumber: "18" });
    assert.equal(verified.evidence.result.status, "pass");
    assert.equal(verified.evidence.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
  });
});

test("verifyGateHook fails closed when plan binding coverage is absent from discuss state", async () => {
  await withTempRoot(async (root) => {
    writeSelection(record(), root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    const now = "2026-07-12T00:00:00.000Z";
    const planBinding = bindingRecord().selectionResult.selected;
    const evidence = {
      request: {
        gateId: "plan" as const,
        phase: "construction" as const,
        taskSignal: bindingRecord().taskSignal,
        rules: planBinding,
        requestedAt: now,
      },
      result: {
        gateId: "plan" as const,
        status: "pass" as const,
        findings: [],
        evaluatedBy: "aidlc-governance-plan",
        evaluatedAt: now,
      },
      metadata: {
        phase: "18",
        writtenAt: now,
        source: "aidlc-governance-plan",
      },
    };
    writeGateEvidence(root, "18", evidence);

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
      /selection disagreement|binding.*omission/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verify gate direct runner exits non-zero after persisting coverage fail evidence", () => {
  withTempRoot((root) => {
    writeSelection(bindingRecord(), root);
    writeGovConfig(root, seedReport(root, "fail-below-70.xml"));
    const runner = path.resolve(process.cwd(), "dist-test", "governance", "verify-gate-hook.js");

    const child = spawnSync(process.execPath, [runner, root, "18"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    assert.notEqual(child.status, 0, `expected non-zero exit, stdout=${child.stdout}`);
    const evidence = readGateEvidence(root, "18", "verify");
    assert.ok(evidence, "fail evidence must be durable before process exit");
    assert.equal(evidence.result.status, "fail");
    assert.equal(evidence.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
  });
});

test("verifyGateHook routes binding rule to coverage-report pass fixture", async () => {
  await withTempRoot(async (root) => {
    writeSelection(bindingRecord(), root);
    const reportPath = seedReport(root, "pass-70.xml");
    writeGovConfig(root, reportPath);

    const hookResult = await verifyGateHook({
      projectRoot: root,
      phaseNumber: "18",
    });
    const evidence = readGateEvidence(root, "18", "verify");

    assert.ok(evidence, "expected persisted verify evidence");
    assert.equal(hookResult.evidence.result.status, "pass");
    assert.equal(evidence!.result.status, "pass");
    assert.equal(evidence!.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
    assert.deepEqual(evidence!.result.findings, []);
  });
});

test("verifyGateHook routes binding rule to coverage-report fail fixture", async () => {
  await withTempRoot(async (root) => {
    writeSelection(bindingRecord(), root);
    const reportPath = seedReport(root, "fail-below-70.xml");
    writeGovConfig(root, reportPath);

    const hookResult = await verifyGateHook({
      projectRoot: root,
      phaseNumber: "18",
    });
    const evidence = readGateEvidence(root, "18", "verify");

    assert.ok(evidence, "expected persisted verify evidence");
    assert.equal(hookResult.evidence.result.status, "fail");
    assert.equal(evidence!.result.status, "fail");
    assert.equal(evidence!.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
    assert.ok(
      evidence!.result.findings.some((f) => f.id === COVERAGE_FINDING_ID),
      `expected finding ${COVERAGE_FINDING_ID}`,
    );
  });
});

test("verifyGateHook empty coverage_report_path with binding yields durable fail evidence", async () => {
  await withTempRoot(async (root) => {
    writeSelection(bindingRecord(), root);
    writeGovConfig(root, "");

    const hookResult = await verifyGateHook({
      projectRoot: root,
      phaseNumber: "18",
    });
    const evidence = readGateEvidence(root, "18", "verify");

    assert.ok(evidence, "expected durable fail evidence on disk");
    assert.equal(hookResult.evidence.result.status, "fail");
    assert.equal(evidence!.result.status, "fail");
    assert.equal(evidence!.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
    assert.notEqual(evidence!.result.evaluatedBy, "generic-exit-ci");
    assert.ok(
      evidence!.result.findings.some((f) => f.id === COVERAGE_FINDING_ID),
    );
  });
});

test("verifyGateHook rejects non-coverage adapterName when binding selected (no evidence)", async () => {
  await withTempRoot(async (root) => {
    writeSelection(bindingRecord(), root);
    writeGovConfig(root, "build/reports/jacoco/test/jacocoTestReport.xml");

    await assert.rejects(
      verifyGateHook({
        projectRoot: root,
        phaseNumber: "18",
        adapterName: "generic-exit-ci",
      }),
      /bypass|binding|coverage/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verifyGateHook without binding rule still defaults to generic-exit-ci", async () => {
  await withTempRoot(async (root) => {
    writeSelection(record(), root);

    const hookResult = await verifyGateHook({
      projectRoot: root,
      phaseNumber: "08",
    });
    const evidence = readGateEvidence(root, "08", "verify");

    assert.ok(evidence);
    assert.equal(evidence!.result.status, "pass");
    assert.equal(evidence!.result.evaluatedBy, "generic-exit-ci");
    assert.equal(hookResult.evidence.result.evaluatedBy, "generic-exit-ci");
  });
});

test("verifyGateHook without binding honors explicit adapterName injection", async () => {
  await withTempRoot(async (root) => {
    writeSelection(record(), root);
    const custom: GateAdapter = {
      name: "custom-test-adapter",
      async evaluate(request) {
        return {
          gateId: request.gateId,
          status: "pass",
          findings: [],
          evaluatedBy: "custom-test-adapter",
          evaluatedAt: "2026-07-12T00:00:00.000Z",
        };
      },
    };

    const hookResult = await verifyGateHook({
      projectRoot: root,
      phaseNumber: "08",
      adapterName: "custom-test-adapter",
      adapters: new Map([["custom-test-adapter", custom]]),
    });
    assert.equal(hookResult.evidence.result.evaluatedBy, "custom-test-adapter");
  });
});

test("verifyGateHook uses injected coverage-report adapter when binding selected", async () => {
  await withTempRoot(async (root) => {
    writeSelection(bindingRecord(), root);
    writeGovConfig(root, "whatever.xml");
    let called = false;
    const injected: GateAdapter = {
      name: COVERAGE_ADAPTER_NAME,
      async evaluate(request) {
        called = true;
        return {
          gateId: request.gateId,
          status: "pass",
          findings: [],
          evaluatedBy: COVERAGE_ADAPTER_NAME,
          evaluatedAt: "2026-07-12T00:00:00.000Z",
        };
      },
    };

    const hookResult = await verifyGateHook({
      projectRoot: root,
      phaseNumber: "18",
      adapters: new Map([[COVERAGE_ADAPTER_NAME, injected]]),
    });
    assert.equal(called, true);
    assert.equal(hookResult.evidence.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
    assert.equal(hookResult.evidence.result.status, "pass");
  });
});

test("verifyGateHook injected map without coverage-report falls back to factory", async () => {
  await withTempRoot(async (root) => {
    writeSelection(bindingRecord(), root);
    const reportPath = seedReport(root, "pass-70.xml");
    writeGovConfig(root, reportPath);
    const other: GateAdapter = {
      name: "other",
      async evaluate() {
        throw new Error("must not use non-coverage injected adapter");
      },
    };

    const hookResult = await verifyGateHook({
      projectRoot: root,
      phaseNumber: "18",
      adapters: new Map([["other", other]]),
    });
    assert.equal(hookResult.evidence.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
    assert.equal(hookResult.evidence.result.status, "pass");
  });
});

