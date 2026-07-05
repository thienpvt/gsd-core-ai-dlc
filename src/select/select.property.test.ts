/**
 * fast-check invariants for the pure selection core (02-RESEARCH §4).
 *
 * These generalize the curated 02-01 eval-set assertions to ARBITRARY corpora:
 * for any generated rule store + signal, the matching core must hold four
 * invariants. Where the eval set proves "the engine is right on these 12 cases",
 * the property proves "the engine is structurally sound on any corpus".
 *
 *   1. selected ⊆ triggered — every selected rule genuinely passes phase + scope
 *      + trigger (re-derived INDEPENDENTLY here), and selected/skipped id-sets are
 *      disjoint. The anti-over-selection invariant.
 *   2. stable ordering — two select() calls on identical inputs are
 *      JSON.stringify-equal, and both output arrays are ascending by id.
 *   3. total accounting — |selected| + |skipped| === |index.rules| + Σ superseded,
 *      so no candidate silently vanishes (SEL-04).
 *   4. exclude-wins — a rule whose positive axis AND exclude axis both match the
 *      signal is always skipped `out-of-scope-by-trigger` (D-02).
 *
 * Follows src/index/no-body.property.test.ts EXACTLY for interop + temp-corpus
 * mechanics: `import * as fc` (Pitfall 5 — never a default import), token
 * generation via fc.stringMatching(/^[a-z0-9]{4,12}$/) (Pitfall 4 — fast-check
 * 4.x has NO fc.hexaString), generated rules written as real temp .md files run
 * through the real buildIndex, rmSync in a finally, fc.assert numRuns:30.
 *
 * All generated rules are scope `enterprise` (always a candidate) so the scope
 * gate is constant and the independent re-derivation stays trustworthy — the
 * domain-subscription + superseded paths are proven against the real eval corpus
 * in select.test.ts / skip-reasons.test.ts. Every corpus additionally carries a
 * guaranteed exclude-wins rule (`gen-excl`) so invariant 4 always has a target.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as fc from "fast-check";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import type {
  RuleIndex,
  RuleIndexRecord,
  TaskSignal,
  SelectionConfig,
  TaskType,
  Phase,
  Severity,
} from "../types.js";

/** The 8 task types (mirrors the frontmatter schema enum) for enum-equality generation. */
const TASK_TYPES: readonly TaskType[] = [
  "feature",
  "bugfix",
  "refactor",
  "docs",
  "test",
  "infra",
  "security",
  "data",
];

/** Phase-array choices; `common` and multi-phase exercise the always-in-phase phase bucket. */
const PHASE_CHOICES: readonly Phase[][] = [
  ["construction"],
  ["operations"],
  ["inception"],
  ["construction", "inception"],
  ["common"],
];

const SEVERITIES: readonly Severity[] = ["critical", "high", "medium", "low"];

/** The phase every case is selected under — rules lacking it (and `common`) are out-of-phase. */
const SELECT_PHASE: Phase = "construction";

/** A generated positive-only rule spec (excludes are reserved for the dedicated gen-excl rule). */
interface RuleSpec {
  taskTypes: TaskType[];
  keywords: string[];
  phases: Phase[];
  severity: Severity;
}

/** A clean word token — no `---` delimiter or YAML edge cases (Pitfall 4: fc.stringMatching, not hexaString). */
const TOKEN = fc.stringMatching(/^[a-z0-9]{4,12}$/);

const ruleSpecArb: fc.Arbitrary<RuleSpec> = fc.record<RuleSpec>({
  taskTypes: fc.uniqueArray(fc.constantFrom(...TASK_TYPES), { maxLength: 2 }),
  keywords: fc.uniqueArray(TOKEN, { maxLength: 3 }),
  phases: fc.constantFrom(...PHASE_CHOICES),
  severity: fc.constantFrom(...SEVERITIES),
});

/** A generated corpus + the signal to select against it. signal.keywords is non-empty so gen-excl can reuse keyword[0]. */
const corpusArb = fc.record({
  specs: fc.array(ruleSpecArb, { minLength: 0, maxLength: 5 }),
  signalTaskType: fc.constantFrom(...TASK_TYPES),
  signalKeywords: fc.uniqueArray(TOKEN, { minLength: 1, maxLength: 3 }),
});

