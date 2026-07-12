/**
 * SEL-06 standing eval harness producer tests (D-01..D-16).
 *
 * eval-cli.ts: runEval(args) → runCases → aggregate → build EvalReport;
 * runDirect(argv) persists via writeEvalEvidence + writeEvalReportMarkdown and
 * sets process.exitCode (0 pass, 2 critical-recall miss, 3 parse/load error).
 *
 * Injectable seams: `indexLoader` + `casesLoader` let unit tests pass fixture
 * data without touching disk. End-to-end + exit-code tests spawnSync a
 * purpose-built temporary package (copied dist-test + seeded corpus) — the
 * packaged corpus is immutable (no GOVERNANCE_EVAL_FIXTURES_ROOT override).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  runEval,
  renderMarkdown,
  evalCorpusRoot,
  type RunEvalArgs,
} from "./eval-cli.js";
import { readEvalEvidence, writeEvalEvidence } from "../governance/eval-evidence.js";
import { evalEvidencePath, evalReportPath } from "../governance/paths.js";
import type { RuleIndex } from "../types.js";
import type { EvalCase } from "./eval-harness.js";

// ---------------------------------------------------------------------------
// Fixture builders — injectable via RunEvalArgs.{indexLoader,casesLoader}.
// ---------------------------------------------------------------------------

/** Minimal index with 3 rules covering the miss / hit / extra scenarios. */
function fixtureIndex(): RuleIndex {
  return {
    schemaVersion: 1,
    generatedAt: "2026-07-08T00:00:00.000Z",
    rules: [
      {
        id: "always-critical",
        scope: "enterprise",
        triggers: {},
        phases: ["construction"],
        severity: "critical",
        summary: "Always-in-phase critical rule.",
        classification: "advisory",
        sourceFile: "enterprise/always-critical.md",
      },
      {
        id: "high-matcher",
        scope: "enterprise",
        triggers: { keywords: ["api"] },
        phases: ["construction"],
        severity: "high",
        summary: "High-severity keyword matcher.",
        classification: "advisory",
        sourceFile: "enterprise/high-matcher.md",
      },
      {
        id: "noise-rule",
        scope: "enterprise",
        triggers: { keywords: ["noise"] },
        phases: ["construction"],
        severity: "low",
        summary: "Low-severity noise rule.",
        classification: "advisory",
        sourceFile: "enterprise/noise-rule.md",
      },
    ],
  };
}

/** 3 cases: one clean hit, one precision offender, one clean miss-free empty. */
function fixtureCases(): EvalCase[] {
  return [
    {
      name: "clean-hit",
      signal: { taskType: "feature", keywords: [], paths: [] },
      phase: "construction",
      scopeConfig: { domains: [] },
      expectedRuleIds: ["always-critical"],
    },
    {
      name: "precision-offender",
      signal: { taskType: "feature", keywords: ["noise"], paths: [] },
      phase: "construction",
      scopeConfig: { domains: [] },
      expectedRuleIds: ["always-critical"],
      // noise-rule matches keyword "noise" but is not expected → over-injection
    },
    {
      name: "empty-expected",
      signal: { taskType: "docs", keywords: [], paths: [] },
      phase: "construction",
      scopeConfig: { domains: [] },
      expectedRuleIds: [],
    },
  ];
}

/** Index where a critical rule exists but won't match the case's signal. */
function missIndex(): RuleIndex {
  return {
    schemaVersion: 1,
    generatedAt: "2026-07-08T00:00:00.000Z",
    rules: [
      {
        id: "narrow-critical",
        scope: "enterprise",
        triggers: { taskType: ["infra"] },
        phases: ["construction"],
        severity: "critical",
        summary: "Critical rule that only matches infra tasks.",
        classification: "advisory",
        sourceFile: "enterprise/narrow-critical.md",
      },
    ],
  };
}

function missCases(): EvalCase[] {
  return [
    {
      name: "critical-miss-case",
      signal: { taskType: "docs", keywords: [], paths: [] },
      phase: "construction",
      scopeConfig: { domains: [] },
      expectedRuleIds: ["narrow-critical"],
    },
  ];
}

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-eval-cli-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Seed helpers + purpose-built temp package for spawnSync e2e (no env override).
// ---------------------------------------------------------------------------

const ALWAYS_CRITICAL_RULE = `---
id: always-critical
scope: enterprise
triggers: {}
phases:
  - construction
severity: critical
summary: Always-in-phase critical rule.
classification: advisory
---

## Rule: Always Critical
Body is irrelevant to the index.
`;

