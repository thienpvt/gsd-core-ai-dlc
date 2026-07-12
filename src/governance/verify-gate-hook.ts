import { isDeepStrictEqual } from "node:util";
import { ADAPTERS, type GateAdapter } from "../enforcement/adapters.js";
import { createCoverageAdapter } from "../enforcement/coverage-report.js";
import { runAdapter } from "../enforcement/run-adapter.js";
import type { GateRequest, GateResult } from "../enforcement/types.js";
import {
  readGateEvidence,
  writeGateEvidence,
  type GateEvidence,
} from "./gate-evidence-store.js";
import { gateEvidencePath, selectionStatePath } from "./paths.js";
import { readSelection, type GovernanceRecord } from "./state-store.js";
import { readGovernanceConfig } from "./config.js";


/** Binding rule that forces real coverage-report evaluation. */
const BINDING_RULE_ID = "java-spring-unit-line-coverage";
/** Forced adapter name when the binding rule is selected. */
const COVERAGE_ADAPTER_NAME = "coverage-report";
/** Canonical plan gate producer identity. */
const PLAN_SOURCE = "aidlc-governance-plan";

export interface VerifyGateHookArgs {
  projectRoot: string;
  phaseNumber: string;
  adapterName?: string;
  adapters?: ReadonlyMap<string, GateAdapter>;
}

export interface RuleGateStatus {
  ruleId: string;
  status: "pass" | "fail" | "waived";
  findingIds: string[];
}

