/**
 * Ground-truth integrity suite for the Phase 2 labeled eval set (SEL-01).
 *
 * This proves the eval LABELS are internally consistent BEFORE any selection
 * engine exists. The Wave-3 recall gate (`criticalRecall === 1.0`) is only
 * trustworthy if the ground truth it measures against is verified: a typo'd or
 * mislabeled `expectedRuleId` would let a missed critical rule hide behind a
 * wrong label, silently defeating the anti-under-injection guarantee
 * (threat T-2-EVALINTEGRITY).
 *
 * It reuses Phase 1's `buildIndex` to compile the controlled `eval-rules/`
 * corpus and asserts every expected id resolves to a real winner id, the
 * empty-expected silent case is present, and a critical rule is under test.
 * It does NOT import or call `select()` (which lands in 02-02) — selection
 * BEHAVIOR is out of scope here; only the labels are validated.
 *
 * Fixtures live under test/fixtures/ (NOT src/, so tsc never compiles them) and
 * are read via fs at runtime. `node --test` runs from the repo root, so
 * process.cwd() is the repo root; paths are built with node:path (no hard-coded
 * separators) — mirrors src/index/precedence.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import type { RuleIndex } from "../types.js";

/**
 * Minimal shape of one labeled case. Deliberately local — selection types
 * (TaskSignal/SelectionConfig/...) do not exist until 02-02, and this suite
 * validates only the ground-truth LABELS, so it must not depend on them.
 */
interface EvalCase {
  name: string;
  signal: { taskType: string; keywords: string[]; paths: string[] };
  phase: string;
  scopeConfig: { domains: string[] };
  expectedRuleIds: string[];
}

const EVAL_ROOT = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "eval",
  "eval-rules",
);
const CASES_FILE = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "eval",
  "cases",
  "eval-cases.json",
);

/** The number of winner records the controlled corpus must compile to. */
const EXPECTED_WINNER_COUNT = 10;

/** Load + parse the labeled case set from disk (read via fs, never imported). */
function loadCases(): EvalCase[] {
  const raw = readFileSync(CASES_FILE, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  assert.ok(Array.isArray(parsed), "eval-cases.json must parse as a JSON array");
  return parsed as EvalCase[];
}

test("the eval corpus builds through Phase 1 buildIndex into exactly 10 winner records", () => {
  const index: RuleIndex = buildIndex(EVAL_ROOT);
  assert.equal(
    index.rules.length,
    EXPECTED_WINNER_COUNT,
    "11 fixture files minus the 1 data-retention collision collapse to 10 winners (D-11)",
  );
});

test("the case set parses as a JSON array of ~12 fully-formed labeled cases", () => {
  const cases = loadCases();
  assert.ok(
    cases.length >= 10 && cases.length <= 14,
    `expected ~12 cases (10-14 credible v1 range), got ${cases.length}`,
  );
  for (const c of cases) {
    assert.equal(typeof c.name, "string", "each case has a name");
    assert.ok(c.name.length > 0, `case name must be non-empty`);
    assert.equal(typeof c.signal, "object", `${c.name}: signal is an object`);
    assert.equal(
      typeof c.signal.taskType,
      "string",
      `${c.name}: signal.taskType is a string`,
    );
    assert.ok(
      Array.isArray(c.signal.keywords),
      `${c.name}: signal.keywords is an array`,
    );
    assert.ok(
      Array.isArray(c.signal.paths),
      `${c.name}: signal.paths is an array`,
    );
    assert.equal(typeof c.phase, "string", `${c.name}: phase is a string`);
    assert.ok(
      Array.isArray(c.scopeConfig.domains),
      `${c.name}: scopeConfig.domains is an array`,
    );
    assert.ok(
      Array.isArray(c.expectedRuleIds),
      `${c.name}: expectedRuleIds is an array`,
    );
  }
});

test("every expectedRuleId across all cases resolves to a real index winner id (no typo can silently pass the recall gate)", () => {
  const index = buildIndex(EVAL_ROOT);
  const validIds = new Set(index.rules.map((r) => r.id));
  const cases = loadCases();

  for (const c of cases) {
    for (const id of c.expectedRuleIds) {
      assert.ok(
        validIds.has(id),
        `case '${c.name}' expects rule id '${id}', which is not a winner in the built index — ` +
          `a mislabeled/typo'd expected id would let a missed critical rule hide (T-2-EVALINTEGRITY). ` +
          `Valid ids: ${[...validIds].sort().join(", ")}`,
      );
    }
  }
});

test("every eval case name is unique (WR-03): duplicate names corrupt severity-partitioned recall", () => {
  // WR-03: the recall harness keys severity-partitioned recall by case name. A
  // duplicate name would silently overwrite one case's selection set with
  // another's, flipping hit/miss results and potentially passing/failing the
  // critical gate falsely. The harness now throws on a duplicate, but assert
  // uniqueness here too so a bad fixture is caught at ground-truth integrity time.
  const cases = loadCases();
  const names = cases.map((c) => c.name);
  assert.equal(
    new Set(names).size,
    cases.length,
    `eval case names must be unique for severity recall — duplicates: ${names
      .filter((n, i) => names.indexOf(n) !== i)
      .join(", ")}`,
  );
});

test("an empty-expected silent case is present (proves the engine must be allowed to stay silent — precision)", () => {
  const cases = loadCases();
  const silent = cases.filter((c) => c.expectedRuleIds.length === 0);
  assert.ok(
    silent.length >= 1,
    "at least one case must have expectedRuleIds: [] so the eval set can measure over-injection",
  );
});

test("at least one critical rule is under test in some expected set (the Wave-3 critical-recall gate has a target)", () => {
  const index = buildIndex(EVAL_ROOT);
  const severityById = new Map(index.rules.map((r) => [r.id, r.severity]));
  const cases = loadCases();

  const expectedUnion = new Set<string>();
  for (const c of cases) {
    for (const id of c.expectedRuleIds) expectedUnion.add(id);
  }

  const criticalUnderTest = [...expectedUnion].filter(
    (id) => severityById.get(id) === "critical",
  );
  assert.ok(
    criticalUnderTest.length >= 1,
    `at least one expected rule must be severity 'critical' so criticalRecall === 1.0 is meaningful; ` +
      `expected union = ${[...expectedUnion].sort().join(", ")}`,
  );
});
