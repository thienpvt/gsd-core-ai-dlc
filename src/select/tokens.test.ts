/**
 * RED-first unit suite for the token estimator + the budget computation (SEL-05).
 *
 * Two things are proven here, both RED against Task 1's stubs / the un-budgeted
 * 02-02 core:
 *
 *   1. estimateTokens is the deterministic char/4 heuristic — ceil(length / 4)
 *      at the empty / exact-multiple / remainder boundaries. RED because the
 *      Task-1 estimateTokens is a throwing stub.
 *   2. select() flags budget overflow WITHOUT truncating. Over a corpus that
 *      selects several rules, a tiny budget (1) trips budgetExceeded with the
 *      selected ids as offenders and used > limit, while selected.length is
 *      IDENTICAL to the same call under a generous budget (proving Pitfall 6 —
 *      never drop/slice a selected rule to fit). A generous budget leaves
 *      budgetExceeded false (no false trip). RED because the 02-02 select() does
 *      not populate budgetExceeded/budget yet.
 *
 * The corpus is the controlled 02-01 eval-rules store compiled via Phase 1
 * buildIndex (never hand-written); node --test runs from the repo root so
 * process.cwd() is the repo root — mirrors select.test.ts / eval-fixtures.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import { estimateTokens, PER_RULE_OVERHEAD } from "./tokens.js";
import type { RuleIndex, TaskSignal, SelectionConfig } from "../types.js";

const EVAL_ROOT = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "eval",
  "eval-rules",
);

/** Compile the controlled eval corpus via Phase 1 buildIndex (10 winners + 1 superseded loser). */
function evalIndex(): RuleIndex {
  return buildIndex(EVAL_ROOT);
}

/**
 * A signal that selects several construction-phase rules with no domain
 * subscription: secrets-management (always-in-phase), input-validation
 * (keywords), and api-contract (taskType feature / keyword api). Chosen so the
 * budget-trip case has multiple offenders and the no-truncation invariant is
 * meaningful.
 */
const MULTI_SIGNAL: TaskSignal = {
  taskType: "feature",
  keywords: ["api", "input", "validation"],
  paths: [],
};
const BASE_CONFIG: Omit<SelectionConfig, "budget"> = {
  phase: "construction",
  domains: [],
};

test("estimateTokens is ceil(length / 4) at the empty / exact / remainder boundaries", () => {
  assert.equal(estimateTokens(""), 0, "empty string estimates 0 tokens");
  assert.equal(estimateTokens("abcd"), 1, "4 chars -> ceil(4/4) === 1");
  assert.equal(estimateTokens("abcde"), 2, "5 chars -> ceil(5/4) === 2");
  assert.equal(estimateTokens("abcdefgh"), 2, "8 chars -> ceil(8/4) === 2");
  assert.equal(estimateTokens("abcdefghi"), 3, "9 chars -> ceil(9/4) === 3");
});

test("PER_RULE_OVERHEAD is a single-sourced positive integer constant", () => {
  assert.equal(typeof PER_RULE_OVERHEAD, "number");
  assert.ok(
    Number.isInteger(PER_RULE_OVERHEAD) && PER_RULE_OVERHEAD > 0,
    "PER_RULE_OVERHEAD approximates the id/severity framing Phase 3 adds — a small positive integer",
  );
});

test("budget overflow: a tiny budget trips budgetExceeded with offenders and never truncates (SEL-05, Pitfall 6)", () => {
  const index = evalIndex();

  const generous = select(index, MULTI_SIGNAL, { ...BASE_CONFIG, budget: 100000 });
  assert.ok(
    generous.selected.length >= 2,
    "the fixture signal must select multiple rules for the budget case to be meaningful",
  );

  const trip = select(index, MULTI_SIGNAL, { ...BASE_CONFIG, budget: 1 });
  assert.equal(trip.budgetExceeded, true, "a budget of 1 must trip budgetExceeded");
  assert.ok(trip.budget, "budget detail must be populated on overflow");
  assert.ok(
    Array.isArray(trip.budget.offenders) && trip.budget.offenders.length > 0,
    "offenders must list the selected rule ids",
  );
  assert.ok(
    trip.budget.used > trip.budget.limit,
    "used must exceed limit when budgetExceeded is true",
  );
  assert.equal(trip.budget.limit, 1, "limit echoes the resolved budget");
  assert.equal(
    trip.selected.length,
    generous.selected.length,
    "budget overflow must NEVER truncate — selected.length is unchanged (Pitfall 6)",
  );
});

test("no false trip: a generous budget leaves budgetExceeded false with an empty offenders list", () => {
  const index = evalIndex();
  const result = select(index, MULTI_SIGNAL, { ...BASE_CONFIG, budget: 100000 });
  assert.equal(result.budgetExceeded, false, "a generous budget must not trip the signal");
  assert.ok(result.budget, "budget detail is populated even when within budget");
  assert.deepEqual(result.budget.offenders, [], "no offenders when within budget");
  assert.ok(
    result.budget.used <= result.budget.limit,
    "used must be within limit when budgetExceeded is false",
  );
});
