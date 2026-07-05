/**
 * PACK-01 frontmatter contract — table-driven acceptance/rejection.
 *
 * Drives the full multi-axis trigger model, the closed enums, and the
 * unknown-key rejection that plan 01-02 Task 2 hardens the schema to satisfy.
 * Tests run against the COMPILED validator (dist-test/schema/validate.js) — the
 * same artifact the loader uses — not a re-created Ajv instance.
 *
 * RED note: against 01-01's minimal schema the multi-axis / exclude-only trigger
 * cases and the phases-enum rejection FAIL; Task 2 turns them GREEN. The schema
 * JSON is deliberately never pasted here — the schema is the system under test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateFrontmatter, formatErrors } from "./validate.js";

/** Required top-level fields (PACK-01). Kept as data so the loop names each one. */
const REQUIRED_FIELDS = [
  "id",
  "scope",
  "triggers",
  "phases",
  "severity",
  "summary",
  "classification",
] as const;

/**
 * A fresh, fully-valid frontmatter object per call — a new literal every time so
 * a mutation in one case never leaks into another (no shared nested references).
 * triggers starts empty (D-03 always-in-phase) so each trigger case sets its own.
 */
function makeValidFrontmatter(): Record<string, unknown> {
  return {
    id: "require-mfa",
    scope: "enterprise",
    triggers: {},
    phases: ["common"],
    severity: "critical",
    summary: "All privileged access requires multi-factor authentication.",
    classification: "advisory",
  };
}

test("the validator is compiled once at module load", () => {
  // If the schema failed to compile under Ajv strict, importing validate.js
  // would have thrown and this whole file would fail to load.
  assert.equal(typeof validateFrontmatter, "function");
});

test("accepts a fully valid base frontmatter object", () => {
  const fm = makeValidFrontmatter();
  assert.equal(
    validateFrontmatter(fm),
    true,
    formatErrors("base.md", validateFrontmatter.errors),
  );
});

test("accepts an empty triggers object (D-03 always-in-phase escape hatch)", () => {
  // D-03: an empty triggers block is the deliberate always-in-phase hatch a
  // critical rule uses so it never silently misses within its phase/scope.
  const fm = makeValidFrontmatter();
  fm.triggers = {};
  assert.equal(
    validateFrontmatter(fm),
    true,
    formatErrors("empty-triggers.md", validateFrontmatter.errors),
  );
});

test("accepts triggers with only an exclude block populated (D-02/D-03 boundary)", () => {
  const fm = makeValidFrontmatter();
  fm.triggers = { exclude: { paths: ["**/*.test.ts"] } };
  assert.equal(
    validateFrontmatter(fm),
    true,
    formatErrors("exclude-only.md", validateFrontmatter.errors),
  );
});

test("accepts a fully populated multi-axis triggers object (D-01)", () => {
  const fm = makeValidFrontmatter();
  fm.triggers = {
    taskType: ["feature"],
    keywords: ["input"],
    paths: ["src/**"],
    exclude: { keywords: ["legacy"] },
  };
  assert.equal(
    validateFrontmatter(fm),
    true,
    formatErrors("multi-axis.md", validateFrontmatter.errors),
  );
});

for (const field of REQUIRED_FIELDS) {
  test(`rejects frontmatter missing required field: ${field}`, () => {
    const fm = makeValidFrontmatter();
    delete fm[field];
    assert.equal(
      validateFrontmatter(fm),
      false,
      `missing '${field}' must be rejected`,
    );
    const msg = formatErrors("missing.md", validateFrontmatter.errors);
    assert.ok(
      msg.includes(`'${field}'`),
      `error output should name the missing field '${field}', got:\n${msg}`,
    );
  });
}

test("rejects an out-of-enum severity (D-13)", () => {
  const fm = makeValidFrontmatter();
  fm.severity = "blocker";
  assert.equal(validateFrontmatter(fm), false);
});

test("rejects an out-of-enum scope", () => {
  const fm = makeValidFrontmatter();
  fm.scope = "team";
  assert.equal(validateFrontmatter(fm), false);
});

test("rejects an out-of-enum classification", () => {
  const fm = makeValidFrontmatter();
  fm.classification = "mandatory";
  assert.equal(validateFrontmatter(fm), false);
});

test("rejects an out-of-enum phases member", () => {
  const fm = makeValidFrontmatter();
  fm.phases = ["release"];
  assert.equal(validateFrontmatter(fm), false);
});

test("rejects an out-of-enum triggers.taskType member (D-04)", () => {
  const fm = makeValidFrontmatter();
  fm.triggers = { taskType: ["banana"] };
  assert.equal(validateFrontmatter(fm), false);
});

test("rejects an unknown top-level key (additionalProperties false)", () => {
  const fm = makeValidFrontmatter();
  fm.priority = 1;
  assert.equal(validateFrontmatter(fm), false);
});
