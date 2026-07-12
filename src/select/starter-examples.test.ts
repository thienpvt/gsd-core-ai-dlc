/**
 * Phase 16 TDD suite: starter examples outside the selectable index.
 *
 * Locks JAVA-EX-01 (hexagonal Order layout under examples/java-spring) and
 * JAVA-EX-02 (buildIndex never indexes examples; D-10 backstop; inventory=10).
 * Engine frozen — no production src edits outside this test file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { buildIndex } from "../index/build.js";
import { deriveScope } from "../rules/scope.js";

const REAL_RULES_ROOT = path.resolve(process.cwd(), "aidlc-rules");
const EXAMPLES_ROOT = path.resolve(process.cwd(), "examples", "java-spring");
const PACKAGE_JSON = path.resolve(process.cwd(), "package.json");

const INVENTORY_COUNT = 10;

const EXPECTED_SNIPPETS = [
  "README.md",
  "domain/Order.java",
  "domain/PlaceOrderCommand.java",
  "application/port/PlaceOrderPort.java",
  "application/port/OrderRepositoryPort.java",
  "application/PlaceOrderHandler.java",
  "adapter/in/web/PlaceOrderController.java",
  "adapter/in/messaging/PlaceOrderKafkaListener.java",
  "adapter/out/persistence/OrderRepositoryAdapter.java",
] as const;

const FRAMEWORK_TOKENS = [
  "@RestController",
  "@KafkaListener",
  "@Service",
  "@Repository",
  "@Entity",
  "@Autowired",
] as const;

const DOMAIN_AND_PORT_FILES = [
  "domain/Order.java",
  "domain/PlaceOrderCommand.java",
  "application/port/PlaceOrderPort.java",
  "application/port/OrderRepositoryPort.java",
  "application/PlaceOrderHandler.java",
] as const;

function readSnippet(rel: string): string {
  return readFileSync(path.join(EXAMPLES_ROOT, rel), "utf8");
}

// ---------------------------------------------------------------------------
// JAVA-EX-01 — layout isolation
// ---------------------------------------------------------------------------

test("JAVA-EX-01: EXAMPLES_ROOT exists and is not nested under aidlc-rules", () => {
  assert.ok(existsSync(EXAMPLES_ROOT), `missing ${EXAMPLES_ROOT}`);
  const rulesNorm = REAL_RULES_ROOT.replace(/\\/g, "/");
  const examplesNorm = EXAMPLES_ROOT.replace(/\\/g, "/");
  assert.ok(
    !examplesNorm.startsWith(rulesNorm + "/") && examplesNorm !== rulesNorm,
    "examples/java-spring must be a sibling of aidlc-rules, not nested under it",
  );
});

test("JAVA-EX-01: locked hexagonal Order snippet paths all exist", () => {
  for (const rel of EXPECTED_SNIPPETS) {
    const abs = path.join(EXAMPLES_ROOT, rel);
    assert.ok(existsSync(abs), `missing locked snippet: ${rel}`);
  }
});

test("JAVA-EX-01: Java packages are com.example.orders; domain/app plain", () => {
  for (const rel of EXPECTED_SNIPPETS) {
    if (!rel.endsWith(".java")) continue;
    const body = readSnippet(rel);
    assert.match(
      body,
      /package\s+com\.example\.orders(\.|;)/,
      `${rel} must declare package com.example.orders…`,
    );
  }

  for (const rel of DOMAIN_AND_PORT_FILES) {
    const body = readSnippet(rel);
    for (const token of FRAMEWORK_TOKENS) {
      assert.ok(
        !body.includes(token),
        `${rel} must stay plain Java (found ${token})`,
      );
    }
  }
});

test("JAVA-EX-01: adapters wire ports; Kafka names idempotency/retry/DLQ", () => {
  const rest = readSnippet("adapter/in/web/PlaceOrderController.java");
  assert.ok(
    rest.includes("PlaceOrderPort"),
    "REST adapter must reference PlaceOrderPort",
  );

  const kafka = readSnippet("adapter/in/messaging/PlaceOrderKafkaListener.java");
  assert.match(
    kafka,
    /idempotenc/i,
    "Kafka adapter must mention idempotency",
  );
  assert.ok(
    /retry/i.test(kafka) || /DLQ/i.test(kafka),
    "Kafka adapter must mention retry or DLQ",
  );

  const persistence = readSnippet(
    "adapter/out/persistence/OrderRepositoryAdapter.java",
  );
  assert.ok(
    /implements\s+OrderRepositoryPort/.test(persistence),
    "persistence adapter must implement OrderRepositoryPort",
  );
});

test("JAVA-EX-01: at least one ponytail: ceiling comment under examples tree", () => {
  let found = false;
  for (const rel of EXPECTED_SNIPPETS) {
    if (!rel.endsWith(".java") && rel !== "README.md") continue;
    if (readSnippet(rel).includes("ponytail:")) {
      found = true;
      break;
    }
  }
  assert.ok(found, "examples/java-spring must include a ponytail: ceiling marker");
});

test("JAVA-EX-01: README states non-selectability and cites governing rule ids", () => {
  const readme = readSnippet("README.md");
  assert.ok(!readme.startsWith("---"), "README must not start with YAML frontmatter");
  assert.ok(
    !/^---\r?\n/.test(readme),
    "README must not open with a frontmatter fence",
  );
  assert.match(readme, /not selectable|outside `?aidlc-rules`?/i);
  for (const id of [
    "java-spring-hex-layering",
    "java-spring-inbound-rest",
    "java-spring-inbound-kafka",
  ]) {
    assert.ok(readme.includes(id), `README must cite ${id}`);
  }
});

// ---------------------------------------------------------------------------
// JAVA-EX-02 — non-indexing + D-10 + inventory
// ---------------------------------------------------------------------------

test("JAVA-EX-02: buildIndex(aidlc-rules) never indexes examples/ sourceFiles", () => {
  const index = buildIndex(REAL_RULES_ROOT);
  for (const rule of index.rules) {
    const src = rule.sourceFile.replace(/\\/g, "/");
    assert.ok(
      !src.includes("examples/"),
      `indexed sourceFile must not include examples/: ${src}`,
    );
    assert.ok(
      !rule.id.toLowerCase().startsWith("example"),
      `rule id must not start with example: ${rule.id}`,
    );
    assert.ok(
      !rule.id.toLowerCase().startsWith("sample"),
      `rule id must not start with sample: ${rule.id}`,
    );
  }
});

test("JAVA-EX-02: plain README fails frontmatter validation", () => {
  // buildIndex hits frontmatter validation on README.md before any D-10 path check.
  // This proves the plain README is not a selectable rule; it is NOT a D-10 proof.
  assert.throws(
    () => buildIndex(EXAMPLES_ROOT),
    /must have required property|missing '/,
  );
});

test("JAVA-EX-02 backstop: path under examples is outside enterprise/domain/project tiers (D-10)", () => {
  // Public deriveScope on a path under EXAMPLES_ROOT — genuine D-10, not frontmatter.
  // buildIndex itself never reaches D-10 for this tree (README fails first).
  assert.throws(
    () => deriveScope(path.join(EXAMPLES_ROOT, "README.md"), EXAMPLES_ROOT),
    /outside the enterprise\/domain\/project tiers|D-10/,
  );
});

test("inventory regression: real corpus still has exactly 10 winners", () => {
  const index = buildIndex(REAL_RULES_ROOT);
  assert.equal(
    index.rules.length,
    INVENTORY_COUNT,
    `expected ${INVENTORY_COUNT} winners; Phase 16 adds zero selectable rules`,
  );
});

test("package.json files array ships examples", () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
    files?: string[];
  };
  assert.ok(Array.isArray(pkg.files), "package.json files must be an array");
  assert.ok(
    pkg.files!.includes("examples"),
    'package.json files must include "examples"',
  );
});
