/**
 * Precedence + scope-vs-directory integration over a fixture-backed store.
 *
 * Proves buildIndex wires assertScopeMatchesDirectory (D-09) and resolvePrecedence
 * (D-11/D-12) end-to-end:
 *   1. A colliding `input-validation` id across enterprise/domain/project resolves
 *      to the PROJECT winner with the two losers recorded as superseded
 *      (D-11, ROADMAP success criterion 2).
 *   2. A rule whose frontmatter scope disagrees with its directory tier fails the
 *      build loudly (D-09).
 *   3. No fixture body text leaks into the serialized index (PACK-04 preserved
 *      through precedence integration).
 *   4. The real corpus (only enterprise/require-mfa.md) still emits exactly one
 *      record with NO superseded key — backward compatible with the 01-01 smoke test.
 *
 * Fixtures live under test/fixtures/ (NOT src/, so tsc never compiles them) and are
 * read via fs at runtime. node --test runs from the repo root, so process.cwd() is
 * the repo root; paths are built with node:path (no hard-coded separators).
 *
 * RED note: against the pre-wiring build.ts (no scope check, no precedence collapse)
 * the precedence-winner and D-09-throws assertions FAIL; Task 3's buildIndex wiring
 * turns them GREEN.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildIndex } from "./build.js";
import type { RuleIndex } from "../types.js";

const PRECEDENCE_STORE = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "precedence-store",
);
const MISMATCH_STORE = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "scope-mismatch-store",
);
const REAL_CORPUS = path.resolve(process.cwd(), "aidlc-rules");

/** The three colliding fixtures, so the body-leak guard reads real body text. */
const PRECEDENCE_FIXTURES = [
  path.join(PRECEDENCE_STORE, "enterprise", "input-validation.md"),
  path.join(PRECEDENCE_STORE, "domain", "security", "input-validation.md"),
  path.join(PRECEDENCE_STORE, "project", "input-validation.md"),
];

/** Extract the Markdown body (everything after the closing frontmatter `---`). */
function extractBody(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return (match ? match[1] : normalized).trim();
}

test("buildIndex resolves a cross-tier id collision to the project winner with two superseded (D-11, success criterion 2)", () => {
  const index: RuleIndex = buildIndex(PRECEDENCE_STORE);

  assert.equal(index.rules.length, 1, "the three colliding rules collapse to one winner");
  const [record] = index.rules;
  assert.equal(record.id, "input-validation");
  assert.equal(record.scope, "project", "project outranks domain and enterprise (D-11)");
  assert.ok(
    record.sourceFile.endsWith("project/input-validation.md"),
    `winner sourceFile should be the project rule, got ${record.sourceFile}`,
  );

  assert.ok(Array.isArray(record.superseded), "winner carries a superseded array");
  assert.equal(record.superseded!.length, 2, "both losers are recorded, not dropped");
  for (const s of record.superseded!) {
    assert.equal(s.id, "input-validation");
    assert.equal(s.reason, "superseded");
  }
  assert.deepEqual(
    record.superseded!.map((s) => s.scope).sort(),
    ["domain", "enterprise"],
    "the domain and enterprise rules are the superseded losers",
  );
  const supersededSources = record.superseded!.map((s) => s.sourceFile);
  assert.ok(
    supersededSources.some((f) => f.endsWith("domain/security/input-validation.md")),
    "the domain rule sourceFile is recorded as superseded",
  );
  assert.ok(
    supersededSources.some((f) => f.endsWith("enterprise/input-validation.md")),
    "the enterprise rule sourceFile is recorded as superseded",
  );
});

test("no fixture body text leaks into the serialized precedence index (PACK-04 through precedence)", () => {
  const index = buildIndex(PRECEDENCE_STORE);
  const serialized = JSON.stringify(index);

  for (const fixture of PRECEDENCE_FIXTURES) {
    const body = extractBody(readFileSync(fixture, "utf8"));
    const bodyLines = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length >= 12);
    assert.ok(
      bodyLines.length > 0,
      `fixture ${fixture} has no substantial body line to check — weakening the guard is not allowed`,
    );
    for (const line of bodyLines) {
      assert.ok(
        !serialized.includes(line),
        `rule body leaked into the index from ${fixture}: "${line}"`,
      );
    }
  }
});

test("buildIndex fails loudly when a rule's scope does not match its directory tier (D-09)", () => {
  assert.throws(() => buildIndex(MISMATCH_STORE), /does not match directory tier/);
});

test("the real corpus emits non-colliding winners with no superseded key (backward compatible with 01-01)", () => {
  const index = buildIndex(REAL_CORPUS);
  // Inventory lock: enterprise require-mfa + ten java-spring domain rules (Phase 13+14+15 pack + Phase 17 coverage).
  const expectedIds = [
    "require-mfa",
    "java-spring-svc-internal-outbound",
    "java-spring-svc-internet-outbound",
    "java-spring-inbound-rest",
    "java-spring-inbound-kafka",
    "java-spring-hex-layering",
    "java-spring-ddd-tactical",
    "java-spring-logging-audit",
    "java-spring-api-contract",
    "java-spring-saga-outbox",
    "java-spring-unit-line-coverage",
  ].sort();
  assert.equal(
    index.rules.length,
    expectedIds.length,
    `real corpus must index exactly ${expectedIds.length} winners (mfa + java-spring pack)`,
  );
  assert.deepEqual(
    index.rules.map((r) => r.id).sort(),
    expectedIds,
    "real corpus id inventory must match mfa + java-spring pack",
  );
  const mfa = index.rules.find((r) => r.id === "require-mfa");
  assert.ok(mfa, "require-mfa must remain a real-corpus winner");
  for (const record of index.rules) {
    assert.equal(
      "superseded" in record,
      false,
      `non-colliding rule ${record.id} must NOT carry a superseded key (shape unchanged from 01-01)`,
    );
  }
});
