/**
 * AUDIT-04 producer-side wiring (D-02, D-03, D-04) — TDD RED tests.
 *
 * captureTestEvidence: spawn → parseTapSummary → return record. Tests inject
 * a `spawnRunner` seam returning fixture stdout so no real `node --test` is
 * spawned (slow + brittle + env-dependent). The orchestrator/persist split is
 * pure-ish: captureTestEvidence returns the record; the CLI main (runDirect)
 * calls writeTestEvidence to persist. This keeps the function testable in
 * isolation.
 *
 * RED note: capture-test-evidence.ts does not exist yet — imports resolve to
 * undefined and every case fails. Task 2 turns them GREEN.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  captureTestEvidence,
  type CaptureTestEvidenceArgs,
} from "./capture-test-evidence.js";
import { readTestEvidence, writeTestEvidence } from "./test-evidence.js";
import { writeGovernanceAudit } from "./audit-artifact.js";
import { testEvidencePath } from "./paths.js";
import { writeSelection, type GovernanceRecord } from "./state-store.js";
import type { SelectionResult } from "../types.js";

// TAP_OK fixture — verbatim from test-evidence.test.ts lines 41-47 (verified
// Node v24.14.0 shape). This is the exact stdout defaultSpawnRunner must
// produce in production.
const TAP_OK = `TAP version 13
ok 1 - passes
1..1
# tests 1
# pass 1
# fail 0
# duration_ms 12.34`;

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-capture-test-evidence-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function fixtureSelectionResult(): SelectionResult {
  return {
    selected: [
      {
        id: "AIDLC-AUDIT-01",
        severity: "critical",
        summary: "Record applied governance from selector output.",
        matchedAxis: "paths",
        matchedValue: "src/governance/capture-test-evidence.ts",
      },
    ],
    skipped: [],
  };
}

function fixtureRecord(): GovernanceRecord {
  return {
    phase: "construction",
    taskSignal: {
      taskType: "feature",
      keywords: ["audit", "test-evidence"],
      paths: ["src/governance/capture-test-evidence.ts"],
    },
    selectionConfig: {
      phase: "construction",
      domains: ["governance"],
      budget: 2000,
    },
    selectionResult: fixtureSelectionResult(),
    riskTier: "elevated",
    timestamp: "2026-07-07T00:00:00.000Z",
  };
}

test("captureTestEvidence parses injected TAP stdout and returns a TestEvidenceRecord with the runner const", () => {
  const args: CaptureTestEvidenceArgs = {
    projectRoot: "/tmp/proj",
    phaseNumber: "09",
    spawnRunner: () => TAP_OK,
  };
  const record = captureTestEvidence(args);
  assert.equal(record.phase, "09");
  assert.equal(record.runner, "node --test --test-reporter=tap");
  assert.deepEqual(record.summary, {
    total: 1,
    pass: 1,
    fail: 0,
    skipped: 0,
    duration_ms: 12.34,
  });
  // capturedAt is strict ISO 8601 — Date.parse finite + regex matches the
  // audit-artifact.ts strict ISO shape.
  assert.ok(Date.parse(record.capturedAt) !== Number.NaN);
  assert.ok(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(record.capturedAt),
    "capturedAt must be strict ISO 8601",
  );
});

test("captureTestEvidence persists via writeTestEvidence to .planning/governance/tests/{NN}.json (D-02)", () => {
  withTempRoot((root) => {
    // captureTestEvidence returns the record; the CLI main (runDirect) calls
    // writeTestEvidence to persist. This test exercises the same sequence.
    const record = captureTestEvidence({
      projectRoot: root,
      phaseNumber: "09",
      spawnRunner: () => TAP_OK,
    });
    writeTestEvidence(root, "09", record);
    const reloaded = readTestEvidence(root, "09");
    assert.ok(reloaded !== null, "test evidence file must exist");
    assert.deepEqual(reloaded!.summary, record.summary);
    assert.equal(existsSync(testEvidencePath(root, "09")), true);
  });
});

test("D-04 malformed runner output hard-fails through parseTapSummary before writeTestEvidence is called", () => {
  withTempRoot((root) => {
    assert.throws(
      () =>
        captureTestEvidence({
          projectRoot: root,
          phaseNumber: "09",
          spawnRunner: () => "All tests passed. Looks good.",
        }),
      /malformed test runner output: missing `# tests N` summary line/i,
    );
    // Critical: NO file written — the guard fires BEFORE persistence.
    assert.equal(existsSync(testEvidencePath(root, "09")), false);
  });
});

test("D-03 narration rejection: TAP-shaped output without the # tests N summary line hard-fails", () => {
  withTempRoot((root) => {
    // TAP-ish (has ok line + plan line) but NO summary block.
    const tapWithoutSummary = `TAP version 13
ok 1 - passes
1..1
`;
    assert.throws(
      () =>
        captureTestEvidence({
          projectRoot: root,
          phaseNumber: "09",
          spawnRunner: () => tapWithoutSummary,
        }),
      /malformed test runner output: missing `# tests N` summary line/i,
    );
    assert.equal(existsSync(testEvidencePath(root, "09")), false);
  });
});

test("End-to-end: captureTestEvidence → writeTestEvidence → readTestEvidence → writeGovernanceAudit populates tests_executed in GOVERNANCE.md", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    const phaseDir = path.join(root, ".planning", "phases", "09-test-e2e");
    const outputPath = path.join(phaseDir, "GOVERNANCE.md");

    // Producer: capture + persist.
    const record = captureTestEvidence({
      projectRoot: root,
      phaseNumber: "09",
      spawnRunner: () => TAP_OK,
    });
    writeTestEvidence(root, "09", record);

    // Consumer: writeGovernanceAudit reads tests/{NN}.json and populates
    // tests_executed in the v2 audit artifact (WR-01 read-side wiring).
    const result = writeGovernanceAudit({ projectRoot: root, outputPath });

    assert.ok(result.audit.tests_executed, "tests_executed must be populated in GOVERNANCE.md");
    assert.deepEqual(result.audit.tests_executed, record.summary);
  });
});

test("Production-caller grep evidence: parseTapSummary and writeTestEvidence have a non-test caller", () => {
  const srcPath = path.resolve(__dirname, "..", "..", "src", "governance", "capture-test-evidence.ts");
  // Read the compiled dist sibling if source isn't reachable (covers dist-only
  // invocations). Prefer the source for accuracy.
  let src = "";
  try {
    src = readFileSync(srcPath, "utf8");
  } catch {
    const distPath = path.resolve(__dirname, "capture-test-evidence.js");
    src = readFileSync(distPath, "utf8");
  }
  // Static proof: both helpers appear as call sites (not just imports).
  assert.ok(
    src.includes("parseTapSummary("),
    "capture-test-evidence must call parseTapSummary (production caller)",
  );
  assert.ok(
    src.includes("writeTestEvidence("),
    "capture-test-evidence must call writeTestEvidence (production caller)",
  );
});