export interface VerifyGateHookResult {
  evidence: GateEvidence;
  ruleStatuses: RuleGateStatus[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findingMatchesRule(findingId: string, ruleId: string): boolean {
  if (findingId === ruleId) return true;
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(ruleId)}($|[^A-Za-z0-9])`).test(
    findingId,
  );
}

export function deriveRuleGateStatuses(
  request: GateRequest,
  result: GateResult,
): RuleGateStatus[] {
  return request.rules.map((rule) => {
    const findingIds = result.findings
      .filter((finding) => findingMatchesRule(finding.id, rule.id))
      .map((finding) => finding.id);
    return {
      ruleId: rule.id,
      status: findingIds.length > 0 ? "fail" : result.status === "waived" ? "waived" : "pass",
      findingIds,
    };
  });
}

function bindingRule(
  rules: GateRequest["rules"],
  producer: "discuss" | "plan",
): GateRequest["rules"][number] | undefined {
  const matches = rules.filter((rule) => rule.id === BINDING_RULE_ID);
  if (matches.length > 1) {
    throw new Error(
      `verifyGateHook: duplicate binding rule '${BINDING_RULE_ID}' in ${producer} selection`,
    );
  }
  return matches[0];
}

/**
 * Strict plan/discuss correlation before any adapter evaluation.
 * Plan evidence is mandatory for every verify path (CR-01/CR-02).
 * Preserves Phase 8 D-03: plan evidence is separate from selection-state.
 */
export function assertPlanEvidenceCorrelated(
  projectRoot: string,
  phaseNumber: string,
  record: GovernanceRecord,
  planEvidence: GateEvidence | null,
): asserts planEvidence is GateEvidence {
  if (planEvidence === null) {
    throw new Error(
      `verifyGateHook: missing authoritative plan evidence at ${gateEvidencePath(projectRoot, phaseNumber, "plan")}; run plan:pre before verify`,
    );
  }

  if (planEvidence.result.status === "fail") {
    throw new Error(
      `verifyGateHook: plan evidence status is fail; resolve plan findings before verify`,
    );
  }
  if (
    planEvidence.result.status !== "pass" &&
    planEvidence.result.status !== "waived"
  ) {
    throw new Error(
      `verifyGateHook: plan evidence status must be pass or waived, got '${planEvidence.result.status}'`,
    );
  }

  if (planEvidence.metadata.source !== PLAN_SOURCE) {
    throw new Error(
      `verifyGateHook: plan evidence source must be '${PLAN_SOURCE}', got '${planEvidence.metadata.source}'`,
    );
  }
  if (planEvidence.result.evaluatedBy !== PLAN_SOURCE) {
    throw new Error(
      `verifyGateHook: plan evidence evaluatedBy must be '${PLAN_SOURCE}', got '${planEvidence.result.evaluatedBy}'`,
    );
  }

  if (planEvidence.request.phase !== record.phase) {
    throw new Error(
      `verifyGateHook: plan evidence phase '${planEvidence.request.phase}' does not match discuss phase '${record.phase}'`,
    );
  }

  const discussBinding = bindingRule(record.selectionResult.selected, "discuss");
  const planBinding = bindingRule(planEvidence.request.rules, "plan");
  if ((discussBinding === undefined) !== (planBinding === undefined)) {
    throw new Error(
      `verifyGateHook: binding rule selection disagreement for '${BINDING_RULE_ID}'; rerun discuss and plan before verify`,
    );
  }
  if (
    discussBinding !== undefined &&
    planBinding !== undefined &&
    !isDeepStrictEqual(planBinding, discussBinding)
  ) {
    throw new Error(
      `verifyGateHook: binding rule metadata does not match discuss selection for '${BINDING_RULE_ID}'; rerun discuss and plan before verify`,
    );
  }

  const discussTs = Date.parse(record.timestamp);
  const planRequested = Date.parse(planEvidence.request.requestedAt);
  const planEvaluated = Date.parse(planEvidence.result.evaluatedAt);
  const planWritten = Date.parse(planEvidence.metadata.writtenAt);
  const futureLimit = Date.now() + 60_000;
  if (
    Number.isNaN(discussTs) ||
    Number.isNaN(planRequested) ||
    Number.isNaN(planEvaluated) ||
    Number.isNaN(planWritten)
  ) {
    throw new Error(
      `verifyGateHook: plan/discuss timestamps must be valid ISO-8601 values`,
    );
  }
  if (
    discussTs > planRequested ||
    planRequested > planEvaluated ||
    planEvaluated > planWritten ||
    planWritten > futureLimit
  ) {
    throw new Error(
      `verifyGateHook: plan evidence timestamp causality must satisfy discuss <= requested <= evaluated <= written <= now + 60 seconds`,
    );
  }
}

export async function verifyGateHook(
  args: VerifyGateHookArgs,
): Promise<VerifyGateHookResult> {
  const record = readSelection(args.projectRoot);
  if (record === null) {
    throw new Error(
      `verifyGateHook: missing governance selection state at ${selectionStatePath(args.projectRoot)}`,
    );
  }

  const bindingSelected = record.selectionResult.selected.some(
    (rule) => rule.id === BINDING_RULE_ID,
  );
  const planEvidence = readGateEvidence(args.projectRoot, args.phaseNumber, "plan");
  // Fail closed before adapter selection when plan evidence is missing/invalid.
  assertPlanEvidenceCorrelated(
    args.projectRoot,
    args.phaseNumber,
    record,
    planEvidence,
  );

  let adapter: GateAdapter;
  if (bindingSelected) {
    if (
      args.adapterName !== undefined &&
      args.adapterName !== COVERAGE_ADAPTER_NAME
    ) {
      throw new Error(
        `verifyGateHook: adapter bypass rejected while binding rule '${BINDING_RULE_ID}' is selected; required adapter '${COVERAGE_ADAPTER_NAME}', got '${args.adapterName}'`,
      );
    }
    const injected = args.adapters?.get(COVERAGE_ADAPTER_NAME);
    if (injected !== undefined) {
      adapter = injected;
    } else {
      const { coverageReportPath } = readGovernanceConfig(args.projectRoot);
      adapter = createCoverageAdapter({
        projectRoot: args.projectRoot,
        reportPath: coverageReportPath,
      });
    }
  } else {
    const adapterName = args.adapterName ?? "generic-exit-ci";
    const lookedUp = (args.adapters ?? ADAPTERS).get(adapterName);
    if (!lookedUp) {
      throw new Error(`verifyGateHook: missing adapter '${adapterName}'`);
    }
    adapter = lookedUp;
  }

  const requestedAt = new Date().toISOString();
  const request: GateRequest = {
    gateId: "verify",
    phase: record.phase,
    taskSignal: record.taskSignal,
    rules: record.selectionResult.selected,
    requestedAt,
  };
  const result = await runAdapter(adapter, request);
  const ruleStatuses = deriveRuleGateStatuses(request, result);
  const evidence: GateEvidence = {
    request,
    result,
    metadata: {
      phase: args.phaseNumber,
      source: "aidlc-governance-verify",
      writtenAt: new Date().toISOString(),
    },
  };
  writeGateEvidence(args.projectRoot, args.phaseNumber, evidence);
  return { evidence, ruleStatuses };
}

async function runDirect(argv: string[]): Promise<void> {
  if (argv.length !== 2) {
    throw new Error("usage: verify-gate-hook <projectRoot> <phaseNumber>");
  }
  const [projectRoot, phaseNumber] = argv;
  const result = await verifyGateHook({ projectRoot, phaseNumber });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.evidence.result.status === "fail") {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runDirect(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
}
