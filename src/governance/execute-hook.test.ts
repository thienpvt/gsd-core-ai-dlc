import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex, writeIndex } from "../index/build.js";
import { renderInjection } from "../inject/inject.js";
import type { GovernanceRecord } from "./state-store.js";
import { writeSelection } from "./state-store.js";
import { selectionStatePath } from "./paths.js";
import { discussHook } from "./discuss-hook.js";
import { executeHook } from "./execute-hook.js";
import type { SelectionResult, TaskSignal } from "../types.js";

function enterpriseRule(id: string): string {
  return [
    "---",
    `id: ${id}`,
    "scope: enterprise",
    "triggers: {}",
    "phases:",
    "  - construction",
    "severity: low",
    `summary: ${id} baseline summary.`,
    "classification: advisory",
    "---",
    "",
    `## ${id}`,
    "",
    "Body never injected.",
    "",
  ].join("\n");
}

function securityRule(id: string): string {
  return [
    "---",
    `id: ${id}`,
    "scope: domain",
    "triggers:",
    "  keywords:",
    "    - auth",
    "phases:",
    "  - construction",
    "severity: high",
    `summary: ${id} security summary.`,
    "classification: advisory",
    "---",
    "",
    `## ${id}`,
    "",
    "Body never injected.",
    "",
  ].join("\n");
}

function writeFixtureIndex(root: string): string {
  const corpusDir = path.join(root, "fixture-corpus");
  mkdirSync(path.join(corpusDir, "enterprise"), { recursive: true });
  mkdirSync(path.join(corpusDir, "domain", "security"), { recursive: true });
  writeFileSync(
    path.join(corpusDir, "enterprise", "baseline.md"),
    enterpriseRule("baseline-rule"),
    "utf8",
  );
  writeFileSync(
    path.join(corpusDir, "domain", "security", "auth.md"),
    securityRule("security-auth-rule"),
    "utf8",
  );
  const indexPath = path.join(root, "rule-index.json");
  writeIndex(buildIndex(corpusDir), indexPath);
  return indexPath;
}

function writeState(root: string, currentPhase = 2): string {
  const statePath = path.join(root, ".planning", "STATE.md");
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(
    statePath,
    [
      "---",
      "gsd_state_version: 1.0",
      `current_phase: ${currentPhase}`,
      "status: executing",
      "---",
      "",
      "# Project State",
      "",
    ].join("\n"),
    "utf8",
  );
  return statePath;
}

function signal(overrides: Partial<TaskSignal> = {}): TaskSignal {
  return {
    taskType: overrides.taskType ?? "feature",
    keywords: overrides.keywords ?? ["auth"],
    paths: overrides.paths ?? ["src/auth/login.ts"],
  };
}

function withFixtureRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-execute-hook-"));
  try {
    writeFixtureIndex(root);
    writeState(root);
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function captureProcessWrites<T>(fn: () => T): {
  result: T;
  stdout: string;
  stderr: string;
} {
  let stdout = "";
  let stderr = "";
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += Buffer.isBuffer(chunk)
      ? chunk.toString("utf8")
      : String(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr += Buffer.isBuffer(chunk)
      ? chunk.toString("utf8")
      : String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    return { result: fn(), stdout, stderr };
  } finally {
    process.stdout.write = originalStdout as typeof process.stdout.write;
    process.stderr.write = originalStderr as typeof process.stderr.write;
  }
}

test("executeHook happy path reloads persisted record and delegates rendering to renderInjection", () => {
  withFixtureRoot((root) => {
    const discussed = discussHook({
      projectRoot: root,
      taskSignal: signal(),
    });
    const captured = captureProcessWrites(() => executeHook({ projectRoot: root }));
    const expected = renderInjection(discussed.record.selectionResult);

    assert.equal(captured.result.fragment, expected);
    assert.equal(captured.stdout, expected);
    assert.deepEqual(captured.result.record.selectionResult, discussed.record.selectionResult);
  });
});

test("executeHook reload-not-rederive ignores later rule-index and STATE mutations", () => {
  withFixtureRoot((root) => {
    const discussed = discussHook({
      projectRoot: root,
      taskSignal: signal(),
    });
    const expected = renderInjection(discussed.record.selectionResult);

    unlinkSync(path.join(root, "rule-index.json"));
    writeState(root, 5);

    const captured = captureProcessWrites(() => executeHook({ projectRoot: root }));
    assert.equal(captured.result.fragment, expected);
    assert.equal(captured.stdout, expected);
    assert.deepEqual(captured.result.record.selectionResult, discussed.record.selectionResult);
  });
});

test("executeHook budget-continuity emits fragment before warning and sets process.exitCode=1", () => {
  withFixtureRoot((root) => {
    const selectionResult: SelectionResult = {
      selected: [
        {
          id: "budget-rule",
          severity: "critical",
          summary: "Over budget rule summary.",
          matchedAxis: "always-in-phase",
          matchedValue: "always-in-phase",
        },
      ],
      skipped: [],
      budgetExceeded: true,
      budget: {
        used: 3000,
        limit: 2000,
        offenders: ["budget-rule"],
      },
    };
    const record: GovernanceRecord = {
      phase: "construction",
      taskSignal: signal(),
      selectionConfig: {
        phase: "construction",
        domains: [],
        budget: 2000,
      },
      selectionResult,
      riskTier: "baseline",
      timestamp: "2026-07-06T00:00:00.000Z",
    };
    writeSelection(record, root);

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      const captured = captureProcessWrites(() => executeHook({ projectRoot: root }));
      const expected = renderInjection(selectionResult);
      assert.equal(captured.stdout, expected);
      assert.equal(captured.result.fragment, expected);
      assert.match(captured.stderr, /budget exceeded/i);
      assert.match(captured.stderr, /used 3000/i);
      assert.match(captured.stderr, /limit 2000/i);
      assert.match(captured.stderr, /budget-rule/i);
      assert.equal(process.exitCode, 1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});

test("executeHook loud-on-missing throws when selection-state.json is absent", () => {
  withFixtureRoot((root) => {
    assert.throws(
      () => executeHook({ projectRoot: root }),
      /selection-state\.json|missing|governance selection state/i,
    );
  });
});

test("executeHook loud-on-malformed propagates state-store parse failures", () => {
  withFixtureRoot((root) => {
    const statePath = selectionStatePath(root);
    mkdirSync(path.dirname(statePath), { recursive: true });
    writeFileSync(statePath, "{not json", "utf8");

    assert.throws(
      () => executeHook({ projectRoot: root }),
      /malformed governance state/i,
    );
  });
});

test("executeHook structural check: source imports no select, validateSignal, or classifyRisk", () => {
  const src = require("node:fs").readFileSync(
    path.resolve(__dirname, "..", "..", "src", "governance", "execute-hook.ts"),
    "utf8",
  );
  assert.doesNotMatch(src, /from\s+["']\.\.\/select\//);
  assert.doesNotMatch(src, /\bvalidateSignal\b/);
  assert.doesNotMatch(src, /\bclassifyRisk\b/);
});
