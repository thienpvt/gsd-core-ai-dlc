/**
 * Unit suite for renderInjection (SEL-02) — RED-first against the Task 1 stub.
 *
 * Every case builds a hand-authored {@link SelectionResult} IN MEMORY (no file
 * I/O) and asserts a property of the rendered `<governance>` fragment:
 *   - fragment shape (open/close tags, per-rule id + [severity] + summary + hint),
 *   - severity-descending then id-ascending ordering (via SEVERITY_ORDINAL),
 *   - skip reasons never leak into the fragment (audit-only, Phase 5),
 *   - the empty-selection minimal-but-strippable block,
 *   - repeated-run byte-identity (determinism),
 *   - a STRUCTURAL guard that the injector source opens no file (no node:fs / no
 *     gray-matter import) — the belt for the no-body-read-path guarantee.
 *
 * RED note: renderInjection is a stub that throws, so every render assertion
 * fails until Task 2 implements it. The structural assertion reads the source
 * text and already holds (the stub was authored read-path-free) — it is the one
 * assertion that must stay green through GREEN.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderInjection, SEVERITY_ORDINAL } from "./inject.js";
import type { SelectionResult, SelectedRule, SkipReason } from "../types.js";

/** Build a SelectedRule with sane always-in-phase match provenance. */
function sel(id: string, severity: SelectedRule["severity"], summary: string): SelectedRule {
  return { id, severity, summary, matchedAxis: "always-in-phase", matchedValue: "always-in-phase" };
}

/** A 2-rule in-order in-budget result — the fragment-shape fixture. */
const TWO_RULE_RESULT: SelectionResult = {
  selected: [
    sel("require-mfa", "critical", "All privileged access requires multi-factor authentication."),
    sel("input-validation", "high", "Validate and sanitize all external input at the trust boundary."),
  ],
  skipped: [],
};

test("fragment shape: opens and closes with the <governance> tag", () => {
  const fragment = renderInjection(TWO_RULE_RESULT);
  const lines = fragment.split("\n");
  assert.equal(lines[0], "<governance>", "first line is the opening <governance> tag");
  // The last content line (before the trailing newline) is the closing tag.
  const nonEmpty = lines.filter((l) => l.length > 0);
  assert.equal(nonEmpty[nonEmpty.length - 1], "</governance>", "closes with </governance>");
});

test("fragment shape: each selected rule carries id, [severity] tag, summary, and a rule-detail hint", () => {
  const fragment = renderInjection(TWO_RULE_RESULT);
  for (const rule of TWO_RULE_RESULT.selected) {
    assert.ok(fragment.includes(rule.id), `fragment names id ${rule.id}`);
    assert.ok(fragment.includes(`[${rule.severity}]`), `fragment tags severity [${rule.severity}]`);
    assert.ok(fragment.includes(rule.summary), `fragment carries the summary for ${rule.id}`);
    assert.ok(
      fragment.includes(`governance rule-detail ${rule.id}`),
      `fragment carries the rule-detail hint for ${rule.id}`,
    );
  }
});

test("ordering: entries render severity-descending (SEVERITY_ORDINAL) then id-ascending", () => {
  // Deliberately NOT in final order: input is low, critical, high, plus two rules
  // sharing the `high` severity with ids out of order (zeta before alpha).
  const result: SelectionResult = {
    selected: [
      sel("low-rule", "low", "Low severity rule."),
      sel("crit-rule", "critical", "Critical severity rule."),
      sel("zeta-high", "high", "High severity rule zeta."),
      sel("alpha-high", "high", "High severity rule alpha."),
      sel("mid-rule", "medium", "Medium severity rule."),
    ],
    skipped: [],
  };
  const fragment = renderInjection(result);

  // Expected order: sort by SEVERITY_ORDINAL asc (critical=0 first), then id asc.
  const expected = [...result.selected]
    .sort((a, b) => {
      const bySeverity = SEVERITY_ORDINAL[a.severity] - SEVERITY_ORDINAL[b.severity];
      return bySeverity !== 0 ? bySeverity : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .map((r) => r.id);
  assert.deepEqual(expected, ["crit-rule", "alpha-high", "zeta-high", "mid-rule", "low-rule"]);

  // The fragment must list the ids in that exact order (compare first-seen positions).
  const positions = expected.map((id) => fragment.indexOf(id));
  for (const p of positions) assert.ok(p >= 0, "every expected id appears in the fragment");
  const sorted = [...positions].sort((a, b) => a - b);
  assert.deepEqual(positions, sorted, "ids appear severity-desc then id-asc");
});

test("skip reasons are excluded from the fragment (audit-only, Phase 5)", () => {
  const allReasons: SkipReason[] = [
    "out-of-phase",
    "out-of-scope",
    "out-of-scope-by-trigger",
    "superseded",
  ];
  const result: SelectionResult = {
    selected: [sel("require-mfa", "critical", "All privileged access requires MFA.")],
    skipped: allReasons.map((reason, i) => ({
      id: `skipped-${i}`,
      severity: "low" as const,
      reason,
    })),
  };
  const fragment = renderInjection(result);
  for (const reason of allReasons) {
    assert.ok(!fragment.includes(reason), `skip reason "${reason}" must NOT leak into the fragment`);
  }
  // The skipped ids must not appear either — only selected rules are rendered.
  for (let i = 0; i < allReasons.length; i++) {
    assert.ok(!fragment.includes(`skipped-${i}`), `skipped id skipped-${i} must not appear`);
  }
});

test("empty selection: renders a non-empty, still-strippable <governance> block with a no-rules line", () => {
  const result: SelectionResult = { selected: [], skipped: [] };
  const fragment = renderInjection(result);
  assert.ok(fragment.length > 0, "empty selection is never an empty string");
  assert.ok(fragment.includes("<governance>"), "opening tag present");
  assert.ok(fragment.includes("</governance>"), "closing tag present");
  assert.ok(/no governance rules/i.test(fragment), "states that no governance rules apply");
});

test("determinism: repeated calls on the same input are byte-identical", () => {
  const first = renderInjection(TWO_RULE_RESULT);
  const second = renderInjection(TWO_RULE_RESULT);
  assert.equal(first, second, "renderInjection is deterministic (no clock, no random, no I/O)");
});

test("structural: the injector module opens no file (no node:fs, no gray-matter import)", () => {
  const source = readFileSync(path.resolve(process.cwd(), "src", "inject", "inject.ts"), "utf8");
  // No filesystem import in any form (node:fs, node:fs/promises, bare "fs").
  assert.ok(!/from\s+["']node:fs["']/.test(source), "must not import node:fs");
  assert.ok(!/from\s+["']node:fs\/promises["']/.test(source), "must not import node:fs/promises");
  assert.ok(!/from\s+["']fs["']/.test(source), "must not import bare fs");
  assert.ok(!/require\(\s*["'](?:node:)?fs["']\s*\)/.test(source), "must not require fs");
  // No markdown-frontmatter reader (the only other body-bearing source). Match an
  // actual import/require statement, NOT a bare substring — the docstring may name
  // gray-matter to explain the guarantee without creating a read path.
  assert.ok(!/from\s+["']gray-matter["']/.test(source), "must not import gray-matter");
  assert.ok(!/require\(\s*["']gray-matter["']\s*\)/.test(source), "must not require gray-matter");
});
