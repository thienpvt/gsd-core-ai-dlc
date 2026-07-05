/**
 * Build-level integration guards proving ROADMAP Phase 1 success criteria 3 & 4
 * plus the Pitfall 5 POSIX-pointer invariant, over fixture-backed stores.
 *
 * Criterion 3 (D-15 / PACK-03): a binding rule that names no enforcement contract
 * must fail at BUILD time (not merely at the validator layer 01-02 exercises).
 * loadRules validates each file's frontmatter and re-throws a path-prefixed error,
 * so buildIndex throws and the message names the offending file. The assertion
 * deliberately does NOT couple to the Ajv field name (e.g. /enforcement/) —
 * loadRules is not contracted to surface the missing-field name, and formatErrors
 * lives in 01-02; a throw that names the file is the wave-order-stable proof.
 *
 * Criterion 4 (D-06): a rule that declares a detailPath has that pointer carried
 * VERBATIM into the index record. Phase 1 never resolves, opens, stats, or
 * containment-checks the target (D-07/D-08 deferred to Phase 3) — the target file
 * is intentionally absent, and buildIndex still returns without throwing.
 *
 * Pitfall 5: emitted sourceFile/detailPath pointers are POSIX repo-relative — no
 * backslash, not absolute, not drive-rooted; sourceFile is repo-relative.
 *
 * Fixtures live under test/fixtures/ (never src/, so tsc never compiles them) and
 * are read via fs. node --test runs from the repo root, so process.cwd() is the
 * repo root; roots are built with node:path (no hard-coded separators).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildIndex } from "./build.js";

const BINDING_STORE = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "binding-no-enforcement-store",
);
const DETAILPATH_STORE = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "detailpath-store",
);

/** A Windows drive-letter prefix like `C:` — a pointer must never start with one. */
const DRIVE_LETTER = /^[A-Za-z]:/;
const BACKSLASH = String.fromCharCode(92);

test("buildIndex fails loudly over a binding rule that names no enforcement contract (criterion 3 / D-15)", () => {
  assert.throws(
    () => buildIndex(BINDING_STORE),
    (err: unknown) => {
      // The build must fail AND name the offending file. Do NOT couple to the
      // Ajv field name — a file-naming throw is the binding-without-contract proof.
      assert.ok(err instanceof Error, "expected an Error");
      assert.ok(
        err.message.includes("needs-contract.md"),
        `build failure must name the offending file, got: ${err.message}`,
      );
      return true;
    },
  );
});

test("buildIndex carries a detailPath pointer verbatim without resolving it (criterion 4 / D-06)", () => {
  // buildIndex does NOT throw even though test/fixtures/detailpath-store/enterprise/
  // details/with-detail.md was never authored — Phase 1 carries, never resolves.
  const index = buildIndex(DETAILPATH_STORE);
  const record = index.rules.find((r) => r.id === "with-detail");
  assert.ok(record, "with-detail record missing from the index");
  assert.equal(
    record.detailPath,
    "details/with-detail.md",
    "detailPath must be carried verbatim as authored (D-06)",
  );
});

test("emitted sourceFile and detailPath pointers are POSIX repo-relative (Pitfall 5)", () => {
  const index = buildIndex(DETAILPATH_STORE);
  const record = index.rules.find((r) => r.id === "with-detail");
  assert.ok(record, "with-detail record missing from the index");

  for (const [label, value] of [
    ["sourceFile", record.sourceFile],
    ["detailPath", record.detailPath as string],
  ] as const) {
    assert.ok(
      !value.includes(BACKSLASH),
      `${label} must contain no backslash (POSIX), got: ${value}`,
    );
    assert.ok(
      !path.isAbsolute(value),
      `${label} must not be absolute, got: ${value}`,
    );
    assert.ok(
      !value.startsWith("/"),
      `${label} must not be root-anchored, got: ${value}`,
    );
    assert.ok(
      !DRIVE_LETTER.test(value),
      `${label} must not be drive-rooted, got: ${value}`,
    );
  }

  assert.ok(
    record.sourceFile.startsWith("test/fixtures/"),
    `sourceFile must be repo-relative under test/fixtures/, got: ${record.sourceFile}`,
  );
});
