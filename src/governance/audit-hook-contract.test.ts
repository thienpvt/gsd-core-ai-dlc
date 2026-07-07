import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const REPO_ROOT = process.cwd();
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  ".gsd",
  "capabilities",
  "aidlc-governance",
  "capability.json",
);
function skillPath(skill: string): string {
  return path.join(REPO_ROOT, ".claude", "skills", skill, "SKILL.md");
}
const CODEX_CONFIG_DIR = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
const GSD_TOOLS = resolveGsdTools();
// TD-08: resolveGsdTools now returns string | null. The local render-hooks test
// below guards GSD_TOOLS === null explicitly — no `as string` cast hiding a
// missing runtime behind a candidate[0] fallback that may point nowhere.

type CapabilityStep = {
  point?: string;
  ref?: { skill?: string };
  produces?: string[];
  consumes?: string[];
  when?: string;
  onError?: string;
  [key: string]: unknown;
};

type CapabilityManifest = {
  skills?: string[];
  steps?: CapabilityStep[];
  hooks?: unknown[];
  gates?: unknown[];
};

type RenderHooksEnvelope = {
  activeHooks?: CapabilityStep[];
  steps?: CapabilityStep[];
  rendered?: string;
};

type CapabilityListRow = {
  id?: string;
  scope?: string;
  status?: string;
};

function manifest(): CapabilityManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as CapabilityManifest;
}

function auditSteps(capability: CapabilityManifest): CapabilityStep[] {
  return (capability.steps ?? []).filter(
    (step) =>
      step.point === "verify:post" &&
      step.ref?.skill === "aidlc-governance-audit",
  );
}

function resolveGsdTools(): string | null {
  const candidates = [
    path.join(CODEX_CONFIG_DIR, "gsd-core", "bin", "gsd-tools.cjs"),
    path.join(os.homedir(), ".codex", "gsd-core", "bin", "gsd-tools.cjs"),
    path.join(os.homedir(), ".claude", "gsd-core", "bin", "gsd-tools.cjs"),
  ];

  // TD-08: explicit null when no candidate exists — previously fell back to
  // candidates[0] as string, which hid a missing runtime behind a non-existent
  // path. Callers must guard against null before spawning.
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function stepBySkill(
  capability: CapabilityManifest,
  point: string,
  skill: string,
): CapabilityStep {
  const step = (capability.steps ?? []).find(
    (candidate) => candidate.point === point && candidate.ref?.skill === skill,
  );
  assert.ok(step, `${point} includes ${skill}`);
  return step;
}

function localProjectCapabilityStatus(): string | null {
  if (GSD_TOOLS === null || !existsSync(GSD_TOOLS)) return null;

  const proc = spawnSync(
    process.execPath,
    [
      GSD_TOOLS,
      "capability",
      "list",
      "--scope",
      "project",
      "--json",
      "--config-dir",
      CODEX_CONFIG_DIR,
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        CODEX_HOME: CODEX_CONFIG_DIR,
        GSD_HOME: CODEX_CONFIG_DIR,
        GSD_RUNTIME: "codex",
      },
    },
  );
  if (proc.status !== 0) return null;

  const rows = JSON.parse(proc.stdout) as CapabilityListRow[];
  return (
    rows.find((row) => row.id === "aidlc-governance" && row.scope === "project")?.status ??
    null
  );
}

test("capability manifest declares one artifact-only audit verify:post step", () => {
  const capability = manifest();
  const steps = auditSteps(capability);
  assert.equal(steps.length, 1);
  const step = steps[0] as CapabilityStep;

  assert.ok(capability.skills?.includes("aidlc-governance-audit"));
  assert.deepEqual(step.produces, ["GOVERNANCE.md"]);
  assert.deepEqual(step.consumes, [
    ".planning/governance/selection-state.json",
    "CONTEXT.md",
  ]);
  assert.equal(step.when, "governance.enabled");
  assert.equal(step.onError, "halt");
  assert.deepEqual(capability.gates, []);
  assert.deepEqual(capability.hooks, []);

  for (const forbidden of ["scan", "scanner", "approval", "ship", "adapter", "enforce"]) {
    assert.equal(step[forbidden], undefined, `verify:post step must not declare ${forbidden}`);
  }
});

