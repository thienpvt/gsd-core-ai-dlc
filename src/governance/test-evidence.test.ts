/**
 * AUDIT-04 test-evidence capture (parser + durable store).
 *
 * Parser half: parseTapSummary ports the TAP summary block parser verified locally
 * on Node v24.14.0 (RESEARCH §Code Examples "TAP Output Shape"). The `# tests N`
 * line is the load-bearing guard — absence = malformed = throw (D-04). Model
 * narration ("All tests passed.") has no `# tests N` line and is rejected (D-03).
 *
 * Store half: ports gate-evidence-store.test.ts / approval-store.test.ts 1:1
 * (round-trip, malformed-JSON loud-fail, missing-required-field loud-fail,
 * metadata-phase-mismatch). Validator is inline validateTestEvidence
 * (Ajv 2020 + x-binding keyword — same pattern as validate-approval.ts).
 *
 * RED note: test-evidence.ts does not exist yet — imports resolve to undefined
 * and every case fails. Task 2 turns them GREEN.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type TestEvidenceRecord,
  parseTapSummary,
  readTestEvidence,
  writeTestEvidence,
} from "./test-evidence.js";
import { selectionStatePath, testEvidencePath } from "./paths.js";

// ---------------------------------------------------------------------------
// Parser tests (pure function — no I/O). RESEARCH §Code Examples TAP shape.
// ---------------------------------------------------------------------------

const TAP_OK = `TAP version 13
ok 1 - passes
1..1
# tests 1
# pass 1
# fail 0
# duration_ms 12.34`;

const TAP_OK_FULL = `TAP version 13
# Subtest: demo-pass
ok 1 - demo-pass
  ---
  duration_ms: 0.4518
  type: 'test'
  ...
# Subtest: demo-fail
not ok 2 - demo-fail
  ---
  duration_ms: 0.4804
  location: 'test-demo.mjs:4:1'
  failureType: 'testCodeFailure'
  error: '...'
  ...
1..2
# tests 2
# pass 1
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 44.9934`;

test("parseTapSummary extracts counts from minimal TAP summary block", () => {
  const summary = parseTapSummary(TAP_OK);
  assert.deepEqual(summary, { total: 1, pass: 1, fail: 0, skipped: 0, duration_ms: 12.34 });
});

test("parseTapSummary extracts counts from full captured TAP output (verified Node v24.14.0 shape)", () => {
  const summary = parseTapSummary(TAP_OK_FULL);
  assert.deepEqual(summary, { total: 2, pass: 1, fail: 1, skipped: 0, duration_ms: 44.9934 });
});

test("parseTapSummary is deterministic: repeated calls on the same input deepEqual", () => {
  const first = parseTapSummary(TAP_OK);
  const second = parseTapSummary(TAP_OK);
  assert.deepEqual(first, second);
});

test("D-04 parseTapSummary hard-fails on output missing the `# tests N` summary line", () => {
  assert.throws(
    () => parseTapSummary("not a real runner output"),
    /malformed test runner output: missing `# tests N` summary line/i,
  );
});

test("D-03 parseTapSummary hard-fails on model-authored narration", () => {
  assert.throws(
    () => parseTapSummary("All tests passed."),
    /malformed test runner output: missing `# tests N` summary line/i,
  );
});

test("D-03 parseTapSummary hard-fails on TAP-ish output with no summary block (guard is on the summary line, not just any TAP prefix)", () => {
  // Looks TAP-shaped (has `ok 1`) but has no `1..N` plan and no `# tests N` summary.
  const tapWithoutSummary = `TAP version 13
ok 1 - passes`;
  assert.throws(
    () => parseTapSummary(tapWithoutSummary),
    /malformed test runner output: missing `# tests N` summary line/i,
  );
});

test("parseTapSummary defaults skipped/duration_ms to 0 when absent but keeps # tests required", () => {
  const minimalSummary = `TAP version 13
ok 1 - passes
1..1
# tests 1
# pass 1
# fail 0`;
  const summary = parseTapSummary(minimalSummary);
  assert.deepEqual(summary, { total: 1, pass: 1, fail: 0, skipped: 0, duration_ms: 0 });
});

// ---------------------------------------------------------------------------
// Store tests — port approval-store.test.ts / gate-evidence-store.test.ts 1:1.
// ---------------------------------------------------------------------------

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-test-evidence-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function record(overrides: Partial<TestEvidenceRecord> = {}): TestEvidenceRecord {
  return {
    phase: "09",
    capturedAt: "2026-07-07T00:00:00.000Z",
    runner: "node --test --test-reporter=tap",
    summary: {
      total: 1,
      pass: 1,
      fail: 0,
      skipped: 0,
      duration_ms: 12.34,
    },
    ...overrides,
  };
}

test("testEvidencePath stores test evidence under .planning/governance/tests/{NN}.json", () => {
  withTempRoot((root) => {
    assert.equal(
      testEvidencePath(root, "09"),
      path.join(root, ".planning", "governance", "tests", "09.json"),
    );
  });
});

test("readTestEvidence returns null when evidence is missing", () => {
  withTempRoot((root) => {
    assert.equal(readTestEvidence(root, "09"), null);
  });
});

test("writeTestEvidence round-trips a test evidence record", () => {
  withTempRoot((root) => {
    const original = record();
    writeTestEvidence(root, "09", original);
    const reloaded = readTestEvidence(root, "09");
    assert.deepEqual(reloaded, original);
  });
});

test("writeTestEvidence leaves no temp siblings and never writes selection-state.json", () => {
  withTempRoot((root) => {
    const finalPath = testEvidencePath(root, "09");
    writeTestEvidence(root, "09", record());
    const leftovers = readdirSync(path.dirname(finalPath)).filter(
      (name) => name !== path.basename(finalPath) && name.includes(".tmp"),
    );
    assert.deepEqual(leftovers, []);
    assert.equal(existsSync(selectionStatePath(root)), false);
  });
});

test("readTestEvidence throws loud on malformed JSON", () => {
  withTempRoot((root) => {
    const finalPath = testEvidencePath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    writeFileSync(finalPath, "{not-json", "utf8");
    assert.throws(
      () => readTestEvidence(root, "09"),
      /malformed test evidence at .*09\.json/i,
    );
  });
});

test("readTestEvidence throws loud when a required field is missing", () => {
  for (const field of ["phase", "capturedAt", "runner", "summary"] as const) {
    withTempRoot((root) => {
      const finalPath = testEvidencePath(root, "09");
      mkdirSync(path.dirname(finalPath), { recursive: true });
      const corrupt: Record<string, unknown> = { ...record() };
      delete corrupt[field];
      writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
      assert.throws(
        () => readTestEvidence(root, "09"),
        /malformed test evidence at .*09\.json/i,
      );
    });
  }
});

test("readTestEvidence throws loud when runner is not the const string", () => {
  withTempRoot((root) => {
    const finalPath = testEvidencePath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    const corrupt = record({ runner: "jest" as TestEvidenceRecord["runner"] });
    writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
    assert.throws(
      () => readTestEvidence(root, "09"),
      /malformed test evidence at .*09\.json/i,
    );
  });
});

test("readTestEvidence throws loud when capturedAt is not strict ISO", () => {
  withTempRoot((root) => {
    const finalPath = testEvidencePath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    const corrupt = record({ capturedAt: "2026/07/07" });
    writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
    assert.throws(
      () => readTestEvidence(root, "09"),
      /malformed test evidence at .*09\.json/i,
    );
  });
});

test("readTestEvidence throws loud when summary counts are negative", () => {
  withTempRoot((root) => {
    const finalPath = testEvidencePath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    const corrupt = record({
      summary: { total: -1, pass: 1, fail: 0, skipped: 0, duration_ms: 12.34 },
    });
    writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
    assert.throws(
      () => readTestEvidence(root, "09"),
      /malformed test evidence at .*09\.json/i,
    );
  });
});

test("readTestEvidence throws loud when phase mismatches the path phase", () => {
  withTempRoot((root) => {
    const finalPath = testEvidencePath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    const corrupt = record({ phase: "08" });
    writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
    assert.throws(
      () => readTestEvidence(root, "09"),
      /malformed test evidence at .*09\.json/i,
    );
  });
});
