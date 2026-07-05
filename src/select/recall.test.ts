/**
 * The build-gating Core-Value test (SEL-01 acceptance evidence).
 *
 * THIS IS THE SINGLE MOST IMPORTANT TEST IN THE MILESTONE. Under-injection — a
 * critical rule silently never firing — is the #1 project risk. This suite runs
 * every labeled 02-01 case through the pure `select()` over the controlled eval
 * corpus, computes micro-averaged recall/precision + per-severity recall via the
 * eval harness, and ASSERTS:
 *
 *   - recallBySeverity.critical === 1.0  (a missed critical rule FAILS THE BUILD)
 *   - recallBySeverity.high     >= 0.9   (02-CONTEXT stated threshold)
 *
 * Precision is REPORTED via a console line for observability but NEVER asserted:
 * gating precision would pressure the engine toward under-injection, which
 * 02-CONTEXT explicitly rejects (Pitfall 3). Over-injection (noise) is the
 * acceptable failure mode; under-injection is not.
 *
 * The ground truth this measures against was proven internally consistent by
 * 02-01's eval-fixtures.test.ts (every expectedRuleId is a real winner) BEFORE
 * select() existed — so a typo cannot silently defeat this gate.
 *
 * Fixtures live under test/fixtures/ (tsc never compiles them); node --test runs
 * from the repo root, so process.cwd() is the repo root — mirrors select.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { runCases, aggregate, type EvalCase } from "./eval-harness.js";

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

/** Load + parse the labeled case set from disk (read via fs, never imported). */
function loadCases(): EvalCase[] {
  const raw = readFileSync(CASES_FILE, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  assert.ok(Array.isArray(parsed), "eval-cases.json must parse as a JSON array");
  return parsed as EvalCase[];
}

test("CORE-VALUE GATE: criticalRecall === 1.0 and highRecall >= 0.9 over the labeled eval set (SEL-01)", () => {
  const index = buildIndex(EVAL_ROOT);
  const cases = loadCases();
  const results = runCases(index, cases);
  const agg = aggregate(index, results);

  // Observability report — precision + per-severity recall (NEVER asserted).
  // eslint-disable-next-line no-console
  console.log(
    `[recall-gate] microPrecision=${agg.microPrecision.toFixed(3)} ` +
      `microRecall=${agg.microRecall.toFixed(3)} ` +
      `recall{critical=${agg.recallBySeverity.critical.toFixed(3)}, ` +
      `high=${agg.recallBySeverity.high.toFixed(3)}, ` +
      `medium=${agg.recallBySeverity.medium.toFixed(3)}, ` +
      `low=${agg.recallBySeverity.low.toFixed(3)}}`,
  );

  // THE GATE. A missed critical rule fails the build (anti-under-injection).
  assert.equal(
    agg.recallBySeverity.critical,
    1.0,
    "criticalRecall MUST be exactly 1.0 — a critical rule was under-injected (the #1 project risk)",
  );
  assert.ok(
    agg.recallBySeverity.high >= 0.9,
    `highRecall MUST be >= 0.9 (02-CONTEXT threshold), got ${agg.recallBySeverity.high.toFixed(3)}`,
  );
});
