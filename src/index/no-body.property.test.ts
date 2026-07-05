/**
 * Definitive PACK-04 no-body proof: a fast-check property over arbitrary rule
 * corpora (D-05, RESEARCH Test Strategy).
 *
 * The 01-01 smoke test and the 01-03 precedence test prove no body leaks for a
 * handful of hand-authored fixtures. This property generalizes the guarantee:
 * for any generated corpus, each rule gets a PER-RULE-UNIQUE body canary, and the
 * property asserts that NO canary ever appears in the serialized index AND that
 * validateIndex never throws. Per-rule-unique canaries (review LOW finding) mean a
 * leak can be traced to the exact rule, and a canary can never collide with a
 * frontmatter field value.
 *
 * Bodies flow through REAL temp .md files (not synthetic ParsedRules) because the
 * loader quarantines the body off ParsedRule — the only way to prove the body
 * cannot reach the index is to feed buildIndex a real file whose body is known.
 *
 * fast-check is imported as `import * as fc` — the CommonJS/nodenext interop form
 * proven green by the 01-01 smoke test.
 *
 * RED note (Task 1): the canary-absence sub-assertion already holds by the 01-01
 * whitelist construction, but validateIndex is a stub that throws, so the
 * `assert.doesNotThrow(() => validateIndex(index))` sub-assertion FAILS — the
 * property is RED overall until Task 2 implements validateIndex.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as fc from "fast-check";
import { buildIndex } from "./build.js";
import { validateIndex } from "./validate-index.js";

/**
 * A generated rule spec. `id` and `canary` are made positionally unique by the
 * property body, so no two rules in a corpus can share either.
 */
interface RuleSpec {
  token: string;
}

/**
 * Serialize a spec to a rule Markdown file: minimal valid advisory frontmatter
 * (empty triggers = D-03 always-in-phase) plus a body carrying the unique canary.
 * The body is authored AFTER the closing `---` so it is genuine Markdown content
 * that a naive builder could leak.
 */
function ruleFileContents(id: string, canary: string): string {
  return [
    "---",
    `id: ${id}`,
    "scope: enterprise",
    "triggers: {}",
    "phases:",
    "  - construction",
    "severity: low",
    "summary: Generated rule.",
    "classification: advisory",
    "---",
    "",
    `## ${id}`,
    "",
    canary,
    "",
  ].join("\n");
}

test("no rule body ever reaches the serialized index across arbitrary corpora (PACK-04 / D-05)", () => {
  const property = fc.property(
    // A non-empty array of specs; the alphanumeric token keeps bodies clean
    // Markdown with no `---` delimiter or YAML edge cases.
    fc.array(
      fc.record<RuleSpec>({
        // Word-character token (fast-check 4.x has no hexaString) — keeps bodies
        // clean Markdown with no `---` delimiter or YAML edge cases.
        token: fc.stringMatching(/^[a-z0-9]{4,12}$/),
      }),
      { minLength: 1, maxLength: 6 },
    ),
    (specs) => {
      const tmpDir = mkdtempSync(path.join(os.tmpdir(), "gsd-nobody-"));
      try {
        const enterpriseDir = path.join(tmpDir, "enterprise");
        mkdirSync(enterpriseDir, { recursive: true });

        // Per-rule-unique id + canary. The canary sentinel wraps the generated
        // token with the positional index so no two rules share a canary and a
        // canary cannot collide with any frontmatter value (review LOW finding).
        const canaries: string[] = [];
        specs.forEach((spec, i) => {
          const id = `gen-rule-${i}`;
          const canary = `__BODY_CANARY_${i}_${spec.token}__`;
          canaries.push(canary);
          writeFileSync(
            path.join(enterpriseDir, `${id}.md`),
            ruleFileContents(id, canary),
            "utf8",
          );
        });

        const index = buildIndex(tmpDir);
        const serialized = JSON.stringify(index);

        // Per-fragment loop (not a single whole-corpus check) so a failure names
        // the exact leaked canary.
        for (const canary of canaries) {
          assert.ok(
            !serialized.includes(canary),
            `rule body canary leaked into the index: ${canary}`,
          );
        }

        // The definitive guard: the emitted index validates against the no-body
        // output schema. RED against the Task 1 stub.
        assert.doesNotThrow(() => validateIndex(index));
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  );

  // Bound exploration to cap disk I/O while still varying body content + corpus
  // size (T-1-DET: temp-only, cleaned up, reproducible counterexample on failure).
  fc.assert(property, { numRuns: 30 });
});