const NARROW_CRITICAL_RULE = `---
id: narrow-critical
scope: enterprise
triggers:
  taskType:
    - infra
phases:
  - construction
severity: critical
summary: Critical rule that only matches infra tasks.
classification: advisory
---

## Rule: Narrow Critical
Body is irrelevant to the index.
`;

function seedPassingCorpus(fixturesRoot: string): void {
  const rulesDir = path.join(fixturesRoot, "eval-rules", "enterprise");
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(path.join(rulesDir, "always-critical.md"), ALWAYS_CRITICAL_RULE, "utf8");
  const casesDir = path.join(fixturesRoot, "cases");
  mkdirSync(casesDir, { recursive: true });
  writeFileSync(
    path.join(casesDir, "eval-cases.json"),
    JSON.stringify(
      [
        {
          name: "clean-hit",
          signal: { taskType: "feature", keywords: [], paths: [] },
          phase: "construction",
          scopeConfig: { domains: [] },
          expectedRuleIds: ["always-critical"],
        },
      ],
      null,
      2,
    ),
    "utf8",
  );
}

function seedCriticalMissCorpus(fixturesRoot: string): void {
  const rulesDir = path.join(fixturesRoot, "eval-rules", "enterprise");
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(path.join(rulesDir, "narrow-critical.md"), NARROW_CRITICAL_RULE, "utf8");
  const casesDir = path.join(fixturesRoot, "cases");
  mkdirSync(casesDir, { recursive: true });
  writeFileSync(
    path.join(casesDir, "eval-cases.json"),
    JSON.stringify(
      [
        {
          name: "critical-miss-case",
          signal: { taskType: "docs", keywords: [], paths: [] },
          phase: "construction",
          scopeConfig: { domains: [] },
          expectedRuleIds: ["narrow-critical"],
        },
      ],
      null,
      2,
    ),
    "utf8",
  );
}

const DIST_TEST = path.resolve(process.cwd(), "dist-test");
/** Resolved host node_modules (worktrees may lack a local install). */
const NODE_MODULES = path.dirname(
  path.dirname(require.resolve("gray-matter/package.json")),
);

/**
 * Build a throwaway package: dist-test graph + seeded corpus + node_modules
 * junction. packageRoot() = two levels up from dist-test/select/eval-cli.js.
 */
function withTempEvalPackage(
  seed: (fixturesRoot: string) => void,
  fn: (pkg: string, runner: string) => void,
): void {
  const pkg = mkdtempSync(path.join(os.tmpdir(), "gsd-eval-pkg-"));
  try {
    cpSync(DIST_TEST, path.join(pkg, "dist-test"), { recursive: true });
    try {
      symlinkSync(NODE_MODULES, path.join(pkg, "node_modules"), "junction");
    } catch {
      // NODE_PATH below covers deps when junctions unavailable.
    }
    seed(path.join(pkg, "test", "fixtures", "eval"));
    const runner = path.join(pkg, "dist-test", "select", "eval-cli.js");
    fn(pkg, runner);
  } finally {
    rmSync(pkg, { recursive: true, force: true });
  }
}

function spawnEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_PATH: NODE_MODULES };
  delete env.GOVERNANCE_EVAL_FIXTURES_ROOT;
  return env;
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

test("runEval exercises runCases over all cases and aggregates (D-16)", () => {
  const args: RunEvalArgs = {
    projectRoot: "/tmp/proj",
    phaseNumber: "10",
    indexLoader: fixtureIndex,
    casesLoader: fixtureCases,
  };
  const report = runEval(args);
  assert.equal(report.phase, "10");
  assert.equal(report.cases.length, 3, "all 3 fixture cases scored");
  assert.equal(typeof report.aggregate.microRecall, "number");
  assert.equal(typeof report.aggregate.microPrecision, "number");
  // criticalRecall is 1.0 because always-critical matches every construction case
  // (triggers:{} = always-in-phase).
  assert.equal(report.aggregate.recallBySeverity.critical, 1);
});

test("runEval persists via writeEvalEvidence to .planning/governance/eval/{NN}.json (D-07, D-09)", () => {
  withTempRoot((root) => {
    const report = runEval({
      projectRoot: root,
      phaseNumber: "10",
      indexLoader: fixtureIndex,
      casesLoader: fixtureCases,
    });
    writeEvalEvidence(root, "10", report);
    const reloaded = readEvalEvidence(root, "10");
    assert.ok(reloaded !== null, "eval evidence file must exist");
    assert.deepEqual(reloaded!.aggregate, report.aggregate);
    assert.equal(reloaded!.corpusHash, report.corpusHash);
    assert.equal(existsSync(evalEvidencePath(root, "10")), true);
  });
});

