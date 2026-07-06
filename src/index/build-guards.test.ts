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
 * VERBATIM into the index record. Phase 3 (D-07) now resolves + containment-checks
 * the target and asserts it exists on disk at build time: with the target authored
 * (test/fixtures/detailpath-store/enterprise/details/with-detail.md) buildIndex
 * SUCCEEDS and still carries the pointer verbatim, while a missing / absolute /
 * `..`-escaping detailPath fails the build loudly (D-07 / IN-05, naming id + path).
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
const DETAIL_MISSING_STORE = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "detail-missing-store",
);
const DETAIL_ABSOLUTE_STORE = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "detail-absolute-store",
);
const DETAIL_ESCAPE_STORE = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "detail-escape-store",
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

test("buildIndex succeeds and carries a detailPath pointer verbatim when the target exists (criterion 4 / D-06 + D-07)", () => {
  // The target test/fixtures/detailpath-store/enterprise/details/with-detail.md is
  // now authored (03-02 Task 1), so D-07 validation PASSES and buildIndex returns.
  // The pointer is still carried verbatim (D-06 — the pointer, not the body).
  const index = buildIndex(DETAILPATH_STORE);
  const record = index.rules.find((r) => r.id === "with-detail");
  assert.ok(record, "with-detail record missing from the index");
  assert.equal(
    record.detailPath,
    "details/with-detail.md",
    "detailPath must be carried verbatim as authored (D-06)",
  );
});

test("buildIndex fails loudly when a declared detailPath target does not exist (D-07)", () => {
  assert.throws(
    () => buildIndex(DETAIL_MISSING_STORE),
    (err: unknown) => {
      // D-07: the build must fail AND name the offending rule id + the bad path so
      // a typo / moved detail file is caught at author time, not executor-request time.
      assert.ok(err instanceof Error, "expected an Error");
      assert.ok(
        err.message.includes("missing-target"),
        `D-07 build failure must name the rule id, got: ${err.message}`,
      );
      assert.ok(
        err.message.includes("details/does-not-exist.md"),
        `D-07 build failure must name the bad detailPath, got: ${err.message}`,
      );
      return true;
    },
  );
});

test("buildIndex rejects an absolute detailPath at build time (IN-05)", () => {
  assert.throws(
    () => buildIndex(DETAIL_ABSOLUTE_STORE),
    (err: unknown) => {
      assert.ok(err instanceof Error, "expected an Error");
      assert.ok(
        err.message.includes("/etc/passwd"),
        `IN-05 build failure must name the absolute detailPath, got: ${err.message}`,
      );
      return true;
    },
  );
});

test("buildIndex rejects a `..`-escaping detailPath at build time (IN-05)", () => {
  assert.throws(
    () => buildIndex(DETAIL_ESCAPE_STORE),
    (err: unknown) => {
      assert.ok(err instanceof Error, "expected an Error");
      assert.ok(
        err.message.includes("../../escape.md"),
        `IN-05 build failure must name the escaping detailPath, got: ${err.message}`,
      );
      return true;
    },
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
