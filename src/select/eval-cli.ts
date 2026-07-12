/**
 * SEL-06 standing recall/precision harness producer (D-01..D-16).
 *
 * Wraps the PURE measurement layer ({@link runCases} / {@link aggregate} from
 * eval-harness.ts — D-16: NO re-derivation of selection math) with:
 *   - I/O: load eval corpus + build index from disk
 *   - Reporting: build EvalReport + render markdown
 *   - Persistence: write durable evidence + markdown report
 *   - Exit codes: 0 pass, 2 critical-recall regression, 3 parse/load error
 *
 * D-02 (reconciled per 10-CONTEXT): the index is built via `buildIndex(EVAL_ROOT)`
 * where EVAL_ROOT = `test/fixtures/eval/eval-rules/` — the SAME idiom as
 * recall.test.ts:33-38. The corpus hash pins the corpus, NOT the built index
 * (the index is deterministic given the corpus; the hash anchors reproducibility
 * at the source-of-truth layer).
 *
 * D-14 determinism: cases are sorted by `name` ascending BEFORE runCases; the
 * sha256 corpusHash is computed over the canonicalized (pretty-printed,
 * name-sorted) cases JSON. `capturedAt` is the ONLY expected diff between two
 * runs of the same corpus.
 *
 * D-05 critical-recall floor: `process.exitCode = 2` is set AFTER persistence
 * so failed evidence still lands on disk (evidence-of-failure is load-bearing
 * for the ship gate). D-08: `process.exitCode = 3` on parse/load error. NEVER
 * `process.exit()` — it truncates piped stdout (CR-02, T-10-05).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildIndex } from "../index/build.js";
import { runCases, aggregate, type EvalCase } from "./eval-harness.js";
import type { RuleIndex, Severity } from "../types.js";
import {
  writeEvalEvidence,
  writeEvalReportMarkdown,
  type EvalReport,
  type EvalCaseRow,
  type CriticalMiss,
  type PrecisionOffender,
} from "../governance/eval-evidence.js";
import { evalEvidencePath, evalReportPath } from "../governance/paths.js";

// ---------------------------------------------------------------------------
// Injectable seams — tests pass fixture loaders; production callers omit them.
// ---------------------------------------------------------------------------

/**
 * Package root for the shipped eval corpus.
 * `eval-cli` compiles to `dist/select/` or `dist-test/select/` — two levels up is
 * the package root in both layouts. Consumers resolve corpus from the installed
 * package, never from consumer cwd (CR-01).
 */
function packageRoot(): string {
  return path.resolve(__dirname, "..", "..");
}

/**
 * Eval fixtures root (`.../test/fixtures/eval`).
 * Immutable packaged corpus under package root — no env override.
 * Tests inject via RunEvalArgs loaders or spawn a purpose-built temp package.
 */
export function evalCorpusRoot(): string {
  return path.join(packageRoot(), "test", "fixtures", "eval");
}

/** Default index loader: buildIndex over the packaged eval-rules corpus (D-02). */
function defaultIndexLoader(): () => RuleIndex {
  const evalRoot = path.join(evalCorpusRoot(), "eval-rules");
  return () => {
    if (!existsSync(evalRoot)) {
      throw new Error(
        `eval corpus missing at ${evalRoot} — package must ship test/fixtures/eval`,
      );
    }
    return buildIndex(evalRoot);
  };
}

/** Default cases loader: read + parse packaged eval-cases.json. */
function defaultCasesLoader(): () => EvalCase[] {
  const casesFile = path.join(evalCorpusRoot(), "cases", "eval-cases.json");
  return () => {
    if (!existsSync(casesFile)) {
      throw new Error(
        `eval cases missing at ${casesFile} — package must ship test/fixtures/eval`,
      );
    }
    return loadCases(casesFile);
  };
}

/**
 * Load + parse the labeled case set from disk. Top-level JSON array, no wrapper.
 * Mirrors recall.test.ts:49-54 — read via fs, never imported as a module.
 */
export function loadCases(file: string): EvalCase[] {
  const raw = readFileSync(file, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`eval-cases.json at ${file} must parse as a JSON array`);
  }
  return parsed as EvalCase[];
}

/** Injectable args — production callers omit indexLoader/casesLoader. */
export interface RunEvalArgs {
  projectRoot: string;
  phaseNumber: string;
  /** Override the index builder (tests only). Production omits → buildIndex(EVAL_ROOT). */
  indexLoader?: () => RuleIndex;
  /** Override the cases loader (tests only). Production omits → loadCases(CASES_FILE). */
  casesLoader?: () => EvalCase[];
}

