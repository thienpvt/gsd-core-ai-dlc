/**
 * End-to-end smoke test for the walking skeleton (Task 3).
 *
 * Runs the BUILT CLI (`dist/cli/index.js`) as a subprocess — the same entry
 * point `bin/governance.cjs` uses — so it exercises the real compiled artifact,
 * not the TypeScript source. It proves four things at once:
 *   1. `governance build-index` exits 0 and writes a `rule-index.json`.
 *   2. The index carries the require-mfa summary (schemaVersion 1).
 *   3. The require-mfa.md BODY never appears in the serialized index (PACK-04 / D-05).
 *   4. fast-check imports and executes under the CommonJS + nodenext build
 *      (de-risks the property tests 01-02/03/04 will write — RESEARCH Pitfall 2).
 *
 * Paths are built with node:path + os.tmpdir() so the test passes on Windows and
 * Linux (VALIDATION Wave 0 requirement) — no hard-coded separators.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as fc from "fast-check";

// `node --test` runs from the repo root, so process.cwd() is the repo root.
const repoRoot = process.cwd();
const cliEntry = path.join(repoRoot, "dist", "cli", "index.js");
const ruleFile = path.join(repoRoot, "aidlc-rules", "enterprise", "require-mfa.md");

/** Extract the Markdown body (everything after the closing frontmatter `---`). */
function extractBody(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return (match ? match[1] : normalized).trim();
}

test("built CLI build-index emits a body-free index carrying the rule summary", () => {
  const outFile = path.join(
    os.tmpdir(),
    `gsd-rule-index-${process.pid}-${Date.now()}.json`,
  );
  try {
    const result = spawnSync(
      process.execPath,
      [cliEntry, "build-index", "--root", "aidlc-rules", "--out", outFile],
      { cwd: repoRoot, encoding: "utf8" },
    );

    assert.equal(
      result.status,
      0,
      `CLI exited non-zero (status=${result.status}). stderr:\n${result.stderr}`,
    );
    assert.ok(existsSync(outFile), "build-index did not create the output index file");

    const serialized = readFileSync(outFile, "utf8");
    const index = JSON.parse(serialized);

    assert.equal(index.schemaVersion, 1, "schemaVersion must be 1");
    assert.equal(typeof index.generatedAt, "string", "generatedAt must be a string");
    assert.ok(Array.isArray(index.rules), "rules must be an array");

    const mfa = index.rules.find(
      (r: { id?: string }) => r.id === "require-mfa",
    );
    assert.ok(mfa, "require-mfa record missing from the index");
    assert.ok(
      typeof mfa.summary === "string" && mfa.summary.length > 0,
      "require-mfa summary missing or empty",
    );

    // No-body guarantee: no substantial line of the rule body may appear in the
    // serialized index. JSON preserves plain text verbatim, so a leaked body
    // would show up here.
    const body = extractBody(readFileSync(ruleFile, "utf8"));
    const bodyLines = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length >= 12);
    assert.ok(
      bodyLines.length > 0,
      "fixture body has no substantial line to check — weaken guard is not allowed",
    );
    for (const line of bodyLines) {
      assert.ok(
        !serialized.includes(line),
        `rule body leaked into the index: "${line}"`,
      );
    }
  } finally {
    if (existsSync(outFile)) rmSync(outFile, { force: true });
  }
});

test("fast-check imports and executes under the CommonJS/nodenext build", () => {
  // A trivial property — the point is that fast-check resolves + runs at all,
  // proving downstream property tests (01-02/03/04) will work under this config.
  fc.assert(fc.property(fc.integer(), (n) => n === n));
});
