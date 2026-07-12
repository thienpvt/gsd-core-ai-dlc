import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const ROOT = process.cwd();
const read = (file: string): string => readFileSync(path.join(ROOT, file), "utf8");

interface ConfigSlice {
  type?: unknown;
  default?: unknown;
}

interface CapabilityManifest {
  config?: Record<string, ConfigSlice>;
}

const manifest = JSON.parse(
  read(".gsd/capabilities/aidlc-governance/capability.json"),
) as CapabilityManifest;

function assertIncludesAll(text: string, canaries: readonly string[]): void {
  for (const canary of canaries) {
    assert.ok(text.includes(canary), `missing content canary: ${canary}`);
  }
}

test("phase 18 capability declares additive string settings", () => {
  assert.deepEqual(manifest.config?.["governance.domains"], {
    type: "string",
    default: "",
    description: "Comma-separated domain subscriptions, for example java-spring.",
  });
  assert.deepEqual(manifest.config?.["governance.coverage_report_path"], {
    type: "string",
    default: "",
    description: "Project-relative path to a consumer-produced JaCoCo XML or LCOV report.",
  });
  assert.equal(manifest.config?.["governance.enabled"]?.type, "boolean");
  assert.equal(manifest.config?.["governance.token_budget"]?.type, "number");
});

test("Java Spring coverage guide documents the complete consumer contract", () => {
  const guidePath = path.join(ROOT, "docs", "java-spring-coverage.md");
  assert.ok(existsSync(guidePath), "docs/java-spring-coverage.md must exist");
  const guide = readFileSync(guidePath, "utf8");

  assertIncludesAll(guide, [
    '"domains": "java-spring"',
    '"coverage_report_path": "build/reports/jacoco/test/jacocoTestReport.xml"',
    'SelectionConfig.domains: ["java-spring"]',
    "./gradlew test jacocoTestReport",
    "build/reports/jacoco/test/jacocoTestReport.xml",
    "mvn test",
    "target/site/jacoco/jacoco.xml",
    ".info",
    ".lcov",
    ".planning/governance/gates/{NN}-verify.json",
    "ship",
    "never invokes Maven, Gradle, or a JDK",
    "rule not selected",
    "missing report",
    "unknown suffix",
    "zero lines",
    "below 70%",
    "absolute",
    "out-of-root",
    "fixed inclusive 70%",
    "current_phase: 1",
    "phase 18",
    "operations-phase governance remains deferred",
    "never overwrites that state",
    "fails closed on disagreement",
    "Missing plan evidence fails closed",
    "onError: halt",
  ]);
  assert.doesNotMatch(guide, /configurable (?:coverage )?threshold/i);
  assert.doesNotMatch(guide, /(?:configure|setting for) (?:the )?format/i);
});

test("all documentation entrypoints link the focused guide", () => {
  assert.match(read("README.md"), /docs\/java-spring-coverage\.md/);
  assert.match(read("docs/onboarding.md"), /java-spring-coverage\.md/);
  assert.match(read("docs/governance-workflow.md"), /java-spring-coverage\.md/);
});

test("package.json ships capability, skills, and docs surfaces", () => {
  const pkg = JSON.parse(read("package.json")) as { files?: string[] };
  assert.ok(Array.isArray(pkg.files), "package.json files must be an array");
  for (const required of [".gsd", ".claude/skills", "docs", "aidlc-rules", "dist", "bin", "examples"]) {
    assert.ok(pkg.files!.includes(required), `package.json files must include ${required}`);
  }
});

test("plan:pre onError is halt because plan evidence is mandatory for verify", () => {
  const full = JSON.parse(
    read(".gsd/capabilities/aidlc-governance/capability.json"),
  ) as {
    steps?: Array<{
      point?: string;
      onError?: string;
      ref?: { skill?: string };
      consumes?: string[];
    }>;
  };
  const plan = full.steps?.find(
    (s) => s.point === "plan:pre" && s.ref?.skill === "aidlc-governance-plan",
  );
  assert.ok(plan, "plan:pre step must exist");
  assert.equal(plan!.onError, "halt");
  const verify = full.steps?.find(
    (s) => s.point === "verify:post" && s.ref?.skill === "aidlc-governance-verify",
  );
  assert.ok(verify, "verify:post step must exist");
  assert.ok(
    (verify!.consumes ?? []).some((c) => c.includes("-plan.json")),
    "verify must consume plan evidence",
  );
});

test("onboarding documents installed package capability install path", () => {
  const onboarding = read("docs/onboarding.md");
  assertIncludesAll(onboarding, [
    "node_modules/@opengsd/gsd-aidlc-overlay/.gsd/capabilities/aidlc-governance",
    "gsd-tools capability install",
    "no auto-registration, postinstall, or manual copy",
  ]);
});


test("npm pack tarball includes capability, six skills, and docs", () => {
  const pack = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  assert.equal(pack.status, 0, `npm pack failed: ${pack.stderr || pack.stdout}`);
  const payload = JSON.parse(pack.stdout.trim()) as Array<{
    files?: Array<{ path?: string }>;
    filename?: string;
  }>;
  const entry = Array.isArray(payload) ? payload[0] : payload;
  const paths = new Set(
    (entry.files ?? [])
      .map((f) => f.path ?? "")
      .filter((p) => p.length > 0)
      .map((p) => p.replace(/\\/g, "/")),
  );
  const required = [
    ".gsd/capabilities/aidlc-governance/capability.json",
    ".claude/skills/aidlc-governance-discuss/SKILL.md",
    ".claude/skills/aidlc-governance-plan/SKILL.md",
    ".claude/skills/aidlc-governance-execute/SKILL.md",
    ".claude/skills/aidlc-governance-verify/SKILL.md",
    ".claude/skills/aidlc-governance-ship/SKILL.md",
    ".claude/skills/aidlc-governance-audit/SKILL.md",
    "docs/onboarding.md",
    "docs/java-spring-coverage.md",
    "docs/governance-workflow.md",
  ];
  for (const rel of required) {
    assert.ok(paths.has(rel), `tarball missing ${rel}`);
  }
  // Supported install path remains gsd-tools capability install on packaged capability dir
  const manifest = JSON.parse(
    read(".gsd/capabilities/aidlc-governance/capability.json"),
  ) as { skills?: string[] };
  assert.deepEqual(
    (manifest.skills ?? []).slice().sort(),
    [
      "aidlc-governance-audit",
      "aidlc-governance-discuss",
      "aidlc-governance-execute",
      "aidlc-governance-plan",
      "aidlc-governance-ship",
      "aidlc-governance-verify",
    ].sort(),
  );
  // document the supported consumer path in package contract
  assert.ok(
    read("docs/onboarding.md").includes(
      "node_modules/@opengsd/gsd-aidlc-overlay/.gsd/capabilities/aidlc-governance",
    ),
  );
});