test("critical recall miss produces criticalMisses entry + criticalRecall < 1.0 (D-05)", () => {
  const report = runEval({
    projectRoot: "/tmp/proj",
    phaseNumber: "10",
    indexLoader: missIndex,
    casesLoader: missCases,
  });
  assert.ok(report.criticalMisses.length > 0, "critical miss must be populated");
  assert.equal(report.criticalMisses[0].case, "critical-miss-case");
  assert.ok(
    report.criticalMisses[0].expectedNotSelected.includes("narrow-critical"),
    "missed id named in expectedNotSelected",
  );
  assert.equal(report.criticalMisses[0].severity, "critical");
  assert.ok(
    report.aggregate.recallBySeverity.critical < 1.0,
    "criticalRecall must be < 1.0 when a critical rule is missed",
  );
});

test("precision offender reported but not blocked — criticalRecall stays 1.0 (D-06)", () => {
  const report = runEval({
    projectRoot: "/tmp/proj",
    phaseNumber: "10",
    indexLoader: fixtureIndex,
    casesLoader: fixtureCases,
  });
  // precision-offender case selects noise-rule (keyword "noise") which is not expected.
  const offender = report.precisionOffenders.find((p: { case: string }) => p.case === "precision-offender");
  assert.ok(offender, "precision offender must be reported");
  assert.ok(
    offender!.extraSelected.includes("noise-rule"),
    "extra selected id named in extraSelected",
  );
  // Precision reported but NEVER gates — criticalRecall is still 1.0 (no critical miss).
  assert.equal(report.aggregate.recallBySeverity.critical, 1);
});

test("determinism: same corpus + index → byte-identical report modulo capturedAt; corpusHash pinned (D-14)", () => {
  const args: RunEvalArgs = {
    projectRoot: "/tmp/proj",
    phaseNumber: "10",
    indexLoader: fixtureIndex,
    casesLoader: fixtureCases,
  };
  const r1 = runEval(args);
  const r2 = runEval(args);
  // Strip capturedAt for byte-compare — it's the only expected diff.
  const strip = (s: string) => s.replace(/"capturedAt":\s*"[^"]+"/g, '"capturedAt":"X"');
  assert.equal(
    strip(JSON.stringify(r1, null, 2)),
    strip(JSON.stringify(r2, null, 2)),
    "reports byte-identical modulo capturedAt",
  );
  assert.equal(r1.corpusHash, r2.corpusHash, "corpusHash pinned");
  assert.match(r1.corpusHash, /^[a-f0-9]{64}$/, "corpusHash is sha256 hex");
});

test("renderMarkdown emits aggregate + per-case table + critical-misses + corpusHash sections (D-10)", () => {
  const report = runEval({
    projectRoot: "/tmp/proj",
    phaseNumber: "10",
    indexLoader: fixtureIndex,
    casesLoader: fixtureCases,
  });
  const md = renderMarkdown(report);
  assert.match(md, /microRecall/i);
  assert.match(md, /microPrecision/i);
  assert.match(md, /critical/i);
  assert.match(md, /clean-hit/);
  assert.match(md, /corpus hash/i);
  assert.ok(md.includes(report.corpusHash.slice(0, 12)), "markdown embeds corpusHash prefix");
});

test("End-to-end: node dist/select/eval-cli.js 10 writes 10.json + 10-report.md (D-09, D-13)", () => {
  withTempEvalPackage(seedPassingCorpus, (pkg, runner) => {
    const child = spawnSync(process.execPath, [runner, "10"], {
      cwd: pkg,
      encoding: "utf8",
      env: spawnEnv(),
    });
    assert.equal(
      child.status,
      0,
      `expected exit 0, got ${child.status}\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
    );
    assert.equal(existsSync(evalEvidencePath(pkg, "10")), true, "10.json persisted");
    assert.equal(existsSync(evalReportPath(pkg, "10")), true, "10-report.md persisted");
    const reloaded = readEvalEvidence(pkg, "10");
    assert.ok(reloaded, "persisted report reloads");
    assert.equal(reloaded!.aggregate.recallBySeverity.critical, 1);
  });
});

test("D-05 critical-recall miss → exit 2 + persisted failed report (D-08)", () => {
  withTempEvalPackage(seedCriticalMissCorpus, (pkg, runner) => {
    const child = spawnSync(process.execPath, [runner, "10"], {
      cwd: pkg,
      encoding: "utf8",
      env: spawnEnv(),
    });
    assert.equal(
      child.status,
      2,
      `expected exit 2 on critical miss, got ${child.status}\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
    );
    // Failed evidence MUST still persist (D-05 — evidence-of-failure is load-bearing).
    const reloaded = readEvalEvidence(pkg, "10");
    assert.ok(reloaded, "failed report persisted even on exit 2");
    assert.ok(
      reloaded!.aggregate.recallBySeverity.critical < 1.0,
      "persisted report shows criticalRecall < 1.0",
    );
    assert.ok(reloaded!.criticalMisses.length > 0, "criticalMisses populated in persisted report");
  });
});

