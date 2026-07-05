/**
 * End-to-end smoke test for the `governance select` CLI command (SEL-04 / SEL-05).
 *
 * Spawns the BUILT CLI (`node dist/cli/index.js select ...`) as a child process
 * against a freshly-built eval index + a fixture signal file, proving the command
 * is wired into dispatch and behaves at the process boundary:
 *
 *   Case A (in budget): exit 0, stdout parses as a SelectionResult with selected +
 *     skipped arrays, and at least one rule is selected.
 *   Case B (--budget 1 overflow): exit 1 (the loud SEL-05 signal), stderr is
 *     non-empty, and the emitted stdout is still a full SelectionResult with
 *     budgetExceeded true — the observable result is emitted even as the exit code
 *     signals overflow (never a silent truncation).
 *
 * RED (Task 3 pre-wire): `select` hits the dispatch default and exits 2, so Case A
 * (expects 0) and Case B (expects 1) both fail until the command is wired.
 *
 * Uses spawnSync against the real dist build so it exercises the actual bin path a
 * user hits; node --test runs from the repo root, so dist/ + the eval fixtures
 * resolve from process.cwd(). Temp files are cleaned up in a finally.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex, writeIndex } from "../index/build.js";
import type { SelectionResult } from "../types.js";

const EVAL_ROOT = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "eval",
  "eval-rules",
);
const CLI = path.resolve(process.cwd(), "dist", "cli", "index.js");

/** A construction signal that selects multiple rules: secrets-management (always-in-phase), api-contract, input-validation. */
const MULTI_SIGNAL = { taskType: "feature", keywords: ["api", "input"], paths: [] };

/** Build the eval index + write the signal file into a temp dir; run fn; clean up. */
function withTempCli(fn: (indexPath: string, signalPath: string) => void): void {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "gsd-select-smoke-"));
  try {
    const indexPath = path.join(tmpDir, "rule-index.json");
    writeIndex(buildIndex(EVAL_ROOT), indexPath);
    const signalPath = path.join(tmpDir, "signal.json");
    writeFileSync(signalPath, JSON.stringify(MULTI_SIGNAL), "utf8");
    fn(indexPath, signalPath);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

test("Case A (in budget): governance select exits 0 with a valid JSON SelectionResult and >=1 selected rule", () => {
  withTempCli((indexPath, signalPath) => {
    const proc = spawnSync(
      process.execPath,
      [CLI, "select", "--index", indexPath, "--phase", "construction", "--input", signalPath],
      { encoding: "utf8" },
    );
    assert.equal(proc.status, 0, `expected exit 0, got ${proc.status} (stderr: ${proc.stderr})`);
    const result = JSON.parse(proc.stdout) as SelectionResult;
    assert.ok(Array.isArray(result.selected), "stdout has a selected array");
    assert.ok(Array.isArray(result.skipped), "stdout has a skipped array");
    assert.ok(result.selected.length >= 1, "at least one rule is selected");
  });
});

test("Case B (--budget 1 overflow): governance select exits 1 with a non-empty stderr and budgetExceeded true (SEL-05)", () => {
  withTempCli((indexPath, signalPath) => {
    const proc = spawnSync(
      process.execPath,
      [
        CLI,
        "select",
        "--index",
        indexPath,
        "--phase",
        "construction",
        "--input",
        signalPath,
        "--budget",
        "1",
      ],
      { encoding: "utf8" },
    );
    assert.equal(proc.status, 1, `expected exit 1 on budget overflow, got ${proc.status}`);
    assert.ok(proc.stderr.trim().length > 0, "overflow must write a loud stderr signal");
    const result = JSON.parse(proc.stdout) as SelectionResult;
    assert.equal(
      result.budgetExceeded,
      true,
      "the emitted result still carries budgetExceeded true (full observability, no truncation)",
    );
  });
});
