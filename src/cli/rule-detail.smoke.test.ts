/**
 * End-to-end smoke test for the `governance rule-detail <id>` CLI command (SEL-03).
 *
 * Spawns the BUILT CLI (`node dist/cli/index.js rule-detail <id> ...`) as a child
 * process against freshly-built indexes, proving the lazy detail loader is wired
 * into dispatch and behaves at the process boundary:
 *
 *   Case A (has detail): rule-detail on `with-detail` prints the authored detail
 *     body (exit 0) — the ONE sanctioned place a rule body surfaces (SEL-03 fetch).
 *   Case B (D-06 no detail): rule-detail on `require-mfa` (a summary-only rule in
 *     the real aidlc-rules index) prints the summary + a clear no-detail signal
 *     (exit 0) — NOT an error.
 *   Case C (unknown id): rule-detail on a bogus id exits non-zero with a non-empty
 *     stderr message (fail loud, never a silent empty body).
 *
 * RED (Task 3 pre-wire): `rule-detail` hits the dispatch default and exits 2, so
 * Case A + Case B (expect 0) fail until the command is wired.
 *
 * Uses spawnSync against the real dist build so it exercises the actual bin path a
 * user hits; node --test runs from the repo root, so dist/ + the fixtures resolve
 * from process.cwd(). Temp files are cleaned up in a finally.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex, writeIndex } from "../index/build.js";

const DETAILPATH_STORE = path.resolve(process.cwd(), "test", "fixtures", "detailpath-store");
const AIDLC_STORE = path.resolve(process.cwd(), "aidlc-rules");
const CLI = path.resolve(process.cwd(), "dist", "cli", "index.js");

/** Build both indexes into a temp dir, run fn, clean up. */
function withTempCli(fn: (detailIndex: string, aidlcIndex: string) => void): void {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "gsd-rule-detail-smoke-"));
  try {
    const detailIndex = path.join(tmpDir, "detail-index.json");
    writeIndex(buildIndex(DETAILPATH_STORE), detailIndex);
    const aidlcIndex = path.join(tmpDir, "aidlc-index.json");
    writeIndex(buildIndex(AIDLC_STORE), aidlcIndex);
    fn(detailIndex, aidlcIndex);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

test("Case A (has detail): rule-detail prints the authored detail body and exits 0 (SEL-03)", () => {
  withTempCli((detailIndex) => {
    const proc = spawnSync(
      process.execPath,
      [CLI, "rule-detail", "with-detail", "--index", detailIndex],
      { encoding: "utf8" },
    );
    assert.equal(proc.status, 0, `expected exit 0, got ${proc.status} (stderr: ${proc.stderr})`);
    assert.ok(
      proc.stdout.includes("DETAIL_BODY_CANARY"),
      `stdout must carry the fetched detail body, got: ${proc.stdout}`,
    );
  });
});

test("Case B (D-06 no detail): rule-detail prints summary + a no-detail signal and exits 0", () => {
  withTempCli((_detailIndex, aidlcIndex) => {
    const proc = spawnSync(
      process.execPath,
      [CLI, "rule-detail", "require-mfa", "--index", aidlcIndex],
      { encoding: "utf8" },
    );
    assert.equal(proc.status, 0, `expected exit 0 for a summary-only rule, got ${proc.status} (stderr: ${proc.stderr})`);
    assert.ok(
      proc.stdout.includes("multi-factor authentication"),
      `stdout must carry the rule summary (D-06), got: ${proc.stdout}`,
    );
    assert.ok(
      proc.stdout.includes("no separate detail file"),
      `stdout must carry a clear no-detail signal (D-06), got: ${proc.stdout}`,
    );
  });
});

test("Case C (unknown id): rule-detail exits non-zero with a non-empty stderr (fail loud)", () => {
  withTempCli((detailIndex) => {
    const proc = spawnSync(
      process.execPath,
      [CLI, "rule-detail", "no-such-rule-id", "--index", detailIndex],
      { encoding: "utf8" },
    );
    assert.notEqual(proc.status, 0, "an unknown id must exit non-zero (never a silent empty body)");
    assert.ok(proc.stderr.trim().length > 0, "an unknown id must write a loud stderr message");
    assert.ok(
      proc.stderr.includes("no-such-rule-id"),
      `the error must name the unknown id, got: ${proc.stderr}`,
    );
  });
});
