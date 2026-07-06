import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readSelection, type GovernanceRecord } from "./state-store.js";
import { selectionStatePath } from "./paths.js";
import type { Severity, SkipReason, Scope } from "../types.js";

export const AUDIT_SKIP_REASONS = [
  "out-of-phase",
  "out-of-scope-by-trigger",
  "superseded",
  "explicitly-waived",
] as const;

export type AuditSkipReason = (typeof AUDIT_SKIP_REASONS)[number];

export interface AuditAppliedRule {
  id: string;
  severity: Severity;
  summary: string;
  matchedAxis: string;
  matchedValue: string;
}

export interface AuditSkippedRule {
  id: string;
  severity: Severity;
  reason: AuditSkipReason;
  selector_reason: SkipReason;
  detail?: string;
  scope?: Scope;
  sourceFile?: string;
}

export interface GovernanceAudit {
  schema_version: 1;
  phase: GovernanceRecord["phase"];
  riskTier: GovernanceRecord["riskTier"];
  selection_timestamp: string;
  generated_from: ".planning/governance/selection-state.json";
  rules_applied: AuditAppliedRule[];
  rules_skipped: AuditSkippedRule[];
}

export interface WriteGovernanceAuditArgs {
  projectRoot: string;
  outputPath: string;
}

export interface WriteGovernanceAuditResult {
  outputPath: string;
  audit: GovernanceAudit;
}

function normalizeSkipReason(reason: string): AuditSkipReason {
  if (reason === "out-of-scope") return "out-of-scope-by-trigger";
  if ((AUDIT_SKIP_REASONS as readonly string[]).includes(reason)) {
    return reason as AuditSkipReason;
  }
  throw new Error(`invalid audit skip reason: ${reason}`);
}

function atomicWriteText(finalPath: string, content: string): void {
  mkdirSync(path.dirname(finalPath), { recursive: true });
  const tmpPath = `${finalPath}.tmp`;
  writeFileSync(tmpPath, content, "utf8");
  renameSync(tmpPath, finalPath);
}

function assertSelectionArrays(record: GovernanceRecord): void {
  if (!Array.isArray(record.selectionResult.selected)) {
    throw new Error("malformed governance state: selectionResult.selected must be an array");
  }
  if (!Array.isArray(record.selectionResult.skipped)) {
    throw new Error("malformed governance state: selectionResult.skipped must be an array");
  }
}

function assertGovernanceOutputPath(projectRoot: string, outputPath: string): void {
  const resolvedOutput = path.resolve(outputPath);
  if (path.basename(resolvedOutput) !== "GOVERNANCE.md") {
    throw new Error("audit artifact output basename must be GOVERNANCE.md");
  }

  const phasesRoot = path.resolve(projectRoot, ".planning", "phases");
  const relative = path.relative(phasesRoot, resolvedOutput);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("audit artifact output path must stay under <projectRoot>/.planning/phases/");
  }
}

export function buildAuditRecord(record: GovernanceRecord): GovernanceAudit {
  assertSelectionArrays(record);
  return {
    schema_version: 1,
    phase: record.phase,
    riskTier: record.riskTier,
    selection_timestamp: record.timestamp,
    generated_from: ".planning/governance/selection-state.json",
    rules_applied: record.selectionResult.selected.map((rule) => ({
      id: rule.id,
      severity: rule.severity,
      summary: rule.summary,
      matchedAxis: rule.matchedAxis,
      matchedValue: rule.matchedValue,
    })),
    rules_skipped: record.selectionResult.skipped.map((rule) => ({
      id: rule.id,
      severity: rule.severity,
      reason: normalizeSkipReason(rule.reason),
      selector_reason: rule.reason,
      ...(rule.detail === undefined ? {} : { detail: rule.detail }),
      ...(rule.scope === undefined ? {} : { scope: rule.scope }),
      ...(rule.sourceFile === undefined ? {} : { sourceFile: rule.sourceFile }),
    })),
  };
}

export function renderGovernanceMarkdown(audit: GovernanceAudit): string {
  return `# Governance Audit\n\n\`\`\`json\n${JSON.stringify(audit, null, 2)}\n\`\`\`\n`;
}

export function writeGovernanceAudit(args: WriteGovernanceAuditArgs): WriteGovernanceAuditResult {
  const record = readSelection(args.projectRoot);
  if (record === null) {
    throw new Error(
      `missing governance selection state at ${selectionStatePath(args.projectRoot)}`,
    );
  }

  const audit = buildAuditRecord(record);
  atomicWriteText(args.outputPath, renderGovernanceMarkdown(audit));
  return { outputPath: args.outputPath, audit };
}

function runDirect(argv: string[]): void {
  if (argv.length !== 2) {
    throw new Error("usage: node dist/governance/audit-artifact.js <projectRoot> <outputPath>");
  }

  const [projectRoot, outputPath] = argv;
  assertGovernanceOutputPath(projectRoot, outputPath);
  writeGovernanceAudit({ projectRoot, outputPath });
}

function isDirectRun(): boolean {
  const invokedPath = process.argv[1];
  return invokedPath !== undefined && path.basename(invokedPath) === "audit-artifact.js";
}

if (isDirectRun()) {
  try {
    runDirect(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`audit artifact: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}
