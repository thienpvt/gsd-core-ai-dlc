/**
 * RED-first tests for the discuss gate hook (RESEARCH §3 + §6, GATE-01).
 *
 * Every <behavior> assertion in 04-01-PLAN Task 3 maps to one test below.
 * Uses mkdtempSync for an isolated projectRoot; builds a tiny fixture rule
 * corpus via the existing `buildIndex` so the hook runs against the real
 * Phase 1 -> Phase 2 chain (mirrors src/inject/inject.property.test.ts
 * temp-corpus mechanics).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { discussHook } from "./discuss-hook.js";
import { buildIndex } from "../index/build.js";
import { writeIndex } from "../index/build.js";
import { selectionStatePath } from "./paths.js";
import { readSelection } from "./state-store.js";
import type { TaskSignal } from "../types.js";

/** A baseline always-in-phase enterprise rule (empty triggers = D-03). */
function baselineRuleContents(id: string): string {
  return [
    "---",
    `id: ${id}`,
    "scope: enterprise",
    "triggers: {}",
    "phases:",
    "  - construction",
    "severity: low",
    `summary: Baseline always-on rule ${id}.`,
    "classification: advisory",
    "---",
    "",
    `## ${id}`,
    "",
    `Baseline ${id} body (never injected — summaries only).`,
    "",
  ].join("\n");
}

/** A security-domain rule with an `auth` keyword trigger. */
function securityAuthRuleContents(id: string): string {
  return [
    "---",
    `id: ${id}`,
    "scope: domain",
    "triggers:",
    "  keywords:",
    "    - auth",
    "phases:",
    "  - construction",
    "severity: high",
    `summary: ${id} — security auth rule (keyword 'auth').`,
    "classification: advisory",
    "---",
    "",
    `## ${id}`,
    "",
    "Body (never injected).",
    "",
  ].join("\n");
}

/** A construction-phase-only rule (no scope/trigger trickery — just phase-gated). */
function constructionOnlyRuleContents(id: string): string {
  return [
    "---",
    `id: ${id}`,
    "scope: enterprise",
    "triggers: {}",
    "phases:",
    "  - construction",
    "severity: medium",
    `summary: ${id} — construction-only (skipped out-of-phase).`,
    "classification: advisory",
    "---",
    "",
    `## ${id}`,
    "",
    "Body (never injected).",
    "",
  ].join("\n");
}

/** Build a corpus directory + rule-index.json under `<root>/rule-index.json`. */
function writeFixtureIndex(root: string): void {
  const corpusDir = path.join(root, "fixture-corpus");
  mkdirSync(path.join(corpusDir, "enterprise"), { recursive: true });
  mkdirSync(path.join(corpusDir, "domain", "security"), { recursive: true });
  writeFileSync(
    path.join(corpusDir, "enterprise", "baseline.md"),
    baselineRuleContents("baseline-always-on"),
    "utf8",
  );
  writeFileSync(
    path.join(corpusDir, "enterprise", "construction-only.md"),
    constructionOnlyRuleContents("construction-only-rule"),
    "utf8",
  );
  writeFileSync(
    path.join(corpusDir, "domain", "security", "auth-rule.md"),
    securityAuthRuleContents("security-auth-rule"),
    "utf8",
  );
  const index = buildIndex(corpusDir);
  writeIndex(index, path.join(root, "rule-index.json"));
}

/** Write a fixture STATE.md with the given numeric current_phase. */
function writeState(root: string, currentPhase: number): void {
  // Mirror the real STATE.md shape — frontmatter with current_phase as a number.
  const content = [
    "---",
    "gsd_state_version: 1.0",
    "milestone: v1.0",
    `current_phase: ${currentPhase}`,
    "current_phase_name: test",
    "status: executing",
    "---",
    "",
    "# Project State",
    "",
  ].join("\n");
  const stateDir = path.join(root, ".planning");
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(path.join(stateDir, "STATE.md"), content, "utf8");
}

/** Build a valid TaskSignal. */
function signal(opts: {
  taskType?: TaskSignal["taskType"];
  keywords?: string[];
  paths?: string[];
}): TaskSignal {
  return {
    taskType: opts.taskType ?? "feature",
    keywords: opts.keywords ?? [],
    paths: opts.paths ?? [],
  };
}

