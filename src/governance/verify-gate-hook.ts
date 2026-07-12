import { ADAPTERS, type GateAdapter } from "../enforcement/adapters.js";
import { createCoverageAdapter } from "../enforcement/coverage-report.js";
import { runAdapter } from "../enforcement/run-adapter.js";
import type { GateRequest, GateResult } from "../enforcement/types.js";
import {
  writeGateEvidence,
  type GateEvidence,
} from "./gate-evidence-store.js";
import { selectionStatePath } from "./paths.js";
import { readSelection } from "./state-store.js";
import { readGovernanceConfig } from "./config.js";


/** Binding rule that forces real coverage-report evaluation. */
const BINDING_RULE_ID = "java-spring-unit-line-coverage";
/** Forced adapter name when the binding rule is selected. */
const COVERAGE_ADAPTER_NAME = "coverage-report";

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
}

if (require.main === module) {
  runDirect(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
}
