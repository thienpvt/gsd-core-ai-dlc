/**
 * Per-skip-reason suite for the selection core (SEL-04, AUDIT-02 alignment).
 *
 * RED (Task 1): `select()` is a stub that throws, so every assertion here fails —
 * this encodes the exact skip-reason contract Task 2 turns green. It proves each
 * candidate that is NOT selected carries the correct enum value chosen by the
 * FIRST failing gate in the fixed order phase -> scope -> trigger, and that
 * superseded losers (D-11) are emitted from the winner's superseded[] rather than
 * re-matched.
 *
 * Corpus = the controlled 02-01 eval-rules store via Phase 1 buildIndex.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import type { RuleIndex, TaskSignal, SelectionConfig } from "../types.js";

const EVAL_ROOT = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "eval",
  "eval-rules",
);

function evalIndex(): RuleIndex {
  return buildIndex(EVAL_ROOT);
}

/** All skipped records for a given rule id (an id may appear as winner + superseded loser). */
function skippedFor(
  index: RuleIndex,
  signal: TaskSignal,
  config: SelectionConfig,
  id: string,
) {
  return select(index, signal, config).skipped.filter((s) => s.id === id);
}

test("out-of-phase: ops-runbook (operations-only) is skipped for a construction signal", () => {
  const index = evalIndex();
  // 'deploy' matches ops-runbook's keyword axis — but the phase gate fires FIRST,
  // so the reason must be out-of-phase, not out-of-scope-by-trigger.
  const signal: TaskSignal = { taskType: "feature", keywords: ["deploy"], paths: [] };
  const skips = skippedFor(index, signal, { phase: "construction", domains: [] }, "ops-runbook");
  assert.equal(skips.length, 1, "ops-runbook must appear exactly once as skipped");
  assert.equal(skips[0].reason, "out-of-phase");
});

test("gate order: an out-of-phase AND non-matching rule is skipped out-of-phase (first failing gate wins)", () => {
  const index = evalIndex();
  // No 'deploy'/'runbook' keyword, so ops-runbook's trigger axis would ALSO miss.
  // The phase gate precedes the trigger gate, so the reason is still out-of-phase.
  const signal: TaskSignal = { taskType: "docs", keywords: ["unrelated"], paths: [] };
  const skips = skippedFor(index, signal, { phase: "construction", domains: [] }, "ops-runbook");
  assert.equal(skips.length, 1);
  assert.equal(
    skips[0].reason,
    "out-of-phase",
    "phase gate precedes trigger gate — the first failing gate sets the reason",
  );
});

test("out-of-scope: domain rule threat-model is skipped when 'security' is not subscribed", () => {
  const index = evalIndex();
  // security taskType + 'threat' keyword WOULD match threat-model's triggers, but
  // the scope gate fires first because the security domain is not subscribed.
  const signal: TaskSignal = { taskType: "security", keywords: ["threat"], paths: [] };
  const skips = skippedFor(index, signal, { phase: "construction", domains: [] }, "threat-model");
  assert.equal(skips.length, 1, "threat-model must appear exactly once as skipped");
  assert.equal(skips[0].reason, "out-of-scope");
});

test("out-of-scope-by-trigger: an in-phase in-scope rule whose axes do not match is skipped by trigger", () => {
  const index = evalIndex();
  // input-validation (enterprise, construction) has keywords [validation, input];
  // an unrelated keyword misses every axis -> out-of-scope-by-trigger.
  const signal: TaskSignal = { taskType: "docs", keywords: ["unrelated"], paths: [] };
  const skips = skippedFor(index, signal, { phase: "construction", domains: [] }, "input-validation");
  assert.equal(skips.length, 1);
  assert.equal(skips[0].reason, "out-of-scope-by-trigger");
});

test("matched-then-excluded: logging-standard is skipped out-of-scope-by-trigger with a distinguishing detail", () => {
  const index = evalIndex();
  // 'logging' matches the positive keyword axis, but the test-file path trips the
  // exclude axis, which wins (D-02). Enum stays out-of-scope-by-trigger; detail
  // distinguishes matched-then-excluded from a plain no-match.
  const signal: TaskSignal = {
    taskType: "refactor",
    keywords: ["logging"],
    paths: ["src/app.test.ts"],
  };
  const skips = skippedFor(index, signal, { phase: "construction", domains: [] }, "logging-standard");
  assert.equal(skips.length, 1);
  assert.equal(skips[0].reason, "out-of-scope-by-trigger");
  assert.equal(
    skips[0].detail,
    "matched-then-excluded",
    "exclude-wins skips carry a detail so the audit distinguishes them from never-matched",
  );
});

test("superseded: the enterprise data-retention loser is emitted from the winner's superseded[] (D-11), not re-matched", () => {
  const index = evalIndex();
  // 'retention' selects the project data-retention winner; the enterprise loser
  // must still surface as a superseded skip sourced from the winner's superseded[].
  const signal: TaskSignal = { taskType: "data", keywords: ["retention"], paths: [] };
  const result = select(index, signal, { phase: "construction", domains: [] });
  const superseded = result.skipped.filter((s) => s.reason === "superseded");
  assert.ok(
    superseded.some((s) => s.id === "data-retention"),
    "the enterprise data-retention loser must appear as a superseded skip (D-11)",
  );
  // The winner should be the one that was selected (project rule wins precedence).
  assert.ok(
    result.selected.some((s) => s.id === "data-retention"),
    "the project data-retention winner should be selected on the 'retention' keyword",
  );
});
