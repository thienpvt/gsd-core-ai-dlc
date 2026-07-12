/**
 * Phase 17 Plan 02: binding java-spring-unit-line-coverage suite.
 *
 * Locks JAVA-COV-01 against real aidlc-rules: binding metadata, paths-only
 * positives (engine OR-combines positive axes — no positive taskType/keywords),
 * exclude.taskType docs/test/infra, exclude test/generated/build/target paths,
 * non-Java feature/bugfix/refactor negatives, BODY_CANARY quarantine.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import { renderInjection } from "../inject/inject.js";
import type { RuleIndex, SelectionConfig, TaskSignal } from "../types.js";

const RULE_ID = "java-spring-unit-line-coverage";
const BODY_CANARY = "BODY_CANARY java-spring-unit-line-coverage";
const ESSAY_HEADING = "## Rule JS-COV-01: Unit Line Coverage";
const PACK_ROOT = path.resolve(process.cwd(), "aidlc-rules");
const RULE_FILE = path.join(
  PACK_ROOT,
  "domain",
  "java-spring",
  "java-spring-unit-line-coverage.md",
);
const DETAIL_FILE = path.join(
  PACK_ROOT,
  "domain",
  "java-spring",
  "details",
  "java-spring-unit-line-coverage-detail.md",
);

const SUBSCRIBED: SelectionConfig = {
  phase: "construction",
  domains: ["java-spring"],
};

function packIndex(): RuleIndex {
  return buildIndex(PACK_ROOT);
}

function isSelected(
  result: ReturnType<typeof select>,
  id: string,
): boolean {
  return result.selected.some((s) => s.id === id);
}

function signal(
  taskType: TaskSignal["taskType"],
  paths: string[],
  keywords: string[] = [],
): TaskSignal {
  return { taskType, keywords, paths };
}

// ---------------------------------------------------------------------------
// JAVA-COV-01 — binding metadata
// ---------------------------------------------------------------------------

test("JAVA-COV-01: index contains binding coverage rule with enforcement coverage-report", () => {
  const index = packIndex();
  const rec = index.rules.find((r) => r.id === RULE_ID);
  assert.ok(rec, `index must contain ${RULE_ID}`);
  assert.equal(rec.classification, "binding");
  assert.equal(rec.enforcement, "coverage-report");
  assert.equal(rec.severity, "high");
  assert.equal(rec.scope, "domain");
  assert.ok(rec.phases.includes("construction"), "phases must include construction");
  assert.ok(rec.detailPath && rec.detailPath.length > 0, "detailPath must be set");
  assert.ok(!rec.summary.includes("\n"), "summary must be single line");
  assert.ok(rec.summary.trim().length > 0, "summary non-empty");
  assert.ok(
    rec.summary.length <= 160,
    `summary length ${rec.summary.length} exceeds 160`,
  );
  const trimmed = rec.summary.trim();
  assert.ok(
    /[.!?]$/.test(trimmed),
    `summary must end with sentence punctuation; got: ${trimmed}`,
  );
});

test("JAVA-COV-01: paths-only positives — no positive taskType or keywords triggers", () => {
  const index = packIndex();
  const rec = index.rules.find((r) => r.id === RULE_ID);
  assert.ok(rec, `index must contain ${RULE_ID}`);
  const tt = rec.triggers.taskType ?? [];
  const kw = rec.triggers.keywords ?? [];
  assert.equal(
    tt.length,
    0,
    "positive taskType must be empty/absent (paths-only; OR-combine would over-select)",
  );
  assert.equal(
    kw.length,
    0,
    "positive keywords must be empty/absent (paths-only design)",
  );
  const paths = rec.triggers.paths ?? [];
  assert.ok(paths.includes("**/src/main/java/**"), "must trigger on **/src/main/java/**");
  assert.ok(
    paths.includes("**/src/main/**/*.java"),
    "must trigger on **/src/main/**/*.java",
  );
});

// ---------------------------------------------------------------------------
// Positive path selection
// ---------------------------------------------------------------------------

test("JAVA-COV-01 positive: src/main/java/...Foo.java under construction selects", () => {
  const index = packIndex();
  const result = select(
    index,
    signal("feature", ["src/main/java/com/acme/Foo.java"]),
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, RULE_ID),
    "src/main/java production path must select coverage rule",
  );
  const hit = result.selected.find((s) => s.id === RULE_ID);
  assert.ok(hit);
  assert.equal(hit.matchedAxis, "paths", "selection must be path-driven");
});

