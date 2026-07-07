import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { readSelection, type GovernanceRecord } from "./state-store.js";
import { selectionStatePath } from "./paths.js";
import { atomicWriteFile } from "./atomic-write.js";
import {
  extractRequirementsCovered,
  collectRemainingRisks,
  summarizeApprovals,
  type ApprovalSummary,
  type RemainingRiskEntry,
  type RequirementsCoveredEntry,
} from "./audit-enrich.js";
import { readTestEvidence, type TestEvidenceSummary } from "./test-evidence.js";
import { readApproval } from "./approval-store.js";
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

  // WR-01: wire enrichment from persisted state so AUDIT-03/04/05/06 populate
  // in production GOVERNANCE.md. Phase number + phase dir come from the output
  // path (already validated by assertGovernanceOutputPath). When no enrichment
  // inputs exist, buildEnrichmentFromPersistedState returns {} and buildAuditRecord
  // produces byte-identical v1 output via its conditional spreads (Pitfall 2).
  const resolvedOutput = path.resolve(args.outputPath);
  const phaseDirPath = path.dirname(resolvedOutput);
  const phaseDirName = path.basename(phaseDirPath);
  const phaseNumber = phaseDirName.slice(0, 2);
  const enrichment = buildEnrichmentFromPersistedState(
    args.projectRoot,
    phaseNumber,
    phaseDirPath,
  );

  const audit = buildAuditRecord(record, enrichment);
  atomicWriteText(args.outputPath, renderGovernanceMarkdown(audit));
  // TD-07: return the resolved absolute path actually written, not the input.
  return { outputPath: path.resolve(args.outputPath), audit };
}

/**
 * Read a file if it exists; return null on absence or read error. Enrichment
 * inputs are optional — absence is the legitimate pre-verify/pre-ship state and
 * must NOT throw (the audit writer stays robust to partial state).
 */
function readOptionalFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * WR-01: build {@link AuditEnrichment} from persisted governance state so the
 * optional v2 fields populate in production GOVERNANCE.md. Each field is set
 * ONLY when its source exists and yields data — when no inputs exist, every
 * field stays absent and the returned object is `{}`, preserving v1 byte-stable
 * output via buildAuditRecord's conditional spreads (Pitfall 2).
 *
 * Sources:
 *   - AUDIT-03 requirements_covered: `.planning/REQUIREMENTS.md` Traceability
 *     table, filtered to this phase's REQ-IDs (extractRequirementsCovered).
 *   - AUDIT-04 tests_executed: persisted test-evidence store
 *     (`.planning/governance/tests/{NN}.json`).
 *   - AUDIT-05 remaining_risks: phase-dir `VERIFICATION.md` + `CONTEXT.md`
 *     (collectRemainingRisks). Populated only when at least one source exists.
 *   - AUDIT-06 approvals: persisted approval store
 *     (`.planning/governance/approvals/{NN}.json`). The none-required
 *     placeholder is suppressed when no approval record exists (byte-stability).
 */
function buildEnrichmentFromPersistedState(
  projectRoot: string,
  phaseNumber: string,
  phaseDirPath: string,
): AuditEnrichment {
  const enrichment: AuditEnrichment = {};

  // AUDIT-03: requirements covered (REQUIREMENTS.md is global under .planning/).
  const requirementsMd = readOptionalFile(
    path.join(projectRoot, ".planning", "REQUIREMENTS.md"),
  );
  if (requirementsMd !== null) {
    const reqs = extractRequirementsCovered(requirementsMd, phaseNumber);
    if (reqs.length > 0) {
      enrichment.requirements_covered = reqs;
    }
  }

  // AUDIT-04: tests executed (persisted test-evidence store).
  const testEvidence = readTestEvidence(projectRoot, phaseNumber);
  if (testEvidence !== null) {
    enrichment.tests_executed = testEvidence.summary;
  }

  // AUDIT-05: remaining risks (phase-dir VERIFICATION.md + CONTEXT.md). Only
  // populate when at least one source file exists — calling collectRemainingRisks
  // on absent inputs would emit a none-identified row and break byte-stability.
  const verificationMd = readOptionalFile(path.join(phaseDirPath, "VERIFICATION.md"));
  const contextMd =
    readOptionalFile(path.join(phaseDirPath, "CONTEXT.md")) ??
    readOptionalFile(path.join(phaseDirPath, `${phaseNumber}-CONTEXT.md`));
  if (verificationMd !== null || contextMd !== null) {
    enrichment.remaining_risks = collectRemainingRisks(
      verificationMd ?? "",
      contextMd ?? "",
    );
  }

  // AUDIT-06: approvals (persisted approval store). Suppress the none-required
  // placeholder when no approval record exists (byte-stability).
  const approval = readApproval(projectRoot, phaseNumber);
  if (approval !== null) {
    enrichment.approvals = summarizeApprovals([approval]);
  }

  return enrichment;
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
