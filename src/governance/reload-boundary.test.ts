import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex, writeIndex } from "../index/build.js";
import { renderInjection } from "../inject/inject.js";
import { discussHook } from "./discuss-hook.js";
import { executeHook } from "./execute-hook.js";
import { selectionStatePath } from "./paths.js";
import { readSelection } from "./state-store.js";
import type { TaskSignal } from "../types.js";

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
    "severity: critical",
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

function writeFixtureIndex(root: string): void {
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
  writeIndex(buildIndex(corpusDir), path.join(root, "rule-index.json"));
}

function writeState(root: string): void {
  const statePath = path.join(root, ".planning", "STATE.md");
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(
    statePath,
    [
      "---",
      "gsd_state_version: 1.0",
      "current_phase: 2",
      "status: executing",
      "---",
      "",
      "# Project State",
      "",
    ].join("\n"),
    "utf8",
  );
}

function signal(): TaskSignal {
  return {
    taskType: "feature",
    keywords: ["auth"],
    paths: ["src/auth/login.ts"],
  };
}

function captureStdout<T>(fn: () => T): { result: T; stdout: string } {
  let stdout = "";
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += Buffer.isBuffer(chunk)
      ? chunk.toString("utf8")
      : String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    return { result: fn(), stdout };
  } finally {
    process.stdout.write = original as typeof process.stdout.write;
  }
}

function writeHalf(projectRoot: string): {
  expectedSelectionJson: string;
  expectedFragment: string;
} {
  const discussed = discussHook({
    projectRoot,
    taskSignal: signal(),
  });
  assert.ok(discussed.record.selectionResult.selected.length > 0);
  assert.ok(discussed.fragment.startsWith("<governance>"));
  assert.ok(selectionStatePath(projectRoot).endsWith("selection-state.json"));

  return {
    expectedSelectionJson: JSON.stringify(discussed.record.selectionResult),
    expectedFragment: discussed.fragment,
  };
}

function readHalf(projectRoot: string): {
  firstSelectionJson: string;
  secondSelectionJson: string;
  renderedFragment: string;
  executeFragment: string;
  executeStdout: string;
} {
  const first = readSelection(projectRoot);
  assert.ok(first !== null, "selection-state.json must reload from disk");
  const second = readSelection(projectRoot);
  assert.ok(second !== null, "second read must also reload from disk");
  const executed = captureStdout(() =>
    executeHook({ projectRoot, statePath: selectionStatePath(projectRoot) }),
  );

  return {
    firstSelectionJson: JSON.stringify(first.selectionResult),
    secondSelectionJson: JSON.stringify(second.selectionResult),
    renderedFragment: renderInjection(first.selectionResult),
    executeFragment: executed.result.fragment,
    executeStdout: executed.stdout,
  };
}

test("reload-after-boundary: discuss-written GovernanceRecord reloads byte-identical from disk for execute", () => {
  const projectRoot = mkdtempSync(path.join(os.tmpdir(), "gsd-reload-boundary-"));
  try {
    writeFixtureIndex(projectRoot);
    writeState(projectRoot);

    const written = writeHalf(projectRoot);

    // --- simulate compaction/subagent boundary: read half receives only projectRoot ---
    const reloaded = readHalf(projectRoot);

    assert.equal(reloaded.firstSelectionJson, written.expectedSelectionJson);
    assert.equal(reloaded.renderedFragment, written.expectedFragment);
    assert.equal(reloaded.executeFragment, written.expectedFragment);
    assert.equal(reloaded.executeStdout, written.expectedFragment);
    assert.equal(
      reloaded.secondSelectionJson,
      reloaded.firstSelectionJson,
      "two sequential reloads must be byte-identical to each other",
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
