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
import type { GateResult } from "../enforcement/types.js";
import { classifyRisk, riskAdjustedDomains } from "./risk.js";
import { phaseFromNumber } from "./discuss-hook.js";
import {
  writeGateEvidence,
  type GateEvidence,
} from "./gate-evidence-store.js";

export interface PlanTaskSignalInputs {
  phaseGoal: string;
  requirementIds: string[];
  riskThreatModel: string[];
  acceptanceCriteria: string[];
  impactedFiles: string[];
  impactedModules?: string[];
}

export interface PlanHookArgs {
  projectRoot: string;
  phaseNumber: string;
  plannerInputs: PlanTaskSignalInputs;
  statePath?: string;
  indexPath?: string;
  baseDomains?: string[];
  budget?: number;
}

export interface PlanHookResult {
  fragment: string;
  evidence: GateEvidence;
  taskSignal: TaskSignal;
}

const TOKEN_RE = /[a-z0-9]+(?:-[a-z0-9]+)*/g;

function asciiLower(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, " ")
    .toLowerCase();
}

function addTokens(out: string[], seen: Set<string>, values: readonly string[]): void {
  for (const value of values) {
    for (const match of asciiLower(value).matchAll(TOKEN_RE)) {
      const token = match[0];
      if (!seen.has(token)) {
        seen.add(token);
        out.push(token);
      }
    }
  }
}

function normalizePath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

function addPaths(out: string[], seen: Set<string>, values: readonly string[]): void {
  for (const value of values) {
    const normalized = normalizePath(value);
    if (normalized.length > 0 && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
}

function modulePath(value: string): string {
  const normalized = normalizePath(value);
  if (normalized.length === 0 || normalized.includes("*")) return normalized;
  return `${normalized}/**`;
}

export function derivePlannerTaskSignal(inputs: PlanTaskSignalInputs): TaskSignal {
  const keywords: string[] = [];
  const keywordSeen = new Set<string>();
  addTokens(keywords, keywordSeen, [inputs.phaseGoal]);
  addTokens(keywords, keywordSeen, inputs.requirementIds);
  addTokens(keywords, keywordSeen, inputs.riskThreatModel);
  addTokens(keywords, keywordSeen, inputs.acceptanceCriteria);

  const paths: string[] = [];
  const pathSeen = new Set<string>();
  addPaths(paths, pathSeen, inputs.impactedFiles);
  addPaths(paths, pathSeen, (inputs.impactedModules ?? []).map(modulePath));

  const signal: TaskSignal = {
    taskType: inputs.riskThreatModel.length > 0 ? "security" : "feature",
    keywords,
    paths,
  };
  validateSignal(signal);
  return signal;
}

function parseStatePhase(stateMarkdown: string, sourcePath: string): Phase {
  const fmMatch = stateMarkdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/m);
  if (!fmMatch) {
    throw new Error(`malformed STATE.md at ${sourcePath}: no frontmatter fence found`);
  }
  const phaseLine = fmMatch[1].match(/^current_phase:\s*"?(\d+)"?\s*$/m);
  if (!phaseLine) {
    throw new Error(
      `malformed STATE.md at ${sourcePath}: current_phase field missing or non-numeric`,
    );
  }
  return phaseFromNumber(Number(phaseLine[1]));
}

function resolvePhase(args: PlanHookArgs): Phase {
  const statePath = args.statePath ?? path.join(args.projectRoot, ".planning", "STATE.md");
  let raw: string;
  try {
    raw = readFileSync(statePath, "utf8");
  } catch (err) {
    throw new Error(
      `planHook: cannot read STATE.md at ${statePath} (${String(err)}) - phase is required to run selection`,
    );
  }
  return parseStatePhase(raw, statePath);
}

function resolveIndex(indexPath: string): RuleIndex {
  let stat;
  try {
    stat = statSync(indexPath);
  } catch (err) {
    throw new Error(
      `planHook: cannot stat index at ${indexPath} (${String(err)}) - index is required to run selection`,
    );
  }
  if (stat.isDirectory()) {
    return buildIndex(indexPath);
  }
  let raw: string;
  try {
    raw = readFileSync(indexPath, "utf8");
  } catch (err) {
    throw new Error(`planHook: cannot read index at ${indexPath} (${String(err)})`);
  }
  const parsed = JSON.parse(raw) as RuleIndex;
  validateIndex(parsed);
  return parsed;
}

function budgetFailureResult(phaseNumber: string, selectionConfig: SelectionConfig): GateResult {
  return {
    gateId: "plan",
    status: "fail",
    findings: [
      {
        id: "plan-selection-budget-exceeded",
        severity: "medium",
        message:
          `Plan governance selection exceeded budget ${selectionConfig.budget}. ` +
          "Reduce planner inputs or raise the selection budget before shipping.",
        evidence: {
          path: `.planning/governance/gates/${phaseNumber}-plan.json`,
        },
      },
    ],
    evaluatedBy: "aidlc-governance-plan",
    evaluatedAt: new Date().toISOString(),
  };
}

export function planHook(args: PlanHookArgs): PlanHookResult {
  const phase = resolvePhase(args);
  const indexPath = args.indexPath ?? path.join(args.projectRoot, "rule-index.json");
  const index = resolveIndex(indexPath);
  const taskSignal = derivePlannerTaskSignal(args.plannerInputs);
  const tier = classifyRisk(taskSignal, phase);
  const domains = riskAdjustedDomains(tier, args.baseDomains ?? []);
  const selectionConfig: SelectionConfig = {
    phase,
    domains,
    ...(args.budget === undefined ? {} : { budget: args.budget }),
  };
  const selectionResult = select(index, taskSignal, selectionConfig);
  const fragment = renderInjection(selectionResult);
  const now = new Date().toISOString();
  const gateResult: GateResult = selectionResult.budgetExceeded
    ? budgetFailureResult(args.phaseNumber, selectionConfig)
    : {
        gateId: "plan",
        status: "pass",
        findings: [],
        evaluatedBy: "aidlc-governance-plan",
        evaluatedAt: now,
      };
  const evidence: GateEvidence = {
    request: {
      gateId: "plan",
      phase,
      taskSignal,
      rules: selectionResult.selected,
      requestedAt: now,
    },
    result: gateResult,
    metadata: {
      phase: args.phaseNumber,
      writtenAt: now,
      source: "aidlc-governance-plan",
    },
  };
  writeGateEvidence(args.projectRoot, args.phaseNumber, evidence);
  return { fragment, evidence, taskSignal };
}

function runDirect(argv: string[]): void {
  if (argv.length !== 3) {
    throw new Error("usage: plan-hook <projectRoot> <phaseNumber> <plannerInputsJsonFile>");
  }
  const [projectRoot, phaseNumber, inputsPath] = argv;
  const plannerInputs = JSON.parse(readFileSync(inputsPath, "utf8")) as PlanTaskSignalInputs;
  const result = planHook({ projectRoot, phaseNumber, plannerInputs });
  process.stdout.write(result.fragment);
}

if (require.main === module) {
  try {
    runDirect(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${String(err)}\n`);
    process.exitCode = 1;
  }
}
