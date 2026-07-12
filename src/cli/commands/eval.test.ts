/**
 * CLI shim `governance eval` exit-code contract tests (WR-01).
 *
 * The direct runner (src/select/eval-cli.ts isDirectRun) sets exit 3 on
 * parse/load errors. The CLI shim (src/cli/commands/eval.ts → runDirect) must
 * honor the SAME contract: parse/load error → exit 3, not exit 1 (the generic
 * code from index.ts's top-level catch). This file exercises the shim path
 * via a purpose-built temporary package (copied dist + seeded corpus) —
 * packaged corpus is immutable (no GOVERNANCE_EVAL_FIXTURES_ROOT override).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const DIST = path.resolve(process.cwd(), "dist");
/** Resolved host node_modules (worktrees may lack a local install). */
const NODE_MODULES = path.dirname(
  path.dirname(require.resolve("gray-matter/package.json")),
);
const REPO_CLI = path.resolve(process.cwd(), "dist", "cli", "index.js");

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

function spawnEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_PATH: NODE_MODULES };
  delete env.GOVERNANCE_EVAL_FIXTURES_ROOT;
  return env;
}

/**
 * Temp package with dist + malformed cases so loadCases throws parse error.
 * packageRoot() resolves from dist/select/eval-cli.js → package root.
 */
function withTempEvalCliPackage(fn: (pkg: string, cli: string) => void): void {
  const pkg = mkdtempSync(path.join(os.tmpdir(), "gsd-eval-cli-pkg-"));
  try {
    cpSync(DIST, path.join(pkg, "dist"), { recursive: true });
    try {
      symlinkSync(NODE_MODULES, path.join(pkg, "node_modules"), "junction");
    } catch {
      // NODE_PATH covers deps when junctions fail.
    }
    const rulesDir = path.join(pkg, "test", "fixtures", "eval", "eval-rules", "enterprise");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(path.join(rulesDir, "always-critical.md"), ALWAYS_CRITICAL_RULE, "utf8");
    const casesDir = path.join(pkg, "test", "fixtures", "eval", "cases");
    mkdirSync(casesDir, { recursive: true });
    writeFileSync(path.join(casesDir, "eval-cases.json"), "{ this is not valid json", "utf8");
    fn(pkg, path.join(pkg, "dist", "cli", "index.js"));
  } finally {
    rmSync(pkg, { recursive: true, force: true });
  }
}

test("WR-01: governance eval shim returns exit 3 on parse/load error (D-08 contract)", () => {
  withTempEvalCliPackage((pkg, cli) => {
    const child = spawnSync(process.execPath, [cli, "eval", "10"], {
      cwd: pkg,
      encoding: "utf8",
      env: spawnEnv(),
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
    const child = spawnSync(process.execPath, [REPO_CLI, "eval"], {
      cwd: root,
      encoding: "utf8",
      env: spawnEnv(),
    });
    assert.equal(
      child.status,
      3,
      `expected exit 3 on usage error (no phaseNumber), got ${child.status}\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
    );
    assert.match(child.stderr, /eval:/, "shim prefixes the usage error with 'eval:'");
  });
});
