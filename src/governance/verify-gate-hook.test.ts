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
    seedPlanEvidence(root, "08", seeded);

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
    const seeded = record();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "08", seeded);
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
    const seeded = record();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "08", seeded);

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


function seedPlanEvidence(
  root: string,
  phaseNumber: string,
  rec: GovernanceRecord,
  overrides: {
    status?: "pass" | "fail" | "waived";
    phase?: GovernanceRecord["phase"];
    taskSignal?: GovernanceRecord["taskSignal"];
    rules?: GovernanceRecord["selectionResult"]["selected"];
    source?: string;
    evaluatedBy?: string;
    requestedAt?: string;
    evaluatedAt?: string;
    writtenAt?: string;
  } = {},
): void {
  const requestedAt = overrides.requestedAt ?? rec.timestamp;
  const evaluatedAt = overrides.evaluatedAt ?? requestedAt;
  const writtenAt = overrides.writtenAt ?? evaluatedAt;
  const rules = overrides.rules ?? rec.selectionResult.selected;
  writeGateEvidence(root, phaseNumber, {
    request: {
      gateId: "plan",
      phase: overrides.phase ?? rec.phase,
      taskSignal: overrides.taskSignal ?? rec.taskSignal,
      rules,
      requestedAt,
    },
    result: {
      gateId: "plan",
      status: overrides.status ?? "pass",
      findings:
        overrides.status === "fail"
          ? [
              {
                id: "plan-fixture-fail",
                severity: "high",
                message: "fixture plan failure",
              },
            ]
          : [],
      evaluatedBy: overrides.evaluatedBy ?? "aidlc-governance-plan",
      evaluatedAt,
    },
    metadata: {
      phase: phaseNumber,
      writtenAt,
      source: overrides.source ?? "aidlc-governance-plan",
    },
  });
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
        phaseGoal: "Implement Java order coverage gate",
        requirementIds: ["GATE-04", "ENF-03"],
        riskThreatModel: ["Threat: forged coverage evidence could bypass release."],
        acceptanceCriteria: ["Tests prove the coverage adapter blocks below threshold."],
        impactedFiles: ["service/src/main/java/com/example/Service.java"],
        impactedModules: ["service/src/main/java"],
      },
    });
    assert.ok(
      planned.evidence.request.rules.some((rule) => rule.id === BINDING_RULE_ID),
      "authoritative plan evidence must retain the binding rule",
    );
    assert.notDeepEqual(planned.evidence.request.taskSignal, discussed.record.taskSignal);
    assert.equal(planned.evidence.request.taskSignal.taskType, "security");
    assert.ok(
      Date.parse(planned.evidence.metadata.writtenAt) >=
        Date.parse(discussed.record.timestamp),
    );

    const verified = await verifyGateHook({ projectRoot: root, phaseNumber: "18" });
    assert.equal(verified.evidence.result.status, "pass");
    assert.equal(verified.evidence.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
  });
});

test("verifyGateHook fails closed when plan binding coverage is absent from discuss state", async () => {
  await withTempRoot(async (root) => {
    const discuss = record(); // no binding
    writeSelection(discuss, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    // same phase/taskSignal/timestamps as discuss; only rule set differs (plan has binding)
    seedPlanEvidence(root, "18", discuss, {
      rules: bindingRecord().selectionResult.selected,
      requestedAt: discuss.timestamp,
      writtenAt: discuss.timestamp,
    });

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
      /selected rule set|selection disagreement|binding/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verify gate direct runner exits non-zero after persisting coverage fail evidence", () => {
  withTempRoot((root) => {
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "18", seeded);
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
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "18", seeded);
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
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "18", seeded);
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
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "18", seeded);
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
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "18", seeded);
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
    const seeded = record();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "08", seeded);

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
    const seeded = record();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "08", seeded);
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
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "18", seeded);
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
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    seedPlanEvidence(root, "18", seeded);
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

// ── Phase 18 review iteration 2: plan evidence correlation (CR-01/CR-02) ─────

test("verifyGateHook rejects absent plan evidence when binding selected (no verify write)", async () => {
  await withTempRoot(async (root) => {
    writeSelection(bindingRecord(), root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
      /missing authoritative plan evidence/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verifyGateHook rejects absent plan evidence when binding omitted (no verify write)", async () => {
  await withTempRoot(async (root) => {
    writeSelection(record(), root);

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "08" }),
      /missing authoritative plan evidence/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "08", "verify")), false);
  });
});

