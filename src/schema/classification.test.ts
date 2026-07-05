/**
 * PACK-03 advisory/binding classification.
 *
 * Locks two decisions: D-14 (severity and classification are INDEPENDENT axes,
 * freely combined) and D-15 (a binding rule must name an enforcement contract;
 * v1 checks only that one is named, it does not resolve it against a registry).
 * Runs against the COMPILED validator (dist-test/schema/validate.js).
 *
 * RED note: 01-01's minimal schema has no if/then, so binding-without-enforcement
 * is wrongly accepted there; Task 2's allOf if/then turns this rejection GREEN.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateFrontmatter, formatErrors } from "./validate.js";

/** Fresh, fully-valid advisory frontmatter per call (no shared references). */
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

test("rejects a binding rule that names no enforcement contract (D-15)", () => {
  const fm = makeValidFrontmatter();
  fm.classification = "binding";
  // enforcement deliberately absent — this is the governance-bypass guard.
  assert.equal(
    validateFrontmatter(fm),
    false,
    "a binding rule with no enforcement contract must be rejected",
  );
});

test("accepts an advisory rule with no enforcement (D-14)", () => {
  const fm = makeValidFrontmatter();
  fm.classification = "advisory";
  assert.equal(
    validateFrontmatter(fm),
    true,
    formatErrors("advisory.md", validateFrontmatter.errors),
  );
});

test("accepts a binding rule that names an enforcement contract (D-15)", () => {
  const fm = makeValidFrontmatter();
  fm.classification = "binding";
  fm.enforcement = "semgrep:no-eval";
  assert.equal(
    validateFrontmatter(fm),
    true,
    formatErrors("binding.md", validateFrontmatter.errors),
  );
});

test("accepts a critical/advisory combo (D-14 severity and classification independent)", () => {
  const fm = makeValidFrontmatter();
  fm.severity = "critical";
  fm.classification = "advisory";
  assert.equal(
    validateFrontmatter(fm),
    true,
    formatErrors("critical-advisory.md", validateFrontmatter.errors),
  );
});

test("accepts a low/binding combo (D-14 severity and classification independent)", () => {
  const fm = makeValidFrontmatter();
  fm.severity = "low";
  fm.classification = "binding";
  fm.enforcement = "ci:exit-code";
  assert.equal(
    validateFrontmatter(fm),
    true,
    formatErrors("low-binding.md", validateFrontmatter.errors),
  );
});
