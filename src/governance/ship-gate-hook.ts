import type { GateId } from "../enforcement/types.js";
import {
  readGateEvidence,
  writeGateEvidence,
  type GateEvidence,
} from "./gate-evidence-store.js";
import { gateEvidencePath } from "./paths.js";

export interface ShipGateHookArgs {
  projectRoot: string;
  phaseNumber: string;
}

export interface ShipGateHookResult {
  evidence: GateEvidence;
}

function readRequiredEvidence(
  projectRoot: string,
  phaseNumber: string,
  gateId: GateId,
): GateEvidence {
  const evidence = readGateEvidence(projectRoot, phaseNumber, gateId);
  if (evidence === null) {
    throw new Error(
      `ship gate: missing governance evidence ${gateEvidencePath(projectRoot, phaseNumber, gateId)}`,
    );
  }
  return evidence;
}

function findingDetails(evidence: GateEvidence): string {
  if (evidence.result.findings.length === 0) return "no findings";
  return evidence.result.findings
    .map((finding) => `${finding.id}: ${finding.message}`)
    .join("; ");
}

function assertNonBlocking(evidence: GateEvidence, gateId: "plan" | "verify"): void {
  if (evidence.result.status === "fail") {
    throw new Error(
      `ship gate: ${gateId} governance evidence failed - ${findingDetails(evidence)}`,
    );
  }
}

export function shipGateHook(args: ShipGateHookArgs): ShipGateHookResult {
  const planEvidence = readRequiredEvidence(args.projectRoot, args.phaseNumber, "plan");
  const verifyEvidence = readRequiredEvidence(args.projectRoot, args.phaseNumber, "verify");
  assertNonBlocking(planEvidence, "plan");
  assertNonBlocking(verifyEvidence, "verify");

  const requestedAt = new Date().toISOString();
  const evidence: GateEvidence = {
    request: {
      gateId: "ship",
      phase: verifyEvidence.request.phase,
      taskSignal: verifyEvidence.request.taskSignal,
      rules: verifyEvidence.request.rules,
      requestedAt,
    },
    result: {
      gateId: "ship",
      status: "pass",
      findings: [],
      evaluatedBy: "aidlc-governance-ship",
      evaluatedAt: new Date().toISOString(),
    },
    metadata: {
      phase: args.phaseNumber,
      source: "aidlc-governance-ship",
      writtenAt: new Date().toISOString(),
    },
  };

  writeGateEvidence(args.projectRoot, args.phaseNumber, evidence);
  return { evidence };
}

function runDirect(argv: string[]): void {
  if (argv.length !== 2) {
    throw new Error("usage: ship-gate-hook <projectRoot> <phaseNumber>");
  }
  const [projectRoot, phaseNumber] = argv;
  const result = shipGateHook({ projectRoot, phaseNumber });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  try {
    runDirect(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}
