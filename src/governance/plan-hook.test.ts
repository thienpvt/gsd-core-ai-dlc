import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex, writeIndex } from "../index/build.js";
import { gateEvidencePath, selectionStatePath } from "./paths.js";
import { readGateEvidence } from "./gate-evidence-store.js";
import {
  derivePlannerTaskSignal,
  planHook,
  type PlanTaskSignalInputs,
} from "./plan-hook.js";

function rule(
  id: string,
  trigger: string,
  summary: string,
  body: string,
  axis: "keywords" | "paths" = "keywords",
): string {
  return [
    "---",
    `id: ${id}`,
    "scope: enterprise",
    "triggers:",
    `  ${axis}:`,
    `    - ${trigger}`,
    "phases:",
    "  - construction",
    "severity: high",
    `summary: ${summary}`,
    "classification: advisory",
    "---",
    "",
    `## ${id}`,
    "",
    body,
    "",
  ].join("\n");
}

function writeFixtureIndex(root: string): void {
  const corpusDir = path.join(root, "fixture-corpus", "enterprise");
  mkdirSync(corpusDir, { recursive: true });
  writeFileSync(
    path.join(corpusDir, "phase-goal.md"),
    rule(
      "phase-goal-rule",
      "planner",
      "Planner goals must select governance context.",
      "PHASE_GOAL_BODY_SHOULD_NOT_RENDER",
    ),
    "utf8",
  );
  writeFileSync(
    path.join(corpusDir, "requirement.md"),
    rule(
      "requirement-rule",
      "gate-03",
      "GATE-03 requirements must select governance context.",
      "REQUIREMENT_BODY_SHOULD_NOT_RENDER",
    ),
    "utf8",
  );
  writeFileSync(
    path.join(corpusDir, "risk.md"),
    rule(
      "risk-rule",
      "tampering",
      "Tampering risks require evidence isolation.",
      "RISK_BODY_SHOULD_NOT_RENDER",
    ),
    "utf8",
  );
  writeFileSync(
    path.join(corpusDir, "acceptance.md"),
    rule(
      "acceptance-rule",
      "summary-only",
      "Summary-only acceptance criteria must select governance context.",
      "ACCEPTANCE_BODY_SHOULD_NOT_RENDER",
    ),
    "utf8",
  );
  writeFileSync(
    path.join(corpusDir, "file.md"),
    rule(
      "file-rule",
      "src/governance/plan-hook.ts",
      "Impacted files must select governance context.",
      "FILE_BODY_SHOULD_NOT_RENDER",
      "paths",
    ),
    "utf8",
  );
  writeFileSync(
    path.join(corpusDir, "module.md"),
    rule(
      "module-rule",
      "src/governance/**",
      "Impacted modules must select governance context.",
      "MODULE_BODY_SHOULD_NOT_RENDER",
      "paths",
    ),
    "utf8",
  );
  writeIndex(buildIndex(path.join(root, "fixture-corpus")), path.join(root, "rule-index.json"));
}

function writeState(root: string): void {
  const statePath = path.join(root, ".planning", "STATE.md");
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(
    statePath,
    [
      "---",
      "gsd_state_version: 1.0",
      "current_phase: 8",
      "status: executing",
      "---",
      "",
      "# Project State",
      "",
    ].join("\n"),
    "utf8",
  );
}

function withFixtureRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-plan-hook-"));
  try {
    writeFixtureIndex(root);
    writeState(root);
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function plannerInputs(overrides: Partial<PlanTaskSignalInputs> = {}): PlanTaskSignalInputs {
  return {
    phaseGoal: "Planner gate hook implementation",
    requirementIds: ["GATE-03"],
    riskThreatModel: ["Tampering with plan evidence must fail closed."],
    acceptanceCriteria: ["Render summary-only governance context."],
    impactedFiles: ["src\\governance\\plan-hook.ts"],
    impactedModules: ["src/governance"],
    ...overrides,
  };
}

function derivedWithout(source: keyof PlanTaskSignalInputs) {
  const value = plannerInputs();
  if (source === "phaseGoal") value.phaseGoal = "";
  if (source === "requirementIds") value.requirementIds = [];
  if (source === "riskThreatModel") value.riskThreatModel = [];
  if (source === "acceptanceCriteria") value.acceptanceCriteria = [];
  if (source === "impactedFiles") value.impactedFiles = [];
  if (source === "impactedModules") value.impactedModules = [];
  return derivePlannerTaskSignal(value);
}

test("derivePlannerTaskSignal derives observable keywords and paths from every planner source", () => {
  const signal = derivePlannerTaskSignal(plannerInputs());

  assert.equal(signal.taskType, "security");
  assert.ok(signal.keywords.includes("planner"));
  assert.ok(signal.keywords.includes("gate-03"));
  assert.ok(signal.keywords.includes("tampering"));
  assert.ok(signal.keywords.includes("summary-only"));
  assert.ok(signal.paths.includes("src/governance/plan-hook.ts"));
  assert.ok(signal.paths.includes("src/governance/**"));

  assert.equal(derivedWithout("phaseGoal").keywords.includes("planner"), false);
  assert.equal(derivedWithout("requirementIds").keywords.includes("gate-03"), false);
  assert.equal(derivedWithout("riskThreatModel").keywords.includes("tampering"), false);
  assert.equal(derivedWithout("acceptanceCriteria").keywords.includes("summary-only"), false);
  assert.equal(derivedWithout("impactedFiles").paths.includes("src/governance/plan-hook.ts"), false);
  assert.equal(derivedWithout("impactedModules").paths.includes("src/governance/**"), false);
});

test("derivePlannerTaskSignal uses feature task type when risk/threat text is absent", () => {
  const signal = derivePlannerTaskSignal(plannerInputs({ riskThreatModel: [] }));

  assert.equal(signal.taskType, "feature");
  assert.equal(signal.keywords.includes("tampering"), false);
});

test("planHook renders summary-only governance and writes plan evidence without selection state", () => {
  withFixtureRoot((root) => {
    const result = planHook({
      projectRoot: root,
      phaseNumber: "08",
      plannerInputs: plannerInputs(),
    });

    assert.ok(result.fragment.startsWith("<governance>"));
    assert.ok(result.fragment.includes("Planner goals must select governance context."));
    assert.ok(result.fragment.includes("GATE-03 requirements must select governance context."));
    assert.ok(result.fragment.includes("Tampering risks require evidence isolation."));
    assert.ok(result.fragment.includes("Summary-only acceptance criteria must select governance context."));
    assert.ok(result.fragment.includes("Impacted files must select governance context."));
    assert.ok(result.fragment.includes("Impacted modules must select governance context."));
    assert.equal(result.fragment.includes("RISK_BODY_SHOULD_NOT_RENDER"), false);
    assert.equal(result.fragment.includes("FILE_BODY_SHOULD_NOT_RENDER"), false);

    const reloaded = readGateEvidence(root, "08", "plan");
    assert.ok(reloaded !== null, "expected plan evidence");
    assert.equal(reloaded.request.gateId, "plan");
    assert.equal(reloaded.result.gateId, "plan");
    assert.equal(reloaded.result.evaluatedBy, "aidlc-governance-plan");
    assert.deepEqual(reloaded.request.taskSignal, result.taskSignal);
    assert.deepEqual(reloaded.request.rules, result.evidence.request.rules);
    assert.equal(existsSync(gateEvidencePath(root, "08", "plan")), true);
    assert.equal(existsSync(selectionStatePath(root)), false);
  });
});

test("planHook preserves fragment output and records a failing gate result on budget overflow", () => {
  withFixtureRoot((root) => {
    const result = planHook({
      projectRoot: root,
      phaseNumber: "08",
      plannerInputs: plannerInputs(),
      budget: 1,
    });

    assert.ok(result.fragment.startsWith("<governance>"));
    assert.equal(result.evidence.result.status, "fail");
    assert.equal(result.evidence.result.findings.length, 1);
    assert.match(result.evidence.result.findings[0]?.message ?? "", /budget/i);
    assert.deepEqual(result.evidence.result.findings[0]?.evidence, {
      path: ".planning/governance/gates/08-plan.json",
    });
    assert.equal(result.evidence.result.evaluatedAt, result.evidence.request.requestedAt);
    assert.equal(result.evidence.metadata.writtenAt, result.evidence.result.evaluatedAt);
    assert.equal(readGateEvidence(root, "08", "plan")?.result.status, "fail");
    assert.equal(existsSync(selectionStatePath(root)), false);
  });
});

// ── Phase 18: config-backed baseDomains (D-02) ───────────────────────────────

test("planHook uses config domains when baseDomains omitted", () => {
  withFixtureRoot((root) => {
    writeFileSync(
      path.join(root, ".planning", "config.json"),
      JSON.stringify({ governance: { domains: "java-spring" } }),
      "utf8",
    );
    // Use a domain-scoped rule so domains matter for selectionConfig.
    const corpusDir = path.join(root, "fixture-corpus", "domain", "java-spring");
    mkdirSync(corpusDir, { recursive: true });
    writeFileSync(
      path.join(corpusDir, "java-rule.md"),
      [
        "---",
        "id: java-spring-domain-rule",
        "scope: domain",
        "triggers:",
        "  keywords:",
        "    - planner",
        "phases:",
        "  - construction",
        "severity: medium",
        "summary: Java spring domain rule.",
        "classification: advisory",
        "---",
        "",
        "## java-spring-domain-rule",
        "",
        "Body.",
        "",
      ].join("\n"),
      "utf8",
    );
    writeIndex(buildIndex(path.join(root, "fixture-corpus")), path.join(root, "rule-index.json"));

    const result = planHook({
      projectRoot: root,
      phaseNumber: "08",
      plannerInputs: plannerInputs({ riskThreatModel: [] }),
    });
    // selectionConfig is not on PlanHookResult; assert via selected domain rule
    // presence and via re-running with empty override contrast in sibling test.
    // Capture domains by checking domain rule selection under config.
    const selectedIds = result.evidence.request.rules.map((r) => r.id);
    assert.ok(result.fragment.startsWith("<governance>"));
    // Domain rule should be selected when domains include java-spring.
    assert.ok(
      selectedIds.includes("java-spring-domain-rule"),
      `expected java-spring-domain-rule selected under config domains, got [${selectedIds.join(", ")}]`,
    );
  });
});

test("planHook explicit baseDomains: [] overrides config domains", () => {
  withFixtureRoot((root) => {
    writeFileSync(
      path.join(root, ".planning", "config.json"),
      JSON.stringify({ governance: { domains: "java-spring" } }),
      "utf8",
    );
    const corpusDir = path.join(root, "fixture-corpus", "domain", "java-spring");
    mkdirSync(corpusDir, { recursive: true });
    writeFileSync(
      path.join(corpusDir, "java-rule.md"),
      [
        "---",
        "id: java-spring-domain-rule",
        "scope: domain",
        "triggers:",
        "  keywords:",
        "    - planner",
        "phases:",
        "  - construction",
        "severity: medium",
        "summary: Java spring domain rule.",
        "classification: advisory",
        "---",
        "",
        "## java-spring-domain-rule",
        "",
        "Body.",
        "",
      ].join("\n"),
      "utf8",
    );
    writeIndex(buildIndex(path.join(root, "fixture-corpus")), path.join(root, "rule-index.json"));

    const result = planHook({
      projectRoot: root,
      phaseNumber: "08",
      plannerInputs: plannerInputs({ riskThreatModel: [] }),
      baseDomains: [],
    });
    const selectedIds = result.evidence.request.rules.map((r) => r.id);
    assert.equal(
      selectedIds.includes("java-spring-domain-rule"),
      false,
      "explicit empty baseDomains must not select domain rule from config",
    );
  });
});
