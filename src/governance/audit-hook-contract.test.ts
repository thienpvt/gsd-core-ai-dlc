import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
const SKILL_PATH = path.join(
  REPO_ROOT,
  ".claude",
  "skills",
  "aidlc-governance-audit",
  "SKILL.md",
);
const GSD_TOOLS = "C:/Users/thien/.codex/gsd-core/bin/gsd-tools.cjs";
const CODEX_CONFIG_DIR = "C:/Users/thien/.codex";

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

test("capability manifest declares one artifact-only audit verify:post step", () => {
  const capability = manifest();
  const steps = auditSteps(capability);
  assert.equal(steps.length, 1);
  const step = steps[0] as CapabilityStep;

  assert.ok(capability.skills?.includes("aidlc-governance-audit"));
  assert.deepEqual(step.produces, ["GOVERNANCE.md"]);
  assert.deepEqual(step.consumes, [".planning/governance/selection-state.json"]);
  assert.equal(step.when, "governance.enabled");
  assert.equal(step.onError, "halt");
  assert.deepEqual(capability.gates, []);
  assert.deepEqual(capability.hooks, []);

  for (const forbidden of ["scan", "scanner", "approval", "ship", "adapter", "enforce"]) {
    assert.equal(step[forbidden], undefined, `verify:post step must not declare ${forbidden}`);
  }
});

test("audit skill delegates phase resolution and writing to the built audit artifact runner", () => {
  const source = readFileSync(SKILL_PATH, "utf8");

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

test("local render-hooks verify:post output references aidlc-governance-audit when runtime exists", (t) => {
  if (!existsSync(GSD_TOOLS)) {
    t.skip("local GSD runtime is not installed");
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
