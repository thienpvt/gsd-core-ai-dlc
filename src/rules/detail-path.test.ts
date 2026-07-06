/**
 * Unit suite for the single-sourced {@link resolveDetailPath} resolver + guard.
 *
 * Proves the four load-bearing behaviors of the ONE function both buildIndex
 * (D-07 build-time validation) and rule-detail (IN-05 fetch-time backstop) call,
 * so the guard cannot drift (Pitfall 8):
 *   - D-08: a relative detailPath resolves against the declaring rule file's
 *     DIRECTORY (not the pack root, not the cwd).
 *   - IN-05: an absolute detailPath is rejected BEFORE any path is returned.
 *   - IN-05: a `..`-escape that leaves the pack root is rejected.
 *   - Containment: a valid nested detailPath resolves to a path inside packRoot.
 *
 * Inputs are synthetic strings built with node:path so the suite is OS-neutral
 * (no disk I/O — the resolver is pure path math; existence checks live in callers).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolveDetailPath } from "./detail-path.js";

/** A synthetic pack root + a rule file one tier down, built OS-neutrally. */
const PACK_ROOT = path.resolve("synthetic-pack-root");
const RULE_FILE = path.join(PACK_ROOT, "enterprise", "with-detail.md");

test("resolveDetailPath resolves a relative detailPath against the declaring rule file's directory (D-08)", () => {
  const result = resolveDetailPath(RULE_FILE, "details/with-detail.md", PACK_ROOT);
  const expected = path.join(PACK_ROOT, "enterprise", "details", "with-detail.md");
  assert.equal(
    result,
    expected,
    "detailPath must resolve relative to the rule file's directory (D-08), not the pack root",
  );
});

test("resolveDetailPath returns a target contained within packRoot for a valid nested detailPath (IN-05)", () => {
  const result = resolveDetailPath(RULE_FILE, "details/with-detail.md", PACK_ROOT);
  const rel = path.relative(PACK_ROOT, result);
  assert.ok(
    !rel.startsWith(".."),
    `a valid detailPath must resolve inside the pack, got rel: ${rel}`,
  );
  assert.ok(
    !path.isAbsolute(rel),
    `a valid detailPath must resolve inside the pack, got absolute rel: ${rel}`,
  );
});

test("resolveDetailPath throws for an absolute detailPath (IN-05)", () => {
  assert.throws(
    () => resolveDetailPath(RULE_FILE, "/etc/passwd", PACK_ROOT),
    (err: unknown) => {
      assert.ok(err instanceof Error, "expected an Error");
      assert.ok(
        err.message.includes("/etc/passwd"),
        `the traversal guard must name the offending detailPath, got: ${err.message}`,
      );
      return true;
    },
  );
});

test("resolveDetailPath throws for a `..`-escape that leaves packRoot (IN-05)", () => {
  assert.throws(
    () => resolveDetailPath(RULE_FILE, "../../escape.md", PACK_ROOT),
    (err: unknown) => {
      assert.ok(err instanceof Error, "expected an Error");
      assert.ok(
        err.message.includes("../../escape.md"),
        `the traversal guard must name the escaping detailPath, got: ${err.message}`,
      );
      return true;
    },
  );
});