test("capability manifest registers remaining governance gates additively", () => {
  const capability = manifest();

  for (const skill of [
    "aidlc-governance-discuss",
    "aidlc-governance-execute",
    "aidlc-governance-audit",
    "aidlc-governance-plan",
    "aidlc-governance-verify",
    "aidlc-governance-ship",
  ]) {
    assert.ok(capability.skills?.includes(skill), `skills includes ${skill}`);
  }

  const plan = stepBySkill(capability, "plan:pre", "aidlc-governance-plan");
  assert.deepEqual(plan.produces, [
    "planner-context",
    ".planning/governance/gates/{NN}-plan.json",
  ]);
  assert.deepEqual(plan.consumes, [
    "CONTEXT.md",
    "RESEARCH.md",
    "PATTERNS.md",
  ]);
  assert.equal(plan.when, "governance.enabled");
  assert.equal(plan.onError, "skip");

  const verify = stepBySkill(capability, "verify:post", "aidlc-governance-verify");
  assert.deepEqual(verify.produces, [".planning/governance/gates/{NN}-verify.json"]);
  assert.deepEqual(verify.consumes, [".planning/governance/selection-state.json"]);
  assert.equal(verify.when, "governance.enabled");
  assert.equal(verify.onError, "halt");

  const ship = stepBySkill(capability, "ship:pre", "aidlc-governance-ship");
  assert.deepEqual(ship.produces, [
    ".planning/governance/gates/{NN}-ship.json",
    ".planning/governance/approvals/{NN}.json",
  ]);
  assert.deepEqual(ship.consumes, [
    ".planning/governance/gates/{NN}-plan.json",
    ".planning/governance/gates/{NN}-verify.json",
    "GOVERNANCE.md",
  ]);
  assert.equal(ship.when, "governance.enabled");
  assert.equal(ship.onError, "halt");

  const verifySteps = capability.steps ?? [];
  const verifyIndex = verifySteps.indexOf(verify);
  const auditIndex = verifySteps.indexOf(
    stepBySkill(capability, "verify:post", "aidlc-governance-audit"),
  );
  assert.ok(verifyIndex < auditIndex, "verify evidence step appears before audit step");
});

test("audit skill delegates phase resolution and writing to the built audit artifact runner", () => {
  const source = readFileSync(skillPath("aidlc-governance-audit"), "utf8");

  for (const required of [
    "selection-state.json",
    ".planning/STATE.md",
    "current_phase",
    ".planning/phases/{NN}-*/",
    "GOVERNANCE.md",
    "dist/governance/audit-artifact.js",
  ]) {
    assert.match(source, new RegExp(escapeRegExp(required)));
  }

  for (const duplicatedMapping of [
    "AUDIT_SKIP_REASONS",
    "normalizeSkipReason",
    "out-of-scope-by-trigger",
    "explicitly-waived",
  ]) {
    assert.doesNotMatch(source, new RegExp(escapeRegExp(duplicatedMapping)));
  }
});

test("plan skill contract names all D-02 planner input sources before invoking plan-hook", () => {
  const source = readFileSync(skillPath("aidlc-governance-plan"), "utf8");

  for (const required of [
    "phaseGoal",
    "requirementIds",
    "riskThreatModel",
    "acceptanceCriteria",
    "impactedFiles",
    "impactedModules",
    "PlanTaskSignalInputs",
    "dist/governance/plan-hook.js",
  ]) {
    assert.match(source, new RegExp(escapeRegExp(required)));
  }

  for (const duplicatedLogic of [
    "select(",
    "renderInjection",
    "classifyRisk",
    "riskAdjustedDomains",
  ]) {
    assert.doesNotMatch(source, new RegExp(escapeRegExp(duplicatedLogic)));
  }
});

test("local render-hooks verify:post output references aidlc-governance-audit when runtime exists", (t) => {
  // TD-08: guard null explicitly — resolveGsdTools returns string | null, never
  // a candidates[0] fallback. Skip cleanly when no runtime is found.
  if (GSD_TOOLS === null || !existsSync(GSD_TOOLS)) {
    t.skip("local GSD runtime is not installed");
    return;
  }

  const status = localProjectCapabilityStatus();
  if (status !== "active") {
    t.skip(`local aidlc-governance capability is not active (${status ?? "unavailable"})`);
    return;
  }

  const proc = spawnSync(
    process.execPath,
    [
      GSD_TOOLS,
      "loop",
      "render-hooks",
      "verify:post",
      "--raw",
      "--config-dir",
      CODEX_CONFIG_DIR,
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        CODEX_HOME: CODEX_CONFIG_DIR,
        GSD_HOME: CODEX_CONFIG_DIR,
        GSD_RUNTIME: "codex",
      },
    },
  );

  assert.equal(
    proc.status,
    0,
    `render-hooks failed\nstdout:\n${proc.stdout}\nstderr:\n${proc.stderr}`,
  );

  const envelope = JSON.parse(proc.stdout) as RenderHooksEnvelope;
  const hooks = [...(envelope.activeHooks ?? []), ...(envelope.steps ?? [])];
  assert.ok(
    hooks.some((hook) => hook.ref?.skill === "aidlc-governance-audit") ||
      envelope.rendered?.includes("aidlc-governance-audit"),
    "verify:post render-hooks must reference aidlc-governance-audit",
  );
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