// ---------------------------------------------------------------------------
// Orchestrator — pure-ish (no disk I/O except via injected loaders; `new Date`
// is the only non-determinism, and it lives in capturedAt per D-14).
// ---------------------------------------------------------------------------

/**
 * Run every case through {@link runCases} + {@link aggregate} and build the
 * {@link EvalReport}. Does NOT persist — runDirect calls writeEvalEvidence +
 * writeEvalReportMarkdown. This split keeps the function testable in isolation.
 *
 * D-14: cases are sorted by `name` ascending BEFORE runCases so two runs over
 * the same corpus produce byte-identical reports modulo capturedAt.
 */
export function runEval(args: RunEvalArgs): EvalReport {
  // Default loaders resolve the shipped package corpus (not consumer cwd).
  // Evidence still writes under args.projectRoot via writeEvalEvidence.
  const index = (args.indexLoader ?? defaultIndexLoader())();
  const cases = (args.casesLoader ?? defaultCasesLoader())();

  // D-14: deterministic case ordering. Sort a copy so the caller's array is not
  // mutated in place (casesLoader may return a cached reference).
  const sorted = [...cases].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const results = runCases(index, sorted);
  const aggregateResult = aggregate(index, results);

  // Severity lookup from the INDEX ground truth (Pitfall 3 — never from selection).
  const severityById = new Map<string, Severity>(
    index.rules.map((r) => [r.id, r.severity] as const),
  );

  const caseRows: EvalCaseRow[] = [];
  const criticalMisses: CriticalMiss[] = [];
  const precisionOffenders: PrecisionOffender[] = [];

  for (const r of results) {
    const selectedSet = new Set(r.selectedIds);
    const expectedSet = new Set(r.expectedIds);

    let tp = 0;
    let fp = 0;
    for (const id of r.selectedIds) {
      if (expectedSet.has(id)) tp += 1;
      else fp += 1;
    }
    let fn = 0;
    const missedCritical: string[] = [];
    for (const id of r.expectedIds) {
      if (!selectedSet.has(id)) {
        fn += 1;
        const sev = severityById.get(id);
        // aggregate() already throws on an expected id absent from the index
        // (WR-02 guard), so sev is defined here. Critical-severity misses are
        // the D-05 blocking signal — name them in criticalMisses.
        if (sev === "critical") {
          missedCritical.push(id);
        }
      }
    }
    if (missedCritical.length > 0) {
      criticalMisses.push({ case: r.name, expectedNotSelected: missedCritical, severity: "critical" });
    }

    const extraSelected = r.selectedIds.filter((id) => !expectedSet.has(id));
    if (extraSelected.length > 0) {
      precisionOffenders.push({ case: r.name, extraSelected });
    }

    caseRows.push({
      name: r.name,
      selectedIds: r.selectedIds,
      expectedRuleIds: r.expectedIds,
      tp,
      fp,
      fn,
    });
  }

  // D-14: corpusHash over the canonicalized (pretty-printed, name-sorted) cases
  // JSON. Pins the eval-set version for reproducibility — same corpus + same
  // index = byte-identical report modulo capturedAt.
  const corpusHash = createHash("sha256")
    .update(JSON.stringify(sorted, null, 2))
    .digest("hex");

  return {
    phase: args.phaseNumber,
    capturedAt: new Date().toISOString(),
    aggregate: aggregateResult,
    cases: caseRows,
    criticalMisses,
    precisionOffenders,
    corpusHash,
  };
}

// ---------------------------------------------------------------------------
// Markdown renderer — D-10 content required; column order at implementer
// discretion. Tests assert content presence, not formatting.
// ---------------------------------------------------------------------------

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * Render the human-readable markdown report (D-10). Sections: title + timestamp,
 * aggregate scores (microRecall, microPrecision, per-severity recall), per-case
 * TP/FP/FN table, named critical misses (under-injection — the blocking
 * signal), precision offenders (advisory), corpus hash pin.
 */
