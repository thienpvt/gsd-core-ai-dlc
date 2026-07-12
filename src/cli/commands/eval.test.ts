/**
 * CLI shim `governance eval` exit-code contract tests (WR-01).
 *
 * The direct runner (src/select/eval-cli.ts isDirectRun) sets exit 3 on
 * parse/load errors. The CLI shim (src/cli/commands/eval.ts → runDirect) must
 * honor the SAME contract: parse/load error → exit 3, not exit 1 (the generic
 * code from index.ts's top-level catch). This file exercises the shim path
 * via `node dist/cli/index.js eval <phaseNumber>` (the public CLI surface),
 * seeding a valid rules dir + a malformed eval-cases.json so loadCases throws
 * a JSON parse error.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CLI_RUNNER = path.resolve(process.cwd(), "dist", "cli", "index.js");

function evalSpawnEnv(root: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GOVERNANCE_EVAL_FIXTURES_ROOT: path.join(root, "test", "fixtures", "eval"),
  };
}


const ALWAYS_CRITICAL_RULE = `---
id: always-critical
scope: enterprise
triggers: {}
phases:
  - construction
severity: critical
summary: Always-in-phase critical rule.
classification: advisory
---

## Rule: Always Critical
Body is irrelevant to the index.
`;

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-eval-shim-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("WR-01: governance eval shim returns exit 3 on parse/load error (D-08 contract)", () => {
  withTempRoot((root) => {
    // Valid rules dir so buildIndex succeeds.
    const rulesDir = path.join(root, "test", "fixtures", "eval", "eval-rules", "enterprise");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(path.join(rulesDir, "always-critical.md"), ALWAYS_CRITICAL_RULE, "utf8");
    // Malformed eval-cases.json → loadCases throws JSON.parse error (parse/load error).
    const casesDir = path.join(root, "test", "fixtures", "eval", "cases");
    mkdirSync(casesDir, { recursive: true });
    writeFileSync(path.join(casesDir, "eval-cases.json"), "{ this is not valid json", "utf8");

    const child = spawnSync(process.execPath, [CLI_RUNNER, "eval", "10"], {
      cwd: root,
      encoding: "utf8",
      env: evalSpawnEnv(root),
    });
    assert.equal(
      child.status,
      3,
      `expected exit 3 on parse/load error, got ${child.status}\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
    );
    assert.match(child.stderr, /eval:/, "shim prefixes the error message with 'eval:'");
  });
});

test("IN-03: governance eval shim returns exit 3 on usage error (no positional)", () => {
  withTempRoot((root) => {
    const child = spawnSync(process.execPath, [CLI_RUNNER, "eval"], {
      cwd: root,
      encoding: "utf8",
      env: evalSpawnEnv(root),
    });
    assert.equal(
      child.status,
      3,
      `expected exit 3 on usage error (no phaseNumber), got ${child.status}\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
    );
    assert.match(child.stderr, /eval:/, "shim prefixes the usage error with 'eval:'");
  });
});