test("--json flag emits JSON to stdout; default emits markdown (D-03)", () => {
  withTempEvalPackage(seedPassingCorpus, (pkg, runner) => {
    // --json → stdout parses as JSON
    const jsonChild = spawnSync(process.execPath, [runner, "10", "--json"], {
      cwd: pkg,
      encoding: "utf8",
      env: spawnEnv(),
    });
    assert.equal(jsonChild.status, 0);
    const parsed = JSON.parse(jsonChild.stdout) as { phase: string; corpusHash: string };
    assert.equal(parsed.phase, "10");
    assert.match(parsed.corpusHash, /^[a-f0-9]{64}$/);

    // default → markdown table
    const mdChild = spawnSync(process.execPath, [runner, "10"], {
      cwd: pkg,
      encoding: "utf8",
      env: spawnEnv(),
    });
    assert.equal(mdChild.status, 0);
    assert.match(mdChild.stdout, /microRecall|Recall/i);
  });
});

test("production-caller evidence: runCases/aggregate have a non-test caller (eval-cli.ts)", () => {
  const srcPath = path.resolve(__dirname, "..", "..", "src", "select", "eval-cli.ts");
  let src = "";
  try {
    src = readFileSync(srcPath, "utf8");
  } catch {
    const distPath = path.resolve(__dirname, "eval-cli.js");
    src = readFileSync(distPath, "utf8");
  }
  assert.ok(
    src.includes("runCases("),
    "eval-cli must call runCases (production caller of the pure layer)",
  );
  assert.ok(
    src.includes("aggregate("),
    "eval-cli must call aggregate (production caller of the pure layer)",
  );
});

test("evalCorpusRoot points at package-shipped test/fixtures/eval corpus", () => {
  const root = evalCorpusRoot();
  const norm = root.split("\\").join("/");
  assert.ok(norm.endsWith("test/fixtures/eval"), `unexpected corpus root: ${root}`);
  assert.ok(existsSync(path.join(root, "cases", "eval-cases.json")), `missing cases at ${root}`);
  assert.ok(existsSync(path.join(root, "eval-rules")), `missing eval-rules at ${root}`);
});

test("runEval default loaders use package corpus (not empty projectRoot)", () => {
  const report = runEval({
    projectRoot: path.join(os.tmpdir(), "empty-consumer"),
    phaseNumber: "18",
  });
  assert.ok(report.cases.length > 0, "default packaged corpus must yield cases");
  assert.equal(typeof report.aggregate.microRecall, "number");
});

test("GOVERNANCE_EVAL_FIXTURES_ROOT cannot alter case count or corpus hash", () => {
  const baseline = runEval({
    projectRoot: path.join(os.tmpdir(), "empty-consumer"),
    phaseNumber: "18",
  });
  assert.ok(baseline.cases.length > 1, "baseline packaged corpus must have multiple cases");

  withTempRoot((greenwash) => {
    // Greenwash corpus: single clean-hit case — would shrink count/hash if honored.
    seedPassingCorpus(greenwash);
    const prev = process.env.GOVERNANCE_EVAL_FIXTURES_ROOT;
    process.env.GOVERNANCE_EVAL_FIXTURES_ROOT = greenwash;
    try {
      const poisoned = runEval({
        projectRoot: path.join(os.tmpdir(), "empty-consumer"),
        phaseNumber: "18",
      });
      assert.equal(
        poisoned.cases.length,
        baseline.cases.length,
        "env override must not change case count",
      );
      assert.equal(
        poisoned.corpusHash,
        baseline.corpusHash,
        "env override must not change corpus hash",
      );
      assert.notEqual(
        poisoned.cases.length,
        1,
        "must not accept greenwashed single-case corpus via env",
      );
    } finally {
      if (prev === undefined) delete process.env.GOVERNANCE_EVAL_FIXTURES_ROOT;
      else process.env.GOVERNANCE_EVAL_FIXTURES_ROOT = prev;
    }
  });
});
