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
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import os from "node:os";
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

test("resolveDetailPath rejects a detailPath whose REAL target escapes packRoot via a symlink (CR-01 / IN-05)", (t) => {
  // The one case pure path math cannot see: a real on-disk pack where
  // <pack>/enterprise/with-detail.md declares `detailPath: details/leak.md`, and
  // details/leak.md is a SYMLINK pointing at a file OUTSIDE the pack. The lexical
  // guard sees a textually in-pack path and passes; only realpath canonicalization
  // (CR-01) follows the link and rejects the on-disk escape — the same follow the
  // callers' existsSync/readFileSync would otherwise do to leak an arbitrary file.
  const base = mkdtempSync(path.join(os.tmpdir(), "gsd-symlink-guard-"));
  try {
    const packRoot = path.join(base, "pack");
    const detailsDir = path.join(packRoot, "enterprise", "details");
    mkdirSync(detailsDir, { recursive: true });
    const ruleFile = path.join(packRoot, "enterprise", "with-detail.md");
    writeFileSync(ruleFile, "stub rule file (frontmatter irrelevant here)\n", "utf8");

    // The link target sits OUTSIDE packRoot — a sibling under `base`, so the real
    // path escapes while the lexical `enterprise/details/leak.md` does not.
    const outsideFile = path.join(base, "outside-secret.md");
    writeFileSync(outsideFile, "SECRET_CANARY\n", "utf8");

    const link = path.join(detailsDir, "leak.md");
    try {
      symlinkSync(outsideFile, link);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES") {
        // Windows without the symlink-creation privilege — skip gracefully so the
        // suite stays green cross-platform. The guard is still exercised on POSIX
        // and on privileged Windows, where the symlink is created and rejected.
        t.skip("symlink creation not permitted on this platform (EPERM/EACCES)");
        return;
      }
      throw err;
    }

    assert.throws(
      () => resolveDetailPath(ruleFile, "details/leak.md", packRoot),
      (err: unknown) => {
        assert.ok(err instanceof Error, "expected an Error");
        assert.ok(
          err.message.includes("symlink"),
          `the guard must flag the symlink escape (CR-01), got: ${err.message}`,
        );
        return true;
      },
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("resolveDetailPath still resolves a genuine (non-symlink) in-pack detailPath after canonicalization (CR-01 regression)", () => {
  // Belt-and-suspenders: the symlink hardening must NOT break the valid case. A
  // real relative detail file that is NOT a symlink must still resolve in-pack.
  const base = mkdtempSync(path.join(os.tmpdir(), "gsd-symlink-valid-"));
  try {
    const packRoot = path.join(base, "pack");
    const detailsDir = path.join(packRoot, "enterprise", "details");
    mkdirSync(detailsDir, { recursive: true });
    const ruleFile = path.join(packRoot, "enterprise", "with-detail.md");
    writeFileSync(ruleFile, "stub rule file\n", "utf8");
    const detailFile = path.join(detailsDir, "with-detail.md");
    writeFileSync(detailFile, "real detail body\n", "utf8");

    const result = resolveDetailPath(ruleFile, "details/with-detail.md", packRoot);
    const rel = path.relative(packRoot, result);
    assert.ok(
      !rel.startsWith("..") && !path.isAbsolute(rel),
      `a real in-pack detail file must still resolve inside the pack, got rel: ${rel}`,
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
