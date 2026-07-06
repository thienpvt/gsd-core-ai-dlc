/**
 * End-to-end smoke test for the `governance inject` CLI command (SEL-02 render
 * surface, SEL-05 budget continuity).
 *
 * Spawns the BUILT CLI (`node dist/cli/index.js inject ...`) as a child process
 * against fixture SelectionResult JSON files, proving the command is wired into
 * dispatch and behaves at the process boundary:
 *
 *   Case A (in budget): exit 0, stdout carries a `<governance>` fragment with the
 *     open + close tags and at least one selected id.
 *   Case B (over budget): a budgetExceeded:true result exits 1 (the loud SEL-05
 *     signal), stderr is non-empty, and the `<governance>` fragment is STILL on
 *     stdout — the observable output is emitted even as the exit code signals
 *     overflow (never a silent over-budget fragment, never a truncated stdout).
 *   Case C (malformed): a non-JSON / missing-arrays payload exits non-zero with a
 *     non-empty stderr — a malformed input fails loud, never a silent empty
 *     fragment (Pitfall 7).
 *
 * Uses spawnSync against the real dist build so it exercises the actual bin path a
 * user hits; node --test runs from the repo root, so dist/ resolves from
 * process.cwd(). Temp files are cleaned up in a finally.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SelectionResult } from "../types.js";

const CLI = path.resolve(process.cwd(), "dist", "cli", "index.js");

/** Two selected rules with summaries — the shared body of both budget fixtures. */
const SELECTED: SelectionResult["selected"] = [
  {
    id: "require-mfa",
    severity: "critical",
    summary: "All privileged access requires multi-factor authentication.",
    matchedAxis: "always-in-phase",
    matchedValue: "always-in-phase",
  },
  {
    id: "input-validation",
    severity: "high",
    summary: "Validate and sanitize all external input at the trust boundary.",
    matchedAxis: "keywords",
    matchedValue: "input",
  },
];

/** In-budget result: budgetExceeded absent (a well-formed under-budget selection). */
const IN_BUDGET: SelectionResult = { selected: SELECTED, skipped: [] };

/** Over-budget result: same selection, but the SEL-05 overflow flag + budget set. */
const OVER_BUDGET: SelectionResult = {
  selected: SELECTED,
  skipped: [],
  budgetExceeded: true,
  budget: { used: 9999, limit: 1, offenders: ["require-mfa", "input-validation"] },
};

/** Write the three fixture files into a temp dir; run fn; clean up in a finally. */
function withTempFixtures(
  fn: (inBudgetPath: string, overBudgetPath: string, malformedPath: string) => void,
): void {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "gsd-inject-smoke-"));
  try {
    const inBudgetPath = path.join(tmpDir, "in-budget.json");
    const overBudgetPath = path.join(tmpDir, "over-budget.json");
    const malformedPath = path.join(tmpDir, "malformed.json");
    writeFileSync(inBudgetPath, JSON.stringify(IN_BUDGET), "utf8");
    writeFileSync(overBudgetPath, JSON.stringify(OVER_BUDGET), "utf8");
    // Not a SelectionResult — valid JSON but missing the selected/skipped arrays.
    writeFileSync(malformedPath, JSON.stringify({ foo: "bar" }), "utf8");
    fn(inBudgetPath, overBudgetPath, malformedPath);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

test("Case A (in budget): governance inject exits 0 with a <governance> fragment and >=1 selected id", () => {
  withTempFixtures((inBudgetPath) => {
    const proc = spawnSync(process.execPath, [CLI, "inject", "--input", inBudgetPath], {
      encoding: "utf8",
    });
    assert.equal(proc.status, 0, `expected exit 0, got ${proc.status} (stderr: ${proc.stderr})`);
    assert.ok(proc.stdout.includes("<governance>"), "stdout opens the governance block");
    assert.ok(proc.stdout.includes("</governance>"), "stdout closes the governance block");
    assert.ok(proc.stdout.includes("require-mfa"), "stdout carries at least one selected id");
  });
});

test("Case A (stdin): governance inject reads the SelectionResult from stdin identically to --input", () => {
  withTempFixtures(() => {
    const proc = spawnSync(process.execPath, [CLI, "inject"], {
      encoding: "utf8",
      input: JSON.stringify(IN_BUDGET),
    });
    assert.equal(proc.status, 0, `expected exit 0 on stdin, got ${proc.status} (stderr: ${proc.stderr})`);
    assert.ok(proc.stdout.includes("<governance>"), "stdin path renders the governance block");
    assert.ok(proc.stdout.includes("require-mfa"), "stdin path carries a selected id");
  });
});

test("Case B (over budget): governance inject exits 1 with a non-empty stderr and the fragment still on stdout (SEL-05)", () => {
  withTempFixtures((_inBudgetPath, overBudgetPath) => {
    const proc = spawnSync(process.execPath, [CLI, "inject", "--input", overBudgetPath], {
      encoding: "utf8",
    });
    assert.equal(proc.status, 1, `expected exit 1 on budget overflow, got ${proc.status}`);
    assert.ok(proc.stderr.trim().length > 0, "overflow must write a loud stderr signal");
    // The observable fragment is STILL emitted — never a silent over-budget drop.
    assert.ok(
      proc.stdout.includes("<governance>"),
      "the <governance> fragment is still on stdout even as the exit code signals overflow",
    );
  });
});

test("Case C (malformed): governance inject fails loud (non-zero) on a payload lacking selected/skipped arrays", () => {
  withTempFixtures((_inBudgetPath, _overBudgetPath, malformedPath) => {
    const proc = spawnSync(process.execPath, [CLI, "inject", "--input", malformedPath], {
      encoding: "utf8",
    });
    assert.notEqual(proc.status, 0, "a malformed input must fail non-zero, never a silent empty fragment");
    assert.ok(proc.stderr.trim().length > 0, "malformed input writes a loud stderr message");
  });
});
