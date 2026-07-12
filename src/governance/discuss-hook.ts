/**
 * Discuss gate hook — the discuss:pre step's pure-core orchestrator
 * (RESEARCH §3 + §6, GATE-01).
 *
 * THIN by design (Pitfall 3): marshals loop context through the existing
 * pure cores and persists the result. NO matching / rendering / budget logic
 * lives here — those stay in select.ts / inject.ts so the hook cannot drift
 * into under-injection.
 *
 *   validateSignal -> classifyRisk -> riskAdjustedDomains -> select -> renderInjection
 *
 * Then persists the full record via the atomic state-store (single source of
 * truth for the on-disk format) and returns the `<governance>` fragment.
 *
 * Fail-loud (Pitfall 7): a malformed STATE.md, missing index, invalid signal,
 * or unreadable file all THROW — never silently emit an empty/no-governance
 * fragment (the under-injection footgun).
 *
 * `when` is NOT re-checked here (Pitfall 8): the capability registry
 * evaluated `governance.enabled` before dispatching the skill, so the hook
 * trusts it has been enabled.
 */
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type {
  Phase,
  RuleIndex,
  SelectionConfig,
  TaskSignal,
} from "../types.js";
import { validateSignal } from "../select/validate-signal.js";
import { select } from "../select/select.js";
import { renderInjection } from "../inject/inject.js";
import { buildIndex } from "../index/build.js";
import { validateIndex } from "../index/validate-index.js";
import { classifyRisk, riskAdjustedDomains } from "./risk.js";
import {
  writeSelection,
  type GovernanceRecord,
} from "./state-store.js";
import { readGovernanceConfig } from "./config.js";

/** Re-exported so callers can read the index alongside the hook result. */
export type { RuleIndex };

/** Arguments to {@link discussHook}. All paths are repo-relative or absolute. */
export interface DiscussHookArgs {
  /** The project root — used to locate STATE.md and the governance store. */
  projectRoot: string;
  /** Override path for STATE.md (defaults to `<root>/.planning/STATE.md`). */
  statePath?: string;
  /** Override path for the rule index (defaults to `<root>/rule-index.json`). */
  indexPath?: string;
  /** The task signal derived from the discuss context. */
  taskSignal: TaskSignal;
  /** The base domain subscription to widen with risk (default []). */
  baseDomains?: string[];
  /** Optional token budget override (default: the select core's default 2000). */
  budget?: number;
}

/** The return value of {@link discussHook}. */
export interface DiscussHookResult {
  /** The `<governance>` fragment to attach to the discuss context. */
  fragment: string;
  /** The persisted record (full SelectionResult, no body). */
  record: GovernanceRecord;
}

/** Re-exported types for callers. */
export type { Phase, SelectionConfig, TaskSignal, GovernanceRecord };

/**
 * Map the first GSD phase to AI-DLC inception and all later development phases
 * to construction. GSD phase numbers are project-defined and unbounded, so
 * they cannot encode an operations transition. OPS-01 remains deferred; add
 * explicit AI-DLC phase metadata before returning `operations` here.
 */
export function phaseFromNumber(n: number): Phase {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(
      `malformed STATE.md: current_phase ${JSON.stringify(n)} is not a positive integer`,
    );
  }
  return n === 1 ? "inception" : "construction";
}

/**
 * Parse the `current_phase` numeric field out of a STATE.md frontmatter block.
 * Tolerant of leading/trailing whitespace; throws on a missing or non-numeric
 * field (Pitfall 7 — never silently fall back to a default phase).
 */
function parseStatePhase(stateMarkdown: string, sourcePath: string): Phase {
  // Frontmatter is bounded by `---\n` fences. Match `current_phase: <int>`
  // inside the first fence; tolerate surrounding quotes / whitespace.
  const fmMatch = stateMarkdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/m);
  if (!fmMatch) {
    throw new Error(
      `malformed STATE.md at ${sourcePath}: no frontmatter fence found`,
    );
  }
  const fm = fmMatch[1];
  const phaseLine = fm.match(/^current_phase:\s*"?"?(\d+)"?"?\s*$/m);
  if (!phaseLine) {
    throw new Error(
      `malformed STATE.md at ${sourcePath}: current_phase field missing or non-numeric`,
    );
  }
  return phaseFromNumber(Number(phaseLine[1]));
}

/**
 * Read STATE.md from `statePath` (or the default project path) and parse the
 * phase. Throws loud on missing file or unparseable frontmatter (Pitfall 7).
 */
function resolvePhase(args: DiscussHookArgs): Phase {
  const statePath = args.statePath ?? path.join(args.projectRoot, ".planning", "STATE.md");
  let raw: string;
  try {
    raw = readFileSync(statePath, "utf8");
  } catch (err) {
    throw new Error(
      `discussHook: cannot read STATE.md at ${statePath} (${String(err)}) — phase is required to run selection`,
    );
  }
  return parseStatePhase(raw, statePath);
}

