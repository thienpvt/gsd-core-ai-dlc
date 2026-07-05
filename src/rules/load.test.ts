/**
 * Loader fail-loud contract for the rule store (CR-01).
 *
 * readDirSafe is not exported, so its error handling is exercised through
 * loadRules. Two cases pin the intended contract: a genuinely-absent root is
 * the ONLY silent-empty case; any other readdir failure (here ENOTDIR, forced
 * by pointing the loader at a file) must propagate loudly. Silently swallowing
 * a permission/IO error would drop rules and can flip a precedence winner — a
 * governance bypass, which is precisely what this phase exists to prevent.
 *
 * Runs against the COMPILED module (dist-test/rules/load.js). Paths are built
 * with node:os + node:path so the cases pass identically on Windows and Linux.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadRules } from "./load.js";

test("loadRules treats a genuinely-absent root as empty, not an error (CR-01 preserves the ENOENT case)", () => {
  const missing = path.join(tmpdir(), `aidlc-nonexistent-${Date.now()}-${process.pid}`);
  assert.deepEqual(loadRules(missing), []);
});

test("loadRules propagates a non-ENOENT readdir error instead of silently yielding no rules (CR-01)", () => {
  // Point the loader at a real FILE rather than a directory: readdirSync then
  // fails with ENOTDIR — a non-ENOENT error that must surface loudly rather
  // than be swallowed into an empty listing.
  const dir = mkdtempSync(path.join(tmpdir(), "aidlc-load-cr01-"));
  const file = path.join(dir, "not-a-directory.md");
  writeFileSync(file, "# not a directory\n");
  try {
    assert.throws(
      () => loadRules(file),
      (err: unknown) => {
        const m = err instanceof Error ? err.message : String(err);
        return /cannot read rule directory/.test(m) && m.includes(file);
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
