/**
 * Unit suite for the pure selection core `select()` (SEL-01 / SEL-04).
 *
 * RED (Task 1): `select()` and `validateSignal()` are stubs that throw, so every
 * assertion driving them fails — this file encodes the GREEN target Task 2 turns
 * green. It proves determinism (byte-identical repeat), each D-04 trigger axis
 * with the right matchedAxis/matchedValue, D-02 OR-combine, D-03 always-in-phase,
 * full observability, total accounting, and sorted output.
 *
 * The corpus is the controlled 02-01 `eval-rules/` store compiled through Phase 1
 * `buildIndex` (never hand-written) so selection runs the real load->index->select
 * path. Fixtures live under test/fixtures/ (tsc never compiles them); `node --test`
 * runs from the repo root, so process.cwd() is the repo root — mirrors
 * eval-fixtures.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import { validateSignal } from "./validate-signal.js";
import type { RuleIndex, TaskSignal, SelectionConfig } from "../types.js";

const EVAL_ROOT = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "eval",
  "eval-rules",
);

/** Compile the controlled eval corpus via Phase 1 buildIndex (10 winners + 1 superseded loser). */
function evalIndex(): RuleIndex {
  return buildIndex(EVAL_ROOT);
}

/** Sum over every winner's superseded[] length — the D-11 losers select() must also account for. */
function supersededCount(index: RuleIndex): number {
  return index.rules.reduce((n, r) => n + (r.superseded?.length ?? 0), 0);
}

test("determinism: two calls on identical (index, signal, config) are byte-identical JSON (SEL-01)", () => {
  const index = evalIndex();
  const signal: TaskSignal = { taskType: "feature", keywords: ["api"], paths: [] };
  const config: SelectionConfig = { phase: "construction", domains: [] };
  const first = select(index, signal, config);
  const second = select(index, signal, config);
  assert.equal(
    JSON.stringify(first),
    JSON.stringify(second),
    "identical inputs must yield byte-identical output — a leaked clock/random would break this",
  );
});

test("keywords axis (D-04): a keyword signal selects input-validation with matchedAxis 'keywords'", () => {
  const index = evalIndex();
  const signal: TaskSignal = { taskType: "refactor", keywords: ["input"], paths: [] };
  const result = select(index, signal, { phase: "construction", domains: [] });
  const hit = result.selected.find((s) => s.id === "input-validation");
  assert.ok(hit, "input-validation should be selected on the keywords axis");
  assert.equal(hit.matchedAxis, "keywords");
  assert.equal(hit.matchedValue, "input");
});

test("taskType axis (D-04): a test-type signal selects test-coverage with matchedAxis 'taskType'", () => {
  const index = evalIndex();
  const signal: TaskSignal = { taskType: "test", keywords: [], paths: [] };
  const result = select(index, signal, { phase: "construction", domains: [] });
  const hit = result.selected.find((s) => s.id === "test-coverage");
  assert.ok(hit, "test-coverage should be selected on the taskType axis");
  assert.equal(hit.matchedAxis, "taskType");
  assert.equal(hit.matchedValue, "test");
});

test("paths axis (D-04): a .tf path signal selects iac-review via picomatch with matchedAxis 'paths'", () => {
  const index = evalIndex();
  const signal: TaskSignal = {
    taskType: "infra",
    keywords: [],
    paths: ["infra/main.tf"],
  };
  const result = select(index, signal, { phase: "construction", domains: [] });
  const hit = result.selected.find((s) => s.id === "iac-review");
  assert.ok(hit, "iac-review should be selected on the paths axis");
  assert.equal(hit.matchedAxis, "paths");
  assert.equal(hit.matchedValue, "infra/main.tf");
});

