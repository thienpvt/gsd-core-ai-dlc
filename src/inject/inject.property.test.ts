/**
 * No-body-canary property for renderInjection (SEL-02, ROADMAP success criterion 3)
 * — RED-first against the Task 1 stub.
 *
 * The belt-and-suspenders proof on top of the structural guarantee (the injector
 * imports no node:fs / no gray-matter, so it has no body-read path). This property
 * generalizes it: for ANY generated corpus, each rule file gets a PER-RULE-UNIQUE
 * body canary written AFTER the closing `---`, then the real
 * buildIndex -> select -> renderInjection chain runs and the property asserts NO
 * canary ever appears in the rendered `<governance>` fragment. Because the whole
 * chain (load quarantines the body -> index carries summaries only -> select copies
 * summaries only -> renderInjection reads only summaries) is body-free, this holds
 * by construction; the test proves it end-to-end and transitively re-proves the
 * index/select stages stay body-free.
 *
 * Follows src/index/no-body.property.test.ts EXACTLY for interop + temp-corpus
 * mechanics: `import * as fc` (never a default import — Pitfall 2), tokens via
 * `fc.stringMatching(/^[a-z0-9]{4,12}$/)` (never `fc.hexaString`, absent in
 * fast-check 4.x — Pitfall 2), real temp `.md` files under a mkdtempSync dir,
 * rmSync in a finally, `fc.assert(property, { numRuns: 30 })`.
 *
 * RED note (Task 1): renderInjection is a stub that throws, so the property fails
 * for the first generated corpus (a reproducible fast-check seed prints on failure).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as fc from "fast-check";
import { buildIndex } from "../index/build.js";
import { select } from "../select/select.js";
import { renderInjection } from "./inject.js";
import type { TaskSignal, SelectionConfig } from "../types.js";

/** A generated rule spec. `token` is made positionally unique by the property body. */
interface RuleSpec {
  token: string;
}

/**
 * Serialize a spec to a rule Markdown file: minimal valid advisory frontmatter
 * (empty triggers = D-03 always-in-phase, so a construction-phase signal always
 * selects it) plus a body carrying the unique canary AFTER the closing `---`, so
 * it is genuine Markdown content a naive renderer could leak.
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

/** A construction-phase signal that selects every always-in-phase generated rule. */
const SIGNAL: TaskSignal = { taskType: "feature", keywords: [], paths: [] };
const CONFIG: SelectionConfig = { phase: "construction", domains: [] };

test("no rule body ever reaches the rendered <governance> fragment across arbitrary corpora (SEL-02 / success criterion 3)", () => {
  const property = fc.property(
    fc.array(
      fc.record<RuleSpec>({
        // Word-character token (fast-check 4.x has no hexaString — Pitfall 2) — keeps
        // bodies clean Markdown with no `---` delimiter or YAML edge cases.
        token: fc.stringMatching(/^[a-z0-9]{4,12}$/),
      }),
      { minLength: 1, maxLength: 6 },
    ),
    (specs) => {
      const tmpDir = mkdtempSync(path.join(os.tmpdir(), "gsd-inject-nobody-"));
      try {
        const enterpriseDir = path.join(tmpDir, "enterprise");
        mkdirSync(enterpriseDir, { recursive: true });

        // Per-rule-unique id + canary so a leak names the exact rule (mirrors the
        // index no-body property's per-rule canary discipline).
        const canaries: string[] = [];
        specs.forEach((spec, i) => {
          const id = `gen-rule-${i}`;
          const canary = `__BODY_CANARY_${i}_${spec.token}__`;
          canaries.push(canary);
          writeFileSync(path.join(enterpriseDir, `${id}.md`), ruleFileContents(id, canary), "utf8");
        });

        // The real chain: corpus -> index (summaries only) -> select -> render.
        const index = buildIndex(tmpDir);
        const result = select(index, SIGNAL, CONFIG);
        const fragment = renderInjection(result);

        // Per-canary loop (not a single whole-corpus check) so a failure names the
        // exact leaked canary.
        for (const canary of canaries) {
          assert.ok(
            !fragment.includes(canary),
            `rule body canary leaked into the injection fragment: ${canary}`,
          );
        }
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  );

  // Bound exploration to cap disk I/O while varying body content + corpus size
  // (temp-only, cleaned up, reproducible counterexample on failure).
  fc.assert(property, { numRuns: 30 });
});