/** mkdtempSync projectRoot + fixture index + STATE; auto-cleanup. */
function withFixtureRoot<T>(
  fn: (root: string) => T,
  statePhase = 2,
): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-discuss-hook-"));
  try {
    writeFixtureIndex(root);
    writeState(root, statePhase);
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ── Baseline: fragment + persisted record ───────────────────────────────────

test("discussHook baseline: produces a <governance> fragment AND persists a record (deep-equal selectionResult)", () => {
  withFixtureRoot((root) => {
    const { fragment, record } = discussHook({
      projectRoot: root,
      taskSignal: signal({ keywords: ["docs"] }), // baseline tier (no critical trigger)
    });
    // Fragment is a non-empty <governance>…</governance> block.
    assert.ok(fragment.startsWith("<governance>"), `fragment must start with <governance>, got: ${fragment.slice(0, 50)}`);
    assert.ok(fragment.includes("</governance>"));
    // Persisted: a record exists on disk whose selectionResult deep-equals.
    const reloaded = readSelection(root);
    assert.ok(reloaded !== null, "expected a persisted record, got null");
    assert.deepEqual(reloaded.selectionResult, record.selectionResult);
    // Baseline tier with empty base subscription -> no widening.
    assert.equal(record.riskTier, "baseline");
    assert.deepEqual(record.selectionConfig.domains, []);
  });
});

// ── Risk-widens-subscription: critical auth task subscribes security + payments ──

test("discussHook risk-widens-subscription: a critical auth signal subscribes security + payments AND selects the security-domain rule a baseline would skip", () => {
  withFixtureRoot((root) => {
    const { record } = discussHook({
      projectRoot: root,
      taskSignal: signal({ keywords: ["auth", "mfa"] }), // critical tier
    });
    // Risk tier is critical.
    assert.equal(record.riskTier, "critical");
    // Domains widened to include security + payments.
    assert.ok(
      record.selectionConfig.domains.includes("security"),
      `expected security in domains, got [${record.selectionConfig.domains.join(", ")}]`,
    );
    assert.ok(
      record.selectionConfig.domains.includes("payments"),
      `expected payments in domains, got [${record.selectionConfig.domains.join(", ")}]`,
    );
    // The security-domain rule is SELECTED (recall lever — would be skipped
    // out-of-scope under a baseline empty subscription).
    const selectedIds = record.selectionResult.selected.map((r) => r.id);
    assert.ok(
      selectedIds.includes("security-auth-rule"),
      `expected security-auth-rule selected under widened subscription, got [${selectedIds.join(", ")}]`,
    );
    // Counter-factual: a baseline signal with the same index would skip it.
    const baselineRecord = discussHook({
      projectRoot: root,
      taskSignal: signal({ keywords: ["unrelated"] }),
    }).record;
    const baselineSkipped = baselineRecord.selectionResult.skipped.map((r) => r.id);
    assert.ok(
      baselineSkipped.includes("security-auth-rule"),
      "baseline subscription must skip the security-domain rule (out-of-scope)",
    );
  });
});

// ── Derives phase from STATE.md ─────────────────────────────────────────────

test("discussHook derives phase from STATE.md: phase=2 -> construction -> construction-only rule is in-phase", () => {
  withFixtureRoot((root) => {
    const { record } = discussHook({
      projectRoot: root,
      taskSignal: signal({}),
    });
    assert.equal(record.selectionConfig.phase, "construction");
    const selectedIds = record.selectionResult.selected.map((r) => r.id);
    assert.ok(
      selectedIds.includes("construction-only-rule"),
      "construction-only rule must be selected when phase=construction",
    );
  });
});

test("discussHook maps later GSD phases to construction until operations support exists", () => {
  withFixtureRoot((root) => {
    const { record } = discussHook({
      projectRoot: root,
      taskSignal: signal({}),
    });
    assert.equal(record.selectionConfig.phase, "construction");
    const selectedIds = record.selectionResult.selected.map((r) => r.id);
    assert.ok(
      selectedIds.includes("construction-only-rule"),
      "construction-only rule must remain selectable in later GSD phases",
    );
  }, 18);
});

// ── Loud on missing index ───────────────────────────────────────────────────

test("discussHook loud-on-missing-index: a non-existent indexPath makes the hook THROW (never an empty fragment, Pitfall 7)", () => {
  withFixtureRoot((root) => {
    assert.throws(
      () =>
        discussHook({
          projectRoot: root,
          indexPath: path.join(root, "does-not-exist.json"),
          taskSignal: signal({}),
        }),
      /index|ENOENT|not exist|read/i,
      "discussHook must throw a clear error when the index is missing",
    );
  });
});

// ── Loud on malformed signal ────────────────────────────────────────────────

test("discussHook loud-on-malformed-signal: an invalid TaskSignal makes validateSignal throw BEFORE select runs (Pitfall 7)", () => {
  withFixtureRoot((root) => {
    // Unknown taskType — validateSignal rejects this.
    const bad = { taskType: "not-a-real-type", keywords: [], paths: [] } as unknown as TaskSignal;
    assert.throws(
      () =>
        discussHook({
          projectRoot: root,
          taskSignal: bad,
        }),
      /invalid task signal|taskType|allowed/i,
      "discussHook must propagate validateSignal errors",
    );
  });
});

test("discussHook loud-on-malformed-signal: a signal missing a required axis is rejected", () => {
  withFixtureRoot((root) => {
    // Missing keywords + paths arrays — validateSignal rejects.
    const bad = { taskType: "feature" } as unknown as TaskSignal;
    assert.throws(
      () =>
        discussHook({
          projectRoot: root,
          taskSignal: bad,
        }),
      /invalid task signal|keywords|paths|required/i,
    );
  });
});

// ── Writes via state-store (no direct fs write in the hook) ─────────────────

test("discussHook writes via state-store: the record appears on disk at selection-state.json (single source of truth for the on-disk format)", () => {
  withFixtureRoot((root) => {
    discussHook({
      projectRoot: root,
      taskSignal: signal({}),
    });
    // The canonical path exists and is a valid record (the hook called
    // writeSelection; it did NOT write to some side path).
    const finalPath = selectionStatePath(root);
    assert.ok(
      // eslint-disable-next-line no-restricted-globals -- existsSync is fine here
      require("node:fs").existsSync(finalPath),
      `expected selection-state.json at ${finalPath}`,
    );
    const reloaded = readSelection(root);
    assert.ok(reloaded !== null);
    assert.ok(reloaded.selectionResult.selected.length >= 1);
  });
});

// ── Hook is thin: no writeFileSync for the governance record ────────────────

test("discussHook structural check: the hook source contains NO writeFileSync/renameSync call (Pitfall 3 — atomic write delegated to state-store)", () => {
  // Structural source check (mirrors inject.ts no-fs structural pattern).
  const src = require("node:fs").readFileSync(
    path.resolve(__dirname, "..", "..", "src", "governance", "discuss-hook.ts"),
    "utf8",
  );
  // Allow the docstring to mention writeFileSync for documentation purposes —
  // strip comments before the check so a doc reference does not trip it.
  // The hook should never itself touch the filesystem for the governance
  // record; that's state-store's single-source-of-truth job.
  const stripped = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(
    !/\bwriteFileSync\s*\(/.test(stripped),
    "discussHook must not call writeFileSync directly — use state-store",
  );
  assert.ok(
    !/\brenameSync\s*\(/.test(stripped),
    "discussHook must not call renameSync directly — use state-store",
  );
});

// ── Phase 18: config-backed baseDomains (D-02) ───────────────────────────────

test("discussHook uses config domains when baseDomains omitted", () => {
  withFixtureRoot((root) => {
    const planning = path.join(root, ".planning");
    mkdirSync(planning, { recursive: true });
    writeFileSync(
      path.join(planning, "config.json"),
      JSON.stringify({ governance: { domains: "java-spring" } }),
      "utf8",
    );
    const { record } = discussHook({
      projectRoot: root,
      taskSignal: signal({ keywords: ["docs"] }),
    });
    assert.ok(
      record.selectionConfig.domains.includes("java-spring"),
      `expected java-spring from config, got [${record.selectionConfig.domains.join(", ")}]`,
    );
  });
});

test("discussHook explicit baseDomains: [] overrides config domains", () => {
  withFixtureRoot((root) => {
    const planning = path.join(root, ".planning");
    mkdirSync(planning, { recursive: true });
    writeFileSync(
      path.join(planning, "config.json"),
      JSON.stringify({ governance: { domains: "java-spring" } }),
      "utf8",
    );
    const { record } = discussHook({
      projectRoot: root,
      taskSignal: signal({ keywords: ["docs"] }),
      baseDomains: [],
    });
    assert.equal(
      record.selectionConfig.domains.includes("java-spring"),
      false,
      "explicit empty baseDomains must not pull java-spring from config",
    );
  });
});