/** Serialize a positive-only rule spec to valid rule Markdown (empty triggers -> `triggers: {}`, D-03). */
function ruleFile(id: string, spec: RuleSpec): string {
  const lines = ["---", `id: ${id}`, "scope: enterprise"];
  const hasTaskTypes = spec.taskTypes.length > 0;
  const hasKeywords = spec.keywords.length > 0;
  if (!hasTaskTypes && !hasKeywords) {
    lines.push("triggers: {}");
  } else {
    lines.push("triggers:");
    if (hasTaskTypes) {
      lines.push("  taskType:");
      // taskType comes from the fixed enum — always a safe bareword.
      for (const t of spec.taskTypes) lines.push(`    - ${t}`);
    }
    if (hasKeywords) {
      lines.push("  keywords:");
      // Quote keyword tokens: an all-digit token (e.g. "123456") or a YAML
      // boolean word ("true"/"false") would otherwise parse as a number/bool and
      // fail the string-array schema. Quoting forces a string regardless of value.
      for (const k of spec.keywords) lines.push(`    - "${k}"`);
    }
  }
  lines.push("phases:");
  for (const p of spec.phases) lines.push(`  - ${p}`);
  lines.push(`severity: ${spec.severity}`);
  lines.push("summary: Generated rule summary.");
  lines.push("classification: advisory");
  lines.push("---", "", `## ${id}`, "");
  return lines.join("\n");
}

/** The guaranteed exclude-wins rule: positive keyword AND exclude keyword both === kw, in-phase. */
function excludeRuleFile(id: string, kw: string): string {
  // Quote the keyword: an all-digit token (e.g. "123456") or a YAML boolean word
  // ("true"/"false") would otherwise parse as a number/bool and fail the
  // string-array schema. Quoting forces a string regardless of the token value.
  return [
    "---",
    `id: ${id}`,
    "scope: enterprise",
    "triggers:",
    "  keywords:",
    `    - "${kw}"`,
    "  exclude:",
    "    keywords:",
    `      - "${kw}"`,
    "phases:",
    "  - construction",
    "severity: high",
    "summary: Exclude-wins generated rule.",
    "classification: advisory",
    "---",
    "",
    `## ${id}`,
    "",
  ].join("\n");
}

/** The id every corpus's exclude-wins rule carries — invariant 4's fixed target. */
const EXCLUDE_ID = "gen-excl";

/**
 * Write a generated corpus to a temp dir, buildIndex it, run `fn`, and clean up.
 * Every corpus carries the exclude-wins rule so invariant 4 always has a target.
 */
