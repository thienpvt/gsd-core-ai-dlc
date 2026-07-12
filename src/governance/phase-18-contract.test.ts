import assert from "node:assert/strict";
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
  ]);
  assert.doesNotMatch(guide, /configurable (?:coverage )?threshold/i);
  assert.doesNotMatch(guide, /(?:configure|setting for) (?:the )?format/i);
});

test("all documentation entrypoints link the focused guide", () => {
  assert.match(read("README.md"), /docs\/java-spring-coverage\.md/);
  assert.match(read("docs/onboarding.md"), /java-spring-coverage\.md/);
  assert.match(read("docs/governance-workflow.md"), /java-spring-coverage\.md/);
});
