/**
 * RED-first tests for the atomic state-store (RESEARCH §5, Pitfalls 4 + 5 + 7).
 *
 * Every <behavior> assertion in 04-01-PLAN Task 2 maps to a test below. Uses
 * mkdtempSync for an isolated projectRoot; rmSync in a finally for cleanup.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  writeSelection,
  readSelection,
  writePhaseRecord,
  readPhaseRecord,
  type GovernanceRecord,
} from "./state-store.js";
import { selectionStatePath, phaseRecordPath } from "./paths.js";
import type { Phase, SelectionResult, TaskSignal } from "../types.js";

/** Build a valid GovernanceRecord with the axes that matter for the test. */
function record(opts: {
  phase?: Phase;
  riskTier?: "critical" | "elevated" | "baseline";
  result?: SelectionResult;
  taskSignal?: TaskSignal;
} = {}): GovernanceRecord {
  return {
    phase: opts.phase ?? "construction",
    taskSignal: opts.taskSignal ?? {
      taskType: "feature",
      keywords: [],
      paths: [],
    },
    selectionConfig: {
      phase: opts.phase ?? "construction",
      domains: [],
      budget: 2000,
    },
    selectionResult:
      opts.result ??
      ({
        selected: [
          {
            id: "ENT-AUTH-01",
            severity: "high",
            summary: "Always-on baseline rule.",
            matchedAxis: "always-in-phase",
            matchedValue: "always-in-phase",
          },
        ],
        skipped: [],
        budgetExceeded: false,
        budget: { used: 10, limit: 2000, offenders: [] },
      } satisfies SelectionResult),
    riskTier: opts.riskTier ?? "baseline",
    timestamp: "2026-07-06T00:00:00.000Z",
  };
}

/** mkdtempSync projectRoot + auto-cleanup. */
function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-governance-store-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ── Round-trip: byte-identical selectionResult ──────────────────────────────

test("writeSelection + readSelection round-trip returns a record whose selectionResult is deep-equal (byte-identical selection; wrapper timestamp irrelevant)", () => {
  withTempRoot((root) => {
    const original = record();
    writeSelection(original, root);
    const reloaded = readSelection(root);
    assert.ok(reloaded !== null, "expected a record, got null");
    assert.deepEqual(
      reloaded.selectionResult,
      original.selectionResult,
      "selectionResult must be deep-equal after round-trip (Pitfall 4 — no clock in selection)",
    );
    // The full record (minus the wrapper timestamp which is metadata) must
    // also be stable — phase, signal, config, tier all preserved.
    assert.equal(reloaded.phase, original.phase);
    assert.equal(reloaded.riskTier, original.riskTier);
    assert.deepEqual(reloaded.taskSignal, original.taskSignal);
    assert.deepEqual(reloaded.selectionConfig, original.selectionConfig);
  });
});

// ── Atomic write: temp-then-rename ──────────────────────────────────────────

test("writeSelection writes via temp file then rename — a leftover .tmp file from a simulated crash is NOT read as the record", () => {
  withTempRoot((root) => {
    // 1. Write a valid record (atomic).
    const first = record();
    writeSelection(first, root);

    // 2. Simulate a crash by writing a partial/truncated .tmp directly.
    const finalPath = selectionStatePath(root);
    const tmpPath = `${finalPath}.tmp`;
    writeFileSync(tmpPath, "{ \"phase\": \"construction\", \"selectionResult\": PARTIAL", "utf8");

    // 3. readSelection must return the FIRST complete record, not the .tmp.
    const reloaded = readSelection(root);
    assert.ok(reloaded !== null);
    assert.deepEqual(reloaded.selectionResult, first.selectionResult);
  });
});

test("writeSelection's .tmp intermediate is gone after a successful write (rename completed)", () => {
  withTempRoot((root) => {
    const finalPath = selectionStatePath(root);
    const tmpPath = `${finalPath}.tmp`;
    writeSelection(record(), root);
    assert.ok(existsSync(finalPath), "final record file must exist");
    assert.ok(!existsSync(tmpPath), "leftover .tmp must be gone after rename");
  });
});

// ── Missing file: null (no record yet — not an error) ───────────────────────

test("readSelection returns null when the file does not exist yet (no record — not an error)", () => {
  withTempRoot((root) => {
    const result = readSelection(root);
    assert.equal(result, null);
  });
});

// ── Malformed file: THROW loud (Pitfall 7) ──────────────────────────────────

test("readSelection THROWS on a malformed (non-JSON) file — never silently returns null/empty (Pitfall 7)", () => {
  withTempRoot((root) => {
    const finalPath = selectionStatePath(root);
    mkdirSync(path.dirname(finalPath), { recursive: true });
    writeFileSync(finalPath, "{not valid json", "utf8");
    assert.throws(
      () => readSelection(root),
      /malformed governance state/i,
      "readSelection must throw a loud 'malformed governance state' error on non-JSON",
    );
  });
});

test("readSelection THROWS on a JSON record missing selectionResult — a partial record must NOT masquerade as valid (Pitfall 7)", () => {
  withTempRoot((root) => {
    const finalPath = selectionStatePath(root);
    mkdirSync(path.dirname(finalPath), { recursive: true });
    // Valid JSON, but missing the selectionResult field — a corrupt ledger
    // must fail loud, not silently coerce into a null/empty record.
    writeFileSync(
      finalPath,
      JSON.stringify({ phase: "construction", timestamp: "x" }),
      "utf8",
    );
    assert.throws(
      () => readSelection(root),
      /selectionResult|malformed governance state/i,
      "readSelection must throw on a record missing selectionResult",
    );
  });
});

// ── Atomic write: sequential writes leave the later record intact ───────────

test("writeSelection twice (sequential) leaves the LATER record intact — atomic rename, no truncation", () => {
  withTempRoot((root) => {
    const first = record({ riskTier: "baseline" });
    const second = record({ riskTier: "critical" });
    writeSelection(first, root);
    writeSelection(second, root);
    const reloaded = readSelection(root);
    assert.ok(reloaded !== null);
    assert.equal(reloaded.riskTier, "critical");
    assert.deepEqual(reloaded.selectionResult, second.selectionResult);
  });
});

// ── Per-phase records: same pattern ─────────────────────────────────────────

test("writePhaseRecord + readPhaseRecord round-trip a per-phase record", () => {
  withTempRoot((root) => {
    const r = record({ phase: "construction" });
    writePhaseRecord(r, root, "task-42");
    const reloaded = readPhaseRecord(root, "construction", "task-42");
    assert.ok(reloaded !== null);
    assert.deepEqual(reloaded.selectionResult, r.selectionResult);
  });
});

test("readPhaseRecord returns null when the per-phase record does not exist", () => {
  withTempRoot((root) => {
    const result = readPhaseRecord(root, "construction", "missing");
    assert.equal(result, null);
  });
});

test("readPhaseRecord THROWS on a malformed per-phase file (Pitfall 7)", () => {
  withTempRoot((root) => {
    const p = phaseRecordPath(root, "construction", "bad");
    // Ensure the parent dir exists so writeFileSync succeeds.
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, "garbage", "utf8");
    assert.throws(() => readPhaseRecord(root, "construction", "bad"), /malformed/i);
  });
});
