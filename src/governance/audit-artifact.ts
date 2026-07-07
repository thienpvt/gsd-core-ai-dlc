import path from "node:path";
import { readSelection, type GovernanceRecord } from "./state-store.js";
import { selectionStatePath } from "./paths.js";
import { atomicWriteFile } from "./atomic-write.js";
import type {
  ApprovalSummary,
  RemainingRiskEntry,
  RequirementsCoveredEntry,
} from "./audit-enrich.js";
import type { TestEvidenceSummary } from "./test-evidence.js";
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

/**
 * Enrichment payload for the optional v2 fields (D-09). The hook (Plan 04)
 * prepares these from audit-enrich.ts helpers + the approval store, then passes
 * them to {@link buildAuditRecord}. Each field is spread conditionally — absent
 * enrichment produces byte-identical output to v1 for the v1 subset (Pitfall 2).
 */
export interface AuditEnrichment {
  requirements_covered?: RequirementsCoveredEntry[];
  tests_executed?: TestEvidenceSummary;
  remaining_risks?: RemainingRiskEntry[];
  approvals?: ApprovalSummary[];
}

export interface GovernanceAudit {
  schema_version: 2;
  phase: GovernanceRecord["phase"];
  riskTier: GovernanceRecord["riskTier"];
  selection_timestamp: string;
  generated_from: ".planning/governance/selection-state.json";
  rules_applied: AuditAppliedRule[];
  rules_skipped: AuditSkippedRule[];
  // v2 optional enrichment (D-09). Appended AFTER the v1 required 7 to preserve
  // V8 insertion-order and byte-stable regeneration of the v1 subset (Pitfall 2).
  requirements_covered?: RequirementsCoveredEntry[];
  tests_executed?: TestEvidenceSummary;
  remaining_risks?: RemainingRiskEntry[];
  approvals?: ApprovalSummary[];
}

export interface WriteGovernanceAuditArgs {
  projectRoot: string;
  outputPath: string;
}

export interface WriteGovernanceAuditResult {
  outputPath: string;
  audit: GovernanceAudit;
}

// TD-04: persisted selector_reason values are validated per-element in
// assertSelectionArrays before this runs; the mapping here is total.
function normalizeSkipReason(reason: string): AuditSkipReason {
  if (reason === "out-of-scope") return "out-of-scope-by-trigger";
  return reason as AuditSkipReason;
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

// TD-04: selector_reason = the raw SkipReason persisted from selection
// (selector provenance); normalizeSkipReason maps it to the public AuditSkipReason
// (out-of-scope -> out-of-scope-by-trigger). assertSelectionArrays validates the
// persisted shape per-element so a bad value fails there with one clear message,
// before normalizeSkipReason ever sees it — the check below is dead defense for
// any future direct caller and kept ponytail: short, one message, no second shape.
const SELECTOR_REASONS = [
  "out-of-phase",
  "out-of-scope",
  "out-of-scope-by-trigger",
  "superseded",
] as const;

// TD-01: strict ISO 8601 — the canonical audit-trail shape. Date.parse alone
// accepts "2026/07/06" and "2026-07-06", letting malformed timestamps cross the
// persisted-state -> audit-record trust boundary (breaks AUDIT-02 machine-checkable).
const ISO_8601_STRICT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Assert `value` is a strict ISO 8601 timestamp of the form
 * `YYYY-MM-DDTHH:mm:ss.sssZ` (the canonical audit-trail shape). Rejects
 * date-only, slash-separated, and timezone-less variants that `Date.parse`
 * silently accepts. TD-01.
 */
function assertTimestamp(value: unknown, field: string): asserts value is string {
  assertString(value, field);
  if (!ISO_8601_STRICT.test(value)) {
    throw new Error(
      `malformed governance state: ${field} must be an ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ss.sssZ)`,
    );
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
    // TD-04: validate the raw SkipReason (persisted selector provenance) per-element
    // so a garbage value fails here with one clear message naming selector_reason,
    // before normalizeSkipReason ever maps it to the audit enum.
    assertOneOf(
      rule.reason,
      `selectionResult.skipped[${index}].selector_reason`,
      SELECTOR_REASONS,
    );
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

export function buildAuditRecord(record: GovernanceRecord, enrichment?: AuditEnrichment): GovernanceAudit {
  assertGovernanceRecord(record);
  return {
    schema_version: 2,
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
    // D-09 v2 optional fields: spread conditionally — absent enrichment yields
    // byte-identical output to v1 for the v1 subset (Pitfall 2, string-compare test).
    ...(enrichment?.requirements_covered ? { requirements_covered: enrichment.requirements_covered } : {}),
    ...(enrichment?.tests_executed ? { tests_executed: enrichment.tests_executed } : {}),
    ...(enrichment?.remaining_risks ? { remaining_risks: enrichment.remaining_risks } : {}),
    ...(enrichment?.approvals ? { approvals: enrichment.approvals } : {}),
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
  // TD-07: return the resolved absolute path actually written, not the input.
  return { outputPath: path.resolve(args.outputPath), audit };
}

function runDirect(argv: string[]): void {
  if (argv.length !== 2) {
    throw new Error("usage: node dist/governance/audit-artifact.js <projectRoot> <outputPath>");
  }

  const [projectRoot, outputPath] = argv;
  writeGovernanceAudit({ projectRoot, outputPath });
}

// TD-05: match THIS compiled dist entry specifically, not any file named
// audit-artifact.js elsewhere on the PATH. __filename is the runtime path of
// this module under CJS, so a same-basename sibling elsewhere no longer trips
// runDirect.
function isDirectRun(): boolean {
  const invokedPath = process.argv[1];
  if (invokedPath === undefined) return false;
  return path.resolve(invokedPath) === __filename;
}

if (isDirectRun()) {
  try {
    runDirect(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`audit artifact: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}
