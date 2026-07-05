/**
 * Recall/precision measurement over the labeled 02-01 eval set (SEL-01 acceptance
 * evidence — the Core-Value gate's arithmetic).
 *
 * PURE measurement functions over {@link select} output: no I/O of their own (the
 * caller passes the built index + parsed cases), no clock, no random. The math is
 * the multi-label micro-average from 02-RESEARCH §2:
 *
 *   per case, with S = selected ids, E = expected ids:
 *     tp = |S ∩ E|   fp = |S \ E|   fn = |E \ S|
 *   micro-averaged:
 *     recall    = Σtp / (Σtp + Σfn)
 *     precision = Σtp / (Σtp + Σfp)
 *
 * Severity-partitioned recall is computed on the EXPECTED rule's GROUND-TRUTH
 * severity (from the index record), never the selection — so a missed critical
 * rule counts against critical recall. An empty expected subset scores recall 1
 * (vacuous, so it never drags the aggregate — ties/empty scoring, 02-RESEARCH §2).
 *
 * Precision is REPORTED, never gated anywhere in this module: gating precision
 * would pressure the engine toward under-injection, which 02-CONTEXT rejects.
 */
import { select } from "./select.js";
import type { RuleIndex, Severity, Phase, TaskSignal } from "../types.js";

/** One labeled case from test/fixtures/eval/cases/eval-cases.json (02-01 ground truth). */
export interface EvalCase {
  name: string;
  signal: TaskSignal;
  phase: Phase;
  scopeConfig: { domains: string[] };
  expectedRuleIds: string[];
}

/** TP/FP/FN counts for a single case. */
export interface CaseScore {
  tp: number;
  fp: number;
  fn: number;
}

/** The per-case selection outcome the aggregate consumes. */
export interface CaseResult {
  name: string;
  selectedIds: string[];
  expectedIds: string[];
}

/** The micro-averaged aggregate + per-severity recall (the recall gate reads this). */
export interface Aggregate {
  microRecall: number;
  microPrecision: number;
  recallBySeverity: Record<Severity, number>;
}

/**
 * Score one case as set-arithmetic TP/FP/FN (02-RESEARCH §2). tp = |S ∩ E|,
 * fp = selected-but-not-expected, fn = expected-but-not-selected.
 */
export function scoreCase(selectedIds: string[], expectedIds: string[]): CaseScore {
  const selected = new Set(selectedIds);
  const expected = new Set(expectedIds);
  let tp = 0;
  let fp = 0;
  for (const id of selected) {
    if (expected.has(id)) tp += 1;
    else fp += 1;
  }
  let fn = 0;
  for (const id of expected) {
    if (!selected.has(id)) fn += 1;
  }
  return { tp, fp, fn };
}

/**
 * Run every case through the pure `select()` over `index`, returning the per-case
 * selected ids paired with the ground-truth expected ids. The caller supplies the
 * index (built once from the eval corpus) and the parsed cases.
 */
export function runCases(index: RuleIndex, cases: EvalCase[]): CaseResult[] {
  return cases.map((c) => {
    const result = select(index, c.signal, {
      phase: c.phase,
      domains: c.scopeConfig.domains,
    });
    return {
      name: c.name,
      selectedIds: result.selected.map((s) => s.id),
      expectedIds: c.expectedRuleIds,
    };
  });
}

/**
 * Recall over a subset of expected ids (those of a single severity). Vacuously 1
 * when the subset is empty so an absent severity never drags the aggregate down
 * (ties/empty scoring, 02-RESEARCH §2). Otherwise recall = |hit| / |subset|.
 */
function subsetRecall(subset: string[], selectedByCase: Map<string, Set<string>>, caseOf: Map<string, string>): number {
  if (subset.length === 0) return 1;
  let hit = 0;
  for (const key of subset) {
    const caseName = caseOf.get(key)!;
    const selected = selectedByCase.get(caseName)!;
    // key is `${caseName}::${id}` — recover the id after the separator.
    const id = key.slice(caseName.length + 2);
    if (selected.has(id)) hit += 1;
  }
  return hit / subset.length;
}

/**
 * Aggregate per-case results into micro-averaged recall/precision + per-severity
 * recall. Severity partition is on the EXPECTED rule's index severity (ground
 * truth) — a missed critical rule lowers criticalRecall (02-RESEARCH §2).
 *
 * Each expected occurrence is keyed `${caseName}::${id}` so the SAME rule id
 * expected in two cases counts as two independent occurrences (a miss in either
 * case is caught), rather than being collapsed by a bare id.
 */
export function aggregate(index: RuleIndex, results: CaseResult[]): Aggregate {
  const severityById = new Map(index.rules.map((r) => [r.id, r.severity] as const));

  let sumTp = 0;
  let sumFp = 0;
  let sumFn = 0;

  // Per-case selected sets + per-severity expected occurrence keys.
  const selectedByCase = new Map<string, Set<string>>();
  const caseOf = new Map<string, string>();
  const bySeverity: Record<Severity, string[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const r of results) {
    const { tp, fp, fn } = scoreCase(r.selectedIds, r.expectedIds);
    sumTp += tp;
    sumFp += fp;
    sumFn += fn;

    selectedByCase.set(r.name, new Set(r.selectedIds));
    for (const id of r.expectedIds) {
      const key = `${r.name}::${id}`;
      caseOf.set(key, r.name);
      const sev = severityById.get(id);
      if (sev) bySeverity[sev].push(key);
    }
  }

  // recall/precision are 1 when the denominator is 0 (no expected / no selected).
  const microRecall = sumTp + sumFn === 0 ? 1 : sumTp / (sumTp + sumFn);
  const microPrecision = sumTp + sumFp === 0 ? 1 : sumTp / (sumTp + sumFp);

  return {
    microRecall,
    microPrecision,
    recallBySeverity: {
      critical: subsetRecall(bySeverity.critical, selectedByCase, caseOf),
      high: subsetRecall(bySeverity.high, selectedByCase, caseOf),
      medium: subsetRecall(bySeverity.medium, selectedByCase, caseOf),
      low: subsetRecall(bySeverity.low, selectedByCase, caseOf),
    },
  };
}
