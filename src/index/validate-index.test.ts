/**
 * Unit suite for validateIndex — the no-body output-schema guard (PACK-04 / D-05).
 *
 * validateIndex enforces rule-index.schema.json's per-record
 * `additionalProperties: false`, so an emitted index whose rule record carries an
 * extra (body/content) key is rejected. This is RESEARCH body-leak guard #2 — the
 * schema-enforced complement to buildIndex's by-construction whitelist.
 *
 * RED note (Task 1): validateIndex is a stub that throws "not implemented", so
 * BOTH cases fail — Case A because the stub throws on a clean index, Case B
 * because the stub's message is not an additionalProperties error. Task 2 wires
 * the real Ajv-backed validator and turns both GREEN.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateIndex } from "./validate-index.js";
import type { RuleIndex } from "../types.js";

/**
 * A fresh, fully-valid RuleIndex per call (deep-constructed so a mutation in one
 * test cannot leak into another). One advisory record, empty triggers (D-03), and
 * a POSIX repo-relative sourceFile — deliberately NO body/content key.
 */
function makeCleanIndex(): RuleIndex {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    rules: [
      {
        id: "clean-rule",
        scope: "enterprise",
        triggers: {},
        phases: ["construction"],
        severity: "high",
        summary: "A clean record.",
        classification: "advisory",
        sourceFile: "test/fixtures/clean/enterprise/clean-rule.md",
      },
    ],
  };
}

test("validateIndex accepts a clean, body-free index (PACK-04 happy path)", () => {
  assert.doesNotThrow(() => validateIndex(makeCleanIndex()));
});

test("validateIndex rejects an index whose rule record carries an extra key (D-05 body-leak guard)", () => {
  const index = makeCleanIndex();
  // Attach the stray key via a runtime-held key name + bracket notation, so no
  // literal body/content field is written into the test source and TypeScript
  // does not reject the unknown property. Any extra record key must be refused —
  // additionalProperties:false leaves no place for a leaked body to live.
  const strayKey = "body";
  (index.rules[0] as unknown as Record<string, unknown>)[strayKey] =
    "Leaked rule prose that must never reach the index.";

  assert.throws(
    () => validateIndex(index),
    /additionalProperties|must NOT have additional/,
    "an extra rule-record key must be rejected by the output schema",
  );
});
