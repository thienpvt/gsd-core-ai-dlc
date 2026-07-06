import path from "node:path";
import { readSelection, type GovernanceRecord } from "./state-store.js";
import { selectionStatePath } from "./paths.js";
import { atomicWriteFile } from "./atomic-write.js";
import type { Severity, SkipReason, Scope, MatchedAxis } from "../types.js";

export const AUDIT_SKIP_REASONS = [
  "out-of-phase",
  "out-of-scope-by-trigger",
  "superseded",
  "explicitly-waived",
] as const;

const PHASES = ["inception", "construction", "operations", "common"] as const;
const RISK_TIERS = ["critical", "elevated", "baseline"] as const;
const SEVERITIES = ["critical", "high", "medium", "low"] as const;
const SCOPES = ["enterprise", "domain", "project"] as const;
const MATCHED_AXES = ["taskType", "keywords", "paths", "always-in-phase"] as const;

export type AuditSkipReason = (typeof AUDIT_SKIP_REASONS)[number];

export interface AuditAppliedRule {
  id: string;
  severity: Severity;
  summary: string;
  matchedAxis: MatchedAxis;
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
  atomicWriteFile(finalPath, content);
}

function assertRecordObject(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`malformed governance state: ${field} must be an object`);
  }
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`malformed governance state: ${field} must be a non-empty string`);
  }
}

function assertOneOf<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): asserts value is T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(
      `malformed governance state: ${field} must be one of ${allowed.join(", ")}`,
    );
  }
}

function assertTimestamp(value: unknown, field: string): asserts value is string {
  assertString(value, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`malformed governance state: ${field} must be an ISO timestamp`);
  }
}

function assertSelectionArrays(record: GovernanceRecord): void {
  if (!Array.isArray(record.selectionResult.selected)) {
    throw new Error("malformed governance state: selectionResult.selected must be an array");
  }
  if (!Array.isArray(record.selectionResult.skipped)) {
    throw new Error("malformed governance state: selectionResult.skipped must be an array");
  }

  record.selectionResult.selected.forEach((rule, index) => {
    assertRecordObject(rule, `selectionResult.selected[${index}]`);
    assertString(rule.id, `selectionResult.selected[${index}].id`);
    assertOneOf(rule.severity, `selectionResult.selected[${index}].severity`, SEVERITIES);
    assertString(rule.summary, `selectionResult.selected[${index}].summary`);
    assertOneOf(rule.matchedAxis, `selectionResult.selected[${index}].matchedAxis`, MATCHED_AXES);
    assertString(rule.matchedValue, `selectionResult.selected[${index}].matchedValue`);
  });

  record.selectionResult.skipped.forEach((rule, index) => {
    assertRecordObject(rule, `selectionResult.skipped[${index}]`);
    assertString(rule.id, `selectionResult.skipped[${index}].id`);
    assertOneOf(rule.severity, `selectionResult.skipped[${index}].severity`, SEVERITIES);
    assertString(rule.reason, `selectionResult.skipped[${index}].reason`);
    if (rule.detail !== undefined) {
      assertString(rule.detail, `selectionResult.skipped[${index}].detail`);
    }
    if (rule.scope !== undefined) {
      assertOneOf(rule.scope, `selectionResult.skipped[${index}].scope`, SCOPES);
    }
    if (rule.sourceFile !== undefined) {
      assertString(rule.sourceFile, `selectionResult.skipped[${index}].sourceFile`);
    }
  });
}

function assertGovernanceRecord(record: GovernanceRecord): void {
  assertOneOf(record.phase, "phase", PHASES);
  assertOneOf(record.riskTier, "riskTier", RISK_TIERS);
  assertTimestamp(record.timestamp, "timestamp");
  assertSelectionArrays(record);
}

function assertGovernanceOutputPath(projectRoot: string, outputPath: string): void {
  const resolvedOutput = path.resolve(outputPath);
  if (path.basename(resolvedOutput) !== "GOVERNANCE.md") {
    throw new Error("audit artifact output basename must be GOVERNANCE.md");
  }

  const phasesRoot = path.resolve(projectRoot, ".planning", "phases");
  const outputDir = path.dirname(resolvedOutput);
  const phaseDirName = path.basename(outputDir);
  if (
    path.dirname(outputDir) !== phasesRoot ||
    !/^\d{2}(?:\.\d+)?-/.test(phaseDirName)
  ) {
    throw new Error(
      "audit artifact output path must be <projectRoot>/.planning/phases/{NN}-*/GOVERNANCE.md",
    );
  }
}

export function buildAuditRecord(record: GovernanceRecord): GovernanceAudit {
  assertGovernanceRecord(record);
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
  assertGovernanceOutputPath(args.projectRoot, args.outputPath);
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