function withCorpus(
  specs: RuleSpec[],
  signal: TaskSignal,
  fn: (index: RuleIndex) => void,
): void {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "gsd-select-prop-"));
  try {
    const enterpriseDir = path.join(tmpDir, "enterprise");
    mkdirSync(enterpriseDir, { recursive: true });
    specs.forEach((spec, i) => {
      const id = `gen-rule-${i}`;
      writeFileSync(path.join(enterpriseDir, `${id}.md`), ruleFile(id, spec), "utf8");
    });
    // signal.keywords is generated non-empty, so keyword[0] is always present.
    writeFileSync(
      path.join(enterpriseDir, `${EXCLUDE_ID}.md`),
      excludeRuleFile(EXCLUDE_ID, signal.keywords[0]),
      "utf8",
    );
    fn(buildIndex(tmpDir));
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// --- Independent gate re-derivation (deliberately NOT importing select()'s helpers) ---

function inPhaseIndep(phases: readonly Phase[], phase: Phase): boolean {
  return phases.includes(phase) || phases.includes("common");
}

/** Case-insensitive substring: any trigger keyword is a substring of any signal keyword (trigger = needle). */
function keywordMatchIndep(
  triggerKeywords: readonly string[] | undefined,
  signalKeywords: readonly string[],
): boolean {
  if (!triggerKeywords) return false;
  for (const sig of signalKeywords) {
    const hay = sig.trim().toLowerCase();
    for (const trig of triggerKeywords) {
      if (hay.includes(trig.trim().toLowerCase())) return true;
    }
  }
  return false;
}

/**
 * Independently re-derive whether `record` should be selected for `signal` at
 * `SELECT_PHASE` — mirrors the locked D-01..D-04 semantics WITHOUT reusing
 * select()'s code, so agreement is a genuine cross-check. Every generated rule
 * is enterprise (always in scope); no paths are generated.
 */
function passesAllGatesIndep(record: RuleIndexRecord, signal: TaskSignal): boolean {
  if (!inPhaseIndep(record.phases, SELECT_PHASE)) return false;
  // enterprise scope is always a candidate — no domain gating in this generator.
  const t = record.triggers;
  const empty =
    (t.taskType?.length ?? 0) === 0 &&
    (t.keywords?.length ?? 0) === 0 &&
    (t.paths?.length ?? 0) === 0;
  if (empty) {
    // WR-01: an exclude-only rule (no positive axis, but an exclude carve-out)
    // must still honor its exclude BEFORE falling through to always-in-phase —
    // mirrors select()'s exclude check in the empty-triggers branch, so this
    // independent cross-check re-encodes the corrected D-02/D-03 semantics.
    if (t.exclude) {
      if (t.exclude.taskType?.includes(signal.taskType)) return false;
      if (keywordMatchIndep(t.exclude.keywords, signal.keywords)) return false;
    }
    return true; // D-03 always-in-phase
  }
  let positive = false;
  if (t.taskType?.includes(signal.taskType)) positive = true;
  if (!positive && keywordMatchIndep(t.keywords, signal.keywords)) positive = true;
  if (!positive) return false;
  if (t.exclude) {
    if (t.exclude.taskType?.includes(signal.taskType)) return false; // exclude-wins
    if (keywordMatchIndep(t.exclude.keywords, signal.keywords)) return false;
  }
  return true;
}

function toSignal(taskType: TaskType, keywords: string[]): TaskSignal {
  return { taskType, keywords, paths: [] };
}

const CONFIG: SelectionConfig = { phase: SELECT_PHASE, domains: [] };

test("invariant 1 — selected ⊆ triggered: every selected rule genuinely passes its gates and selected/skipped are disjoint", () => {
  fc.assert(
    fc.property(corpusArb, ({ specs, signalTaskType, signalKeywords }) => {
      const signal = toSignal(signalTaskType, signalKeywords);
      withCorpus(specs, signal, (index) => {
        const result = select(index, signal, CONFIG);
        const selectedIds = new Set(result.selected.map((s) => s.id));
        const skippedIds = new Set(result.skipped.map((s) => s.id));
        for (const id of selectedIds) {
          assert.ok(!skippedIds.has(id), `rule ${id} must not be BOTH selected and skipped`);
        }
        const byId = new Map(index.rules.map((r) => [r.id, r]));
        for (const s of result.selected) {
          const record = byId.get(s.id);
          assert.ok(record, `selected ${s.id} must be a real index winner`);
          assert.ok(
            passesAllGatesIndep(record, signal),
            `selected ${s.id} must independently pass phase+scope+trigger (no over-selection)`,
          );
        }
      });
    }),
    { numRuns: 30 },
  );
});

test("invariant 2 — stable ordering: repeated select() is byte-identical and both arrays are ascending by id", () => {
  fc.assert(
    fc.property(corpusArb, ({ specs, signalTaskType, signalKeywords }) => {
      const signal = toSignal(signalTaskType, signalKeywords);
      withCorpus(specs, signal, (index) => {
        const first = select(index, signal, CONFIG);
        const second = select(index, signal, CONFIG);
        assert.equal(
          JSON.stringify(first),
          JSON.stringify(second),
          "identical inputs must yield byte-identical output (determinism)",
        );
        const selIds = first.selected.map((s) => s.id);
        const skIds = first.skipped.map((s) => s.id);
        assert.deepEqual(selIds, [...selIds].sort(), "selected ids must be ascending");
        assert.deepEqual(skIds, [...skIds].sort(), "skipped ids must be ascending");
      });
    }),
    { numRuns: 30 },
  );
});

test("invariant 3 — total accounting: selected + skipped === winners + Σ superseded (nothing vanishes)", () => {
  fc.assert(
    fc.property(corpusArb, ({ specs, signalTaskType, signalKeywords }) => {
      const signal = toSignal(signalTaskType, signalKeywords);
      withCorpus(specs, signal, (index) => {
        const result = select(index, signal, CONFIG);
        const superseded = index.rules.reduce(
          (n, r) => n + (r.superseded?.length ?? 0),
          0,
        );
        assert.equal(
          result.selected.length + result.skipped.length,
          index.rules.length + superseded,
          "every candidate must be accounted for exactly once",
        );
      });
    }),
    { numRuns: 30 },
  );
});

test("invariant 4 — exclude-wins: a rule matching a positive axis AND an exclude axis is skipped out-of-scope-by-trigger", () => {
  fc.assert(
    fc.property(corpusArb, ({ specs, signalTaskType, signalKeywords }) => {
      const signal = toSignal(signalTaskType, signalKeywords);
      withCorpus(specs, signal, (index) => {
        const result = select(index, signal, CONFIG);
        const excl = result.skipped.find((s) => s.id === EXCLUDE_ID);
        assert.ok(
          excl,
          `${EXCLUDE_ID} matches a positive keyword AND an exclude keyword — it must be SKIPPED, never selected`,
        );
        assert.equal(
          excl.reason,
          "out-of-scope-by-trigger",
          "exclude-wins skip must carry reason out-of-scope-by-trigger (D-02)",
        );
      });
    }),
    { numRuns: 30 },
  );
});