test("paths axis dotfiles (CR-01): a rule with paths ['**/*.yml'] fires on a dot-prefixed .github path", () => {
  // Regression for CR-01: picomatch's DEFAULT dot:false makes `*`/`**` skip a
  // segment starting with `.`, so `**/*.yml` would silently NOT match
  // `.github/workflows/deploy.yml` — an under-injection of the exact CI/config
  // paths a governance overlay exists to catch. select() must compile with
  // dot:true so the rule fires (over-injection is the acceptable direction).
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "gsd-select-cr01-"));
  try {
    const enterpriseDir = path.join(tmpDir, "enterprise");
    mkdirSync(enterpriseDir, { recursive: true });
    writeFileSync(
      path.join(enterpriseDir, "ci-config.md"),
      [
        "---",
        "id: ci-config",
        "scope: enterprise",
        "triggers:",
        "  paths:",
        '    - "**/*.yml"',
        "phases:",
        "  - construction",
        "severity: critical",
        "summary: CI/CD workflow changes require pipeline governance review.",
        "classification: advisory",
        "---",
        "",
        "## ci-config",
        "",
      ].join("\n"),
      "utf8",
    );
    const index = buildIndex(tmpDir);
    const signal: TaskSignal = {
      taskType: "infra",
      keywords: [],
      paths: [".github/workflows/deploy.yml"],
    };
    const result = select(index, signal, { phase: "construction", domains: [] });
    const hit = result.selected.find((s) => s.id === "ci-config");
    assert.ok(
      hit,
      "ci-config (paths ['**/*.yml']) must fire on '.github/workflows/deploy.yml' — dot-prefixed paths must not be silently dropped (CR-01)",
    );
    assert.equal(hit.matchedAxis, "paths");
    assert.equal(hit.matchedValue, ".github/workflows/deploy.yml");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("exclude-only triggers (WR-01): an exclude-only rule is EXCLUDED for a matching signal, not silently always-in-phase", () => {
  // WR-01 regression: a rule authored `triggers: { exclude: { taskType: [docs] } }`
  // — "fire always EXCEPT for docs tasks" — has no POSITIVE axis. isEmptyTriggers
  // sees no positive axis and would select it always-in-phase BEFORE matchExclude
  // ran, making the authored carve-out a silent no-op. select() must consult the
  // exclude in the empty-triggers branch: a docs signal must be SKIPPED, and a
  // non-docs signal must still fire always-in-phase (the carve-out is respected,
  // the always-fire intent is preserved).
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "gsd-select-wr01-"));
  try {
    const enterpriseDir = path.join(tmpDir, "enterprise");
    mkdirSync(enterpriseDir, { recursive: true });
    writeFileSync(
      path.join(enterpriseDir, "except-docs.md"),
      [
        "---",
        "id: except-docs",
        "scope: enterprise",
        "triggers:",
        "  exclude:",
        "    taskType:",
        "      - docs",
        "phases:",
        "  - construction",
        "severity: critical",
        "summary: Fire on every task except documentation-only changes.",
        "classification: advisory",
        "---",
        "",
        "## except-docs",
        "",
      ].join("\n"),
      "utf8",
    );
    const index = buildIndex(tmpDir);
    const config: SelectionConfig = { phase: "construction", domains: [] };

    // Matching signal (docs) -> the exclude fires -> SKIPPED, never selected.
    const docsResult = select(index, { taskType: "docs", keywords: [], paths: [] }, config);
    assert.ok(
      !docsResult.selected.some((s) => s.id === "except-docs"),
      "except-docs must NOT be selected for a docs signal — the authored exclude carve-out must win (WR-01)",
    );
    const docsSkip = docsResult.skipped.find((s) => s.id === "except-docs");
    assert.ok(docsSkip, "except-docs must appear as a skip for the excluded docs signal");
    assert.equal(docsSkip.reason, "out-of-scope-by-trigger");
    assert.equal(
      docsSkip.detail,
      "matched-then-excluded",
      "the exclude-only skip must carry the matched-then-excluded detail for the audit",
    );

    // Non-matching signal (feature) -> the always-fire intent is preserved.
    const featResult = select(index, { taskType: "feature", keywords: [], paths: [] }, config);
    const featHit = featResult.selected.find((s) => s.id === "except-docs");
    assert.ok(
      featHit,
      "except-docs must still fire always-in-phase for a non-excluded signal (the always-fire intent survives)",
    );
    assert.equal(featHit.matchedAxis, "always-in-phase");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("OR-combine (D-02): a signal matching only ONE axis of api-contract still selects it", () => {
  const index = evalIndex();
  // Matches api-contract's keywords axis ONLY: taskType refactor != feature, no api path.
  const signal: TaskSignal = { taskType: "refactor", keywords: ["api"], paths: [] };
  const result = select(index, signal, { phase: "construction", domains: [] });
  const hit = result.selected.find((s) => s.id === "api-contract");
  assert.ok(hit, "api-contract must fire on any single matching axis (OR-combine)");
  assert.equal(hit.matchedAxis, "keywords");
});

test("always-in-phase (D-03): empty-triggers critical secrets-management fires for an unrelated in-phase signal", () => {
  const index = evalIndex();
  const signal: TaskSignal = {
    taskType: "docs",
    keywords: ["readme"],
    paths: ["docs/index.md"],
  };
  const result = select(index, signal, { phase: "construction", domains: [] });
  const hit = result.selected.find((s) => s.id === "secrets-management");
  assert.ok(
    hit,
    "secrets-management (triggers {}) must always fire in-phase — never read empty as 'never fires' (Pitfall 2)",
  );
  assert.equal(hit.matchedAxis, "always-in-phase");
  assert.ok(
    hit.matchedValue.length > 0,
    "an always-in-phase selection still records a non-empty matchedValue",
  );
});

test("observability (SEL-04): every selected rule names a valid axis+value and every skip a valid reason", () => {
  const index = evalIndex();
  const signal: TaskSignal = {
    taskType: "security",
    keywords: ["auth", "api"],
    paths: ["src/api/v1.ts"],
  };
  const result = select(index, signal, {
    phase: "construction",
    domains: ["security"],
  });
  const axes = new Set(["taskType", "keywords", "paths", "always-in-phase"]);
  const reasons = new Set([
    "out-of-phase",
    "out-of-scope",
    "out-of-scope-by-trigger",
    "superseded",
  ]);
  for (const s of result.selected) {
    assert.ok(axes.has(s.matchedAxis), `selected ${s.id} has a valid matchedAxis`);
    assert.ok(
      typeof s.matchedValue === "string" && s.matchedValue.length > 0,
      `selected ${s.id} has a non-empty matchedValue`,
    );
  }
  for (const s of result.skipped) {
    assert.ok(reasons.has(s.reason), `skipped ${s.id} has a valid reason`);
  }
});

test("total accounting (SEL-04): selected + skipped equals winners + Σ superseded (nothing vanishes)", () => {
  const index = evalIndex();
  const signal: TaskSignal = { taskType: "feature", keywords: ["api"], paths: [] };
  const result = select(index, signal, { phase: "construction", domains: [] });
  assert.equal(
    result.selected.length + result.skipped.length,
    index.rules.length + supersededCount(index),
    "every candidate (winner or superseded loser) must be accounted for exactly once",
  );
});

test("sorted output: selected ids and skipped ids are each in ascending order (no upstream-order dependence)", () => {
  const index = evalIndex();
  const signal: TaskSignal = {
    taskType: "feature",
    keywords: ["api", "retention"],
    paths: [],
  };
  const result = select(index, signal, {
    phase: "construction",
    domains: ["security", "payments"],
  });
  const selectedIds = result.selected.map((s) => s.id);
  const skippedIds = result.skipped.map((s) => s.id);
  assert.deepEqual(selectedIds, [...selectedIds].sort());
  assert.deepEqual(skippedIds, [...skippedIds].sort());
});

test("validateSignal accepts a well-formed TaskSignal without throwing", () => {
  const good: unknown = {
    taskType: "feature",
    keywords: ["api"],
    paths: ["src/api/v1.ts"],
  };
  assert.doesNotThrow(() => validateSignal(good));
});

test("validateSignal rejects a malformed signal loudly (unknown taskType) — no silent under-injection", () => {
  const bad: unknown = { taskType: "not-a-type", keywords: [], paths: [] };
  assert.throws(() => validateSignal(bad));
});

test("validateSignal rejects a signal missing a required axis", () => {
  const bad: unknown = { taskType: "feature", keywords: [] };
  assert.throws(() => validateSignal(bad));
});