export function renderMarkdown(report: EvalReport): string {
  const lines: string[] = [];
  lines.push(`# Selection Eval Report — Phase ${report.phase}`);
  lines.push("");
  lines.push(`Captured: ${report.capturedAt}`);
  lines.push(`Corpus hash: \`${report.corpusHash}\``);
  lines.push("");

  const agg = report.aggregate;
  lines.push("## Aggregate");
  lines.push("");
  lines.push(`- microRecall: ${pct(agg.microRecall)}`);
  lines.push(`- microPrecision: ${pct(agg.microPrecision)}`);
  lines.push("- recall by severity:");
  for (const sev of ["critical", "high", "medium", "low"] as const) {
    lines.push(`  - ${sev}: ${pct(agg.recallBySeverity[sev])}`);
  }
  lines.push("");

  lines.push("## Per-case TP/FP/FN");
  lines.push("");
  lines.push("| Case | TP | FP | FN |");
  lines.push("| --- | --- | --- | --- |");
  for (const c of report.cases) {
    lines.push(`| ${c.name} | ${c.tp} | ${c.fp} | ${c.fn} |`);
  }
  lines.push("");

  if (report.criticalMisses.length > 0) {
    lines.push("## Critical misses (under-injection — D-05 blocking signal)");
    lines.push("");
    for (const m of report.criticalMisses) {
      lines.push(`- **${m.case}**: ${m.expectedNotSelected.join(", ")} (${m.severity})`);
    }
    lines.push("");
  } else {
    lines.push("## Critical misses");
    lines.push("");
    lines.push("None — criticalRecall is at floor (1.0).");
    lines.push("");
  }

  if (report.precisionOffenders.length > 0) {
    lines.push("## Precision offenders (over-injection — D-06 advisory, never blocks)");
    lines.push("");
    for (const p of report.precisionOffenders) {
      lines.push(`- **${p.case}**: ${p.extraSelected.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI main — mirrors capture-test-evidence.ts isDirectRun/runDirect/exitCode.
// ---------------------------------------------------------------------------

/**
 * CLI entrypoint. Parses argv (one positional phaseNumber + `--json` flag),
 * runs the harness, persists evidence + markdown, emits output to stdout.
 *
 * D-05: AFTER persistence, if criticalRecall < 1.0 set process.exitCode = 2
 * (failed evidence MUST still persist for the ship gate).
 * D-08: parse/load errors are caught by the isDirectRun wrapper → exit 3.
 *
 * Exported so the `governance eval` CLI shim (src/cli/commands/eval.ts) can
 * delegate to it without duplicating the parseArgs + orchestration logic.
 */
export function runDirect(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      json: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  if (positionals.length !== 1) {
    throw new Error("usage: node dist/select/eval-cli.js <phaseNumber> [--json]");
  }

  const phaseNumber = positionals[0];
  const projectRoot = process.cwd();

  const report = runEval({ projectRoot, phaseNumber });

  // Persist BEFORE exit-code decision — failed evidence must land on disk so
  // the ship gate can read it (D-05: evidence-of-failure is load-bearing).
  writeEvalEvidence(projectRoot, phaseNumber, report);
  writeEvalReportMarkdown(projectRoot, phaseNumber, renderMarkdown(report));

  // WR-02: route path rendering through paths.ts helpers (single source of
  // truth for the governance layout) instead of re-deriving the layout inline.
  const jsonPath = evalEvidencePath(projectRoot, phaseNumber);
  const mdPath = evalReportPath(projectRoot, phaseNumber);
  // Status lines go to stderr so stdout is clean for both --json (machine-parseable)
  // and default markdown (human-readable) — `JSON.parse(stdout)` must not see these.
  process.stderr.write(`eval-cli: persisted ${jsonPath}\n`);
  process.stderr.write(`eval-cli: persisted ${mdPath}\n`);

  if (values.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(renderMarkdown(report) + "\n");
  }

  // D-05: critical-recall regression → exit 2. Failed evidence already persisted.
  // WR-03: reset to 0 on pass so a prior failed run in the same process does
  // not leak exitCode (defensive against future in-process loop reuse).
  if (report.aggregate.recallBySeverity.critical < 1.0) {
    process.exitCode = 2;
  } else {
    process.exitCode = 0;
  }
}

// TD-05: match THIS compiled dist entry specifically, not any file named
// eval-cli.js elsewhere on the PATH. __filename is the runtime path of this
// module under CJS.
function isDirectRun(): boolean {
  const invokedPath = process.argv[1];
  if (invokedPath === undefined) return false;
  return path.resolve(invokedPath) === __filename;
}

if (isDirectRun()) {
  try {
    runDirect(process.argv.slice(2));
  } catch (err) {
    // D-08: parse/load error → exit 3 (distinct from 1 generic, 2 regression).
    // process.exitCode (NOT process.exit) so piped stdout drains (CR-02, T-10-05).
    process.stderr.write(`eval-cli: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 3;
  }
}