test("JAVA-COV-01 positive: src/main/Foo.java under construction selects", () => {
  const index = packIndex();
  const result = select(
    index,
    signal("bugfix", ["src/main/Foo.java"]),
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, RULE_ID),
    "src/main/**/*.java production path must select coverage rule",
  );
});

test("JAVA-COV-01 positive: refactor taskType with Java path still selects (path-driven)", () => {
  const index = packIndex();
  const result = select(
    index,
    signal("refactor", ["src/main/java/com/acme/Bar.java"]),
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, RULE_ID),
    "refactor + Java production path must select (path axis, not taskType)",
  );
});

// ---------------------------------------------------------------------------
// Negative exclude.taskType
// ---------------------------------------------------------------------------

test("JAVA-COV-01 negative: docs|test|infra with Java production path NOT selected", () => {
  const index = packIndex();
  const javaPath = "src/main/java/com/acme/Foo.java";
  for (const taskType of ["docs", "test", "infra"] as const) {
    const result = select(index, signal(taskType, [javaPath]), SUBSCRIBED);
    assert.ok(
      !isSelected(result, RULE_ID),
      `${taskType} taskType must exclude coverage rule even with Java path`,
    );
  }
});

// ---------------------------------------------------------------------------
// Negative non-Java production work (paths-only design lock)
// ---------------------------------------------------------------------------

test("JAVA-COV-01 negative: feature/bugfix/refactor on non-Java paths NOT selected", () => {
  const index = packIndex();
  const nonJava = [
    "src/main/ts/app.ts",
    "src/main/python/app.py",
    "docs/guide.md",
    "package.json",
    "README.md",
  ];
  for (const taskType of ["feature", "bugfix", "refactor"] as const) {
    for (const p of nonJava) {
      const result = select(index, signal(taskType, [p]), SUBSCRIBED);
      assert.ok(
        !isSelected(result, RULE_ID),
        `${taskType} + ${p} must NOT select (paths-only; no positive taskType OR-combine)`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Negative exclude paths
// ---------------------------------------------------------------------------

test("JAVA-COV-01 negative: src/test, generated, build, target paths NOT selected", () => {
  const index = packIndex();
  const excluded = [
    "src/test/java/FooTest.java",
    "generated/com/acme/Foo.java",
    "build/classes/com/acme/Foo.class",
    "target/classes/com/acme/Foo.class",
  ];
  for (const p of excluded) {
    const result = select(index, signal("feature", [p]), SUBSCRIBED);
    assert.ok(
      !isSelected(result, RULE_ID),
      `excluded path ${p} must NOT select coverage rule`,
    );
  }
});

// ---------------------------------------------------------------------------
// Hygiene / BODY_CANARY quarantine
// ---------------------------------------------------------------------------

test("JAVA-COV-01 hygiene: rule + detail carry BODY_CANARY; index and inject quarantine", () => {
  assert.ok(existsSync(RULE_FILE), `rule file missing: ${RULE_FILE}`);
  assert.ok(existsSync(DETAIL_FILE), `detail file missing: ${DETAIL_FILE}`);

  const ruleBody = readFileSync(RULE_FILE, "utf8");
  const detailBody = readFileSync(DETAIL_FILE, "utf8");
  assert.ok(
    ruleBody.includes(BODY_CANARY),
    "rule body must contain BODY_CANARY java-spring-unit-line-coverage",
  );
  assert.ok(
    detailBody.includes(BODY_CANARY),
    "detail must contain BODY_CANARY java-spring-unit-line-coverage",
  );
  assert.ok(
    ruleBody.includes(ESSAY_HEADING),
    `rule body must include heading ${ESSAY_HEADING}`,
  );

  const index = packIndex();
  const serialized = JSON.stringify(index);
  assert.ok(
    !serialized.includes(BODY_CANARY),
    "JSON.stringify(index) must not contain BODY_CANARY",
  );
  assert.ok(
    !serialized.includes(ESSAY_HEADING),
    "JSON.stringify(index) must not contain essay heading",
  );

  const result = select(
    index,
    signal("feature", ["src/main/java/com/acme/Foo.java"]),
    SUBSCRIBED,
  );
  assert.ok(isSelected(result, RULE_ID), "selecting signal required for inject proof");
  const fragment = renderInjection(result);
  assert.ok(
    !fragment.includes(BODY_CANARY),
    "renderInjection must not include BODY_CANARY",
  );
  assert.ok(
    !fragment.includes(ESSAY_HEADING),
    "renderInjection must not include ## Rule JS-COV-01 heading",
  );
  const rec = index.rules.find((r) => r.id === RULE_ID);
  assert.ok(rec);
  assert.ok(
    fragment.includes(rec.summary),
    "inject fragment must carry the one-sentence summary",
  );
});