test("verifyGateHook rejects failed plan evidence before adapter evaluation", async () => {
  await withTempRoot(async (root) => {
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    seedPlanEvidence(root, "18", seeded, { status: "fail" });
    let evaluated = false;
    const injected: GateAdapter = {
      name: COVERAGE_ADAPTER_NAME,
      async evaluate() {
        evaluated = true;
        throw new Error("adapter must not run");
      },
    };

    await assert.rejects(
      verifyGateHook({
        projectRoot: root,
        phaseNumber: "18",
        adapters: new Map([[COVERAGE_ADAPTER_NAME, injected]]),
      }),
      /plan evidence status is fail/i,
    );
    assert.equal(evaluated, false);
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verifyGateHook rejects wrong plan phase", async () => {
  await withTempRoot(async (root) => {
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    seedPlanEvidence(root, "18", seeded, { phase: "inception" });

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
      /phase/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verifyGateHook rejects wrong plan source", async () => {
  await withTempRoot(async (root) => {
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    seedPlanEvidence(root, "18", seeded, { source: "spoofed-plan" });

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
      /source must be 'aidlc-governance-plan'/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verifyGateHook rejects wrong plan evaluatedBy", async () => {
  await withTempRoot(async (root) => {
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    seedPlanEvidence(root, "18", seeded, { evaluatedBy: "not-the-plan-hook" });

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
      /evaluatedBy must be 'aidlc-governance-plan'/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verifyGateHook rejects stale plan older than discuss timestamp", async () => {
  await withTempRoot(async (root) => {
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    seedPlanEvidence(root, "18", seeded, {
      requestedAt: "2026-07-11T00:00:00.000Z",
      writtenAt: "2026-07-11T00:00:00.000Z",
    });

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
      /timestamp causality/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verifyGateHook accepts independently derived task signals and advisory differences", async () => {
  await withTempRoot(async (root) => {
    const seeded = bindingRecord();
    seeded.selectionResult.selected.push({
      id: "discuss-only-advisory",
      severity: "medium",
      summary: "Discuss advisory.",
      matchedAxis: "keywords",
      matchedValue: "coverage",
    });
    writeSelection(seeded, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    seedPlanEvidence(root, "18", seeded, {
      taskSignal: {
        taskType: "security",
        keywords: ["threat", "acceptance", "test", "module"],
        paths: ["service/src/main/java/com/example/Other.java", "service/**"],
      },
      rules: [
        seeded.selectionResult.selected[0]!,
        {
          id: "plan-only-advisory",
          severity: "low",
          summary: "Plan advisory.",
          matchedAxis: "paths",
          matchedValue: "service/**",
        },
      ],
    });

    const verified = await verifyGateHook({ projectRoot: root, phaseNumber: "18" });
    assert.equal(verified.evidence.result.status, "pass");
    assert.equal(verified.evidence.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
  });
});

test("verifyGateHook rejects changed binding rule metadata", async () => {
  const changedFields = ["severity", "summary", "matchedAxis", "matchedValue"] as const;
  for (const field of changedFields) {
    await withTempRoot(async (root) => {
      const seeded = bindingRecord();
      const changed = { ...seeded.selectionResult.selected[0]! };
      if (field === "severity") changed.severity = "critical";
      if (field === "summary") changed.summary = "Changed binding summary.";
      if (field === "matchedAxis") changed.matchedAxis = "keywords";
      if (field === "matchedValue") changed.matchedValue = "changed-value";
      writeSelection(seeded, root);
      writeGovConfig(root, seedReport(root, "pass-70.xml"));
      seedPlanEvidence(root, "18", seeded, { rules: [changed] });

      await assert.rejects(
        verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
        /binding rule metadata/i,
      );
      assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
    });
  }
});

test("verifyGateHook rejects duplicate binding ids on either side", async () => {
  for (const side of ["discuss", "plan"] as const) {
    await withTempRoot(async (root) => {
      const seeded = bindingRecord();
      const duplicate = { ...seeded.selectionResult.selected[0]! };
      if (side === "discuss") seeded.selectionResult.selected.push(duplicate);
      writeSelection(seeded, root);
      writeGovConfig(root, seedReport(root, "pass-70.xml"));
      seedPlanEvidence(root, "18", seeded, {
        rules:
          side === "plan"
            ? [seeded.selectionResult.selected[0]!, duplicate]
            : [seeded.selectionResult.selected[0]!],
      });

      await assert.rejects(
        verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
        /duplicate binding rule/i,
      );
      assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
    });
  }
});

test("verifyGateHook enforces complete plan timestamp causality and future bound", async () => {
  const cases = [
    {
      name: "requested before discuss",
      requestedAt: "2026-07-11T23:59:59.999Z",
      evaluatedAt: "2026-07-12T00:00:00.000Z",
      writtenAt: "2026-07-12T00:00:00.000Z",
    },
    {
      name: "evaluated before requested",
      requestedAt: "2026-07-12T00:00:02.000Z",
      evaluatedAt: "2026-07-12T00:00:01.000Z",
      writtenAt: "2026-07-12T00:00:03.000Z",
    },
    {
      name: "written before evaluated",
      requestedAt: "2026-07-12T00:00:01.000Z",
      evaluatedAt: "2026-07-12T00:00:03.000Z",
      writtenAt: "2026-07-12T00:00:02.000Z",
    },
    {
      name: "far future",
      requestedAt: "2999-01-01T00:00:00.000Z",
      evaluatedAt: "2999-01-01T00:00:01.000Z",
      writtenAt: "2999-01-01T00:00:02.000Z",
    },
  ];
  for (const fixture of cases) {
    await withTempRoot(async (root) => {
      const seeded = bindingRecord();
      writeSelection(seeded, root);
      writeGovConfig(root, seedReport(root, "pass-70.xml"));
      seedPlanEvidence(root, "18", seeded, fixture);

      await assert.rejects(
        verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
        /timestamp causality/i,
        fixture.name,
      );
      assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
    });
  }
});

test("verifyGateHook rejects discuss-selected plan-omitted binding (both directions covered)", async () => {
  await withTempRoot(async (root) => {
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    seedPlanEvidence(root, "18", seeded, {
      rules: [
        {
          id: "require-logging",
          severity: "high",
          summary: "no binding",
          matchedAxis: "always-in-phase",
          matchedValue: "always-in-phase",
        },
      ],
    });

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
      /selected rule set|selection disagreement|binding/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);
  });
});

test("verifyGateHook accepts valid correlated plan evidence path", async () => {
  await withTempRoot(async (root) => {
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    seedPlanEvidence(root, "18", seeded, {
      requestedAt: "2026-07-12T01:00:00.000Z",
      writtenAt: "2026-07-12T01:00:00.000Z",
    });

    const verified = await verifyGateHook({ projectRoot: root, phaseNumber: "18" });
    assert.equal(verified.evidence.result.status, "pass");
    assert.equal(verified.evidence.result.evaluatedBy, COVERAGE_ADAPTER_NAME);
    assert.ok(existsSync(gateEvidencePath(root, "18", "verify")));
  });
});

test("rejected current verify removes stale pass evidence and ship blocks", async () => {
  await withTempRoot(async (root) => {
    const { shipGateHook } = await import("./ship-gate-hook.js");
    const seeded = bindingRecord();
    writeSelection(seeded, root);
    writeGovConfig(root, seedReport(root, "pass-70.xml"));
    seedPlanEvidence(root, "18", seeded, { phase: "inception" });
    writeGateEvidence(root, "18", {
      request: {
        gateId: "verify",
        phase: seeded.phase,
        taskSignal: seeded.taskSignal,
        rules: seeded.selectionResult.selected,
        requestedAt: seeded.timestamp,
      },
      result: {
        gateId: "verify",
        status: "pass",
        findings: [],
        evaluatedBy: COVERAGE_ADAPTER_NAME,
        evaluatedAt: seeded.timestamp,
      },
      metadata: {
        phase: "18",
        source: "stale-fixture",
        writtenAt: seeded.timestamp,
      },
    });
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), true);

    await assert.rejects(
      verifyGateHook({ projectRoot: root, phaseNumber: "18" }),
      /phase/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "18", "verify")), false);

    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "18" }),
      /missing governance evidence.*verify/i,
    );
  });
});