/**
 * Resolve the rule index. A `.json` file is read + validated via validateIndex
 * (mirrors src/cli/commands/select.ts:readIndex — same loud failure on a
 * malformed/corrupted index, never silent empty). A directory is compiled on
 * the fly via buildIndex (developer convenience).
 */
function resolveIndex(indexPath: string): RuleIndex {
  let stat;
  try {
    stat = statSync(indexPath);
  } catch (err) {
    throw new Error(
      `discussHook: cannot stat index at ${indexPath} (${String(err)}) — index is required to run selection`,
    );
  }
  if (stat.isDirectory()) {
    return buildIndex(indexPath);
  }
  let raw: string;
  try {
    raw = readFileSync(indexPath, "utf8");
  } catch (err) {
    throw new Error(
      `discussHook: cannot read index at ${indexPath} (${String(err)})`,
    );
  }
  const parsed = JSON.parse(raw) as RuleIndex;
  validateIndex(parsed); // fail loud on a malformed index
  return parsed;
}

/**
 * Discuss gate hook (RESEARCH §3 + §6, GATE-01). Marshals loop context
 * through the pure cores, persists the full selection via state-store, and
 * returns the `<governance>` fragment. Throws loud on any malformed input.
 */
export function discussHook(args: DiscussHookArgs): DiscussHookResult {
  // 1. Resolve phase from STATE.md (loud on missing/unparseable).
  const phase = resolvePhase(args);

  // 2. Resolve index (loud on missing/unreadable/corrupt).
  const indexPath = args.indexPath ?? path.join(args.projectRoot, "rule-index.json");
  const index = resolveIndex(indexPath);

  // 3. Validate the signal — let validateSignal throw on a malformed input
  //    (do NOT swallow — under-injection footgun).
  validateSignal(args.taskSignal);

  // 4. Risk classification -> risk-adjusted domain subscription (D-RISK).
  const tier = classifyRisk(args.taskSignal, phase);
  const baseDomains =
    args.baseDomains ?? readGovernanceConfig(args.projectRoot).domains;
  const domains = riskAdjustedDomains(tier, baseDomains);

  // 5. Build the SelectionConfig (budget undefined => select core's default).
  const config: SelectionConfig = {
    phase,
    domains,
    ...(args.budget !== undefined ? { budget: args.budget } : {}),
  };

  // 6. Select via the pure core.
  const result = select(index, args.taskSignal, config);

  // 7. Render the <governance> fragment via the pure core.
  const fragment = renderInjection(result);

  // 8. Build the record. Timestamp is wrapper metadata only — Pitfall 4: NO
  //    clock inside selectionResult, so byte-identical reload is achievable.
  const record: GovernanceRecord = {
    phase,
    taskSignal: args.taskSignal,
    selectionConfig: config,
    selectionResult: result,
    riskTier: tier,
    timestamp: new Date().toISOString(),
  };

  // 9. Persist via state-store (single source of truth; atomic write).
  writeSelection(record, args.projectRoot);

  // 10. Return the fragment + record. The hook does NOT re-implement matching,
  //     rendering, or budget (Pitfall 3); it does NOT re-check `when`
  //     (Pitfall 8 — the registry already evaluated it).
  return { fragment, record };
}

function runDirect(argv: string[]): void {
  // Minimal CLI: projectRoot + taskSignal JSON file + optional domains/budget/index.
  // Prefer `governance discuss` from skills; this keeps checkout-local parity.
  if (argv.length < 2) {
    throw new Error(
      "usage: discuss-hook <projectRoot> <taskSignalJsonFile> [--domains a,b] [--budget n] [--index <f>]",
    );
  }
  const [projectRoot, signalPath, ...flags] = argv;
  let domains: string[] | undefined;
  let budget: number | undefined;
  let indexPath: string | undefined;
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i];
    if (f === "--domains") {
      domains = (flags[++i] ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
    } else if (f === "--budget") {
      const n = Number(flags[++i]);
      if (!Number.isInteger(n) || n < 0) throw new Error("discuss-hook: --budget must be non-negative integer");
      budget = n;
    } else if (f === "--index") {
      indexPath = flags[++i];
    } else {
      throw new Error(`discuss-hook: unknown flag ${f}`);
    }
  }
  const taskSignal = JSON.parse(readFileSync(signalPath!, "utf8")) as TaskSignal;
  const result = discussHook({
    projectRoot: projectRoot!,
    taskSignal,
    ...(domains !== undefined ? { baseDomains: domains } : {}),
    ...(budget !== undefined ? { budget } : {}),
    ...(indexPath !== undefined ? { indexPath } : {}),
  });
  process.stdout.write(result.fragment);
}

if (require.main === module) {
  try {
    runDirect(process.argv.slice(2));
  } catch (err) {
    process.stderr.write((err instanceof Error ? err.message : String(err)) + "\n");
    process.exitCode = 1;
  }
}
