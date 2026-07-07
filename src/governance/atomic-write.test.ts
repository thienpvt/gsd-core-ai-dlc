/**
 * TDD tests for the shared atomic-write helper (06-01, TD-03).
 *
 * Proves: concurrent writers do not clobber (unique temp suffix), temp is
 * cleaned up by rename, the fixed `.tmp` suffix is NOT used, single-write
 * round-trip semantics hold, and parent dir is created if missing.
 */
import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { atomicWriteFile } from "./atomic-write.js";

/** mkdtempSync projectRoot + auto-cleanup. */
function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-atomic-write-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}

/** Absolute path to the compiled helper, for child processes. */
const HELPER_PATH = require.resolve("./atomic-write.js");

// ── Test 1: concurrent writers do not clobber ───────────────────────────────

test("atomicWriteFile: concurrent writers to the same final path do not clobber — final file is exactly one payload, not merged/empty/truncated", async () => {
  await withTempRoot(async (root) => {
    const finalPath = path.join(root, "concurrent.txt");
    const N = 6;
    const payloads = Array.from(
      { length: N },
      (_, i) => `payload-${i}-${"x".repeat(1000)}`,
    );
    // Spawn N children that all write to the SAME final path concurrently.
    const children = payloads.map((p) => {
      const child = spawn(
        process.execPath,
        [
          "-e",
          `const{atomicWriteFile}=require(${JSON.stringify(HELPER_PATH)});atomicWriteFile(${JSON.stringify(finalPath)},${JSON.stringify(p)});`,
        ],
        { stdio: "ignore" },
      );
      return new Promise<number>((resolve) =>
        child.on("exit", (code) => resolve(code ?? -1)),
      );
    });
    const codes = await Promise.all(children);
    // The atomic-write invariant is about CONTENT INTEGRITY, not all-success.
    // On Windows, `renameSync` to a shared destination can race (EPERM if the
    // target is mid-rename by a sibling). A writer may exit non-zero when its
    // rename loses the race — but its temp is cleaned up and the final file is
    // left as exactly one payload (the winner's). What must NOT happen: a
    // merged/truncated/empty file (the old fixed-.tmp bug). So assert:
    //   - at least one writer succeeded (exit 0)
    //   - the final file exists and is exactly one of the payloads (not corrupt)
    //   - no empty/truncated/merged content
    assert.ok(
      codes.some((c) => c === 0),
      `at least one concurrent writer must succeed (got ${codes.join(",")})`,
    );
    const content = readFileSync(finalPath, "utf8");
    assert.ok(
      content.length > 0,
      "final file must not be empty (clobbered/truncated)",
    );
    assert.ok(
      payloads.includes(content),
      "final file must be exactly one of the payloads — not merged, empty, or truncated",
    );
  });
});

// ── Test 2: no `.tmp*` leftover after a successful write ───────────────────

test("atomicWriteFile: after a successful write, no file matching `${finalPath}.tmp*` remains (temp cleaned up by rename)", () => {
  withTempRoot((root) => {
    const finalPath = path.join(root, "nested", "out.txt");
    atomicWriteFile(finalPath, "hello");
    assert.ok(existsSync(finalPath), "final file must exist");
    const siblings = readdirSync(path.dirname(finalPath));
    const leftovers = siblings.filter(
      (name) => name.startsWith("out.txt") && name !== "out.txt",
    );
    assert.deepEqual(
      leftovers,
      [],
      `no temp leftover files expected, got ${JSON.stringify(leftovers)}`,
    );
  });
});

// ── Test 3: unique temp path per call (no fixed `.tmp` suffix) ──────────────

test("atomicWriteFile: uses a unique temp suffix — a pre-existing sentinel at `${finalPath}.tmp` is NOT consumed by the write (proves the helper does not use the fixed `.tmp` suffix)", () => {
  withTempRoot((root) => {
    const finalPath = path.join(root, "target.txt");
    const sentinelPath = `${finalPath}.tmp`;
    writeFileSync(sentinelPath, "sentinel-content", "utf8");

    atomicWriteFile(finalPath, "real-content");

    // If the helper used the fixed `.tmp` suffix, writeFileSync would have
    // overwritten the sentinel, then renameSync would have moved it to the
    // final path — leaving the sentinel gone. A unique-suffix helper leaves
    // the sentinel untouched.
    assert.ok(
      existsSync(sentinelPath),
      "sentinel at `.tmp` must survive — helper must not use the fixed `.tmp` suffix",
    );
    assert.equal(
      readFileSync(sentinelPath, "utf8"),
      "sentinel-content",
      "sentinel content must be untouched",
    );
    assert.equal(
      readFileSync(finalPath, "utf8"),
      "real-content",
      "final file must contain the real payload",
    );
  });
});

// ── Test 4: single-write round-trip semantics ──────────────────────────────

test("atomicWriteFile: write then read returns the exact data written (single-write semantics preserved)", () => {
  withTempRoot((root) => {
    const finalPath = path.join(root, "round.txt");
    const data = "line1\nline2\nline3";
    atomicWriteFile(finalPath, data);
    assert.equal(readFileSync(finalPath, "utf8"), data);
  });
});

// ── Test 5: parent directory created if missing ─────────────────────────────

test("atomicWriteFile: parent directory is created if missing (mkdirSync recursive)", () => {
  withTempRoot((root) => {
    const finalPath = path.join(root, "a", "b", "c", "deep.txt");
    atomicWriteFile(finalPath, "deep");
    assert.ok(existsSync(finalPath), "deeply nested final file must exist");
    assert.equal(readFileSync(finalPath, "utf8"), "deep");
  });
});
