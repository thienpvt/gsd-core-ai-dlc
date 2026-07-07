import type { GateId } from "../enforcement/types.js";
import {
  readGateEvidence,
  writeGateEvidence,
  type GateEvidence,
} from "./gate-evidence-store.js";
import {
  readApproval,
  writeApproval,
  type ApprovalRecord,
} from "./approval-store.js";
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

/**
 * D-07: write a pending approval request for the ship gate itself.
 *
 * decidedBy/decidedAt are intentionally ABSENT (not empty string) so a human
 * must populate them out-of-band to resolve. The model cannot self-approve.
 */
function writePendingApproval(
  projectRoot: string,
  phaseNumber: string,
  phase: GateEvidence["request"]["phase"],
): void {
  const approval: ApprovalRecord = {
    approvalId: `ship-${phaseNumber}`,
    phase,
    gateId: "ship",
    artifactPath: gateEvidencePath(projectRoot, phaseNumber, "ship"),
    requestedBy: "aidlc-governance-ship",
    requestedAt: new Date().toISOString(),
    decision: "pending",
    // decidedBy/decidedAt intentionally omitted — D-07 anti-auto-approve
  };
  writeApproval(projectRoot, phaseNumber, approval);
}

/**
 * D-07: read the per-phase approval; if none exists, write a pending request
 * (approvalId `ship-{phaseNumber}`) for the ship gate and throw to surface the
 * human-resolution gate. Mirrors readRequiredEvidence's fail-closed pattern.
 */
function readApprovalOrFail(
  projectRoot: string,
  phaseNumber: string,
  phase: GateEvidence["request"]["phase"],
): ApprovalRecord {
  const approval = readApproval(projectRoot, phaseNumber);
  if (approval === null) {
    writePendingApproval(projectRoot, phaseNumber, phase);
    throw new Error(
      `ship gate: ${phaseNumber} pending approval created — human resolution required`,
    );
  }
  return approval;
}

/**
 * D-08: fail closed on pending or rejected approvals (mirrors GATE-05
 * assertNonBlocking). Approved/waived proceed.
 */
function assertNoBlockingApprovals(approval: ApprovalRecord): void {
  if (approval.decision === "pending" || approval.decision === "rejected") {
    throw new Error(
      `ship gate: approval ${approval.approvalId} is ${approval.decision} — human resolution required`,
    );
  }
}

export function shipGateHook(args: ShipGateHookArgs): ShipGateHookResult {
  const planEvidence = readRequiredEvidence(args.projectRoot, args.phaseNumber, "plan");
  const verifyEvidence = readRequiredEvidence(args.projectRoot, args.phaseNumber, "verify");
  assertNonBlocking(planEvidence, "plan");
  assertNonBlocking(verifyEvidence, "verify");

  const approval = readApprovalOrFail(
    args.projectRoot,
    args.phaseNumber,
    verifyEvidence.request.phase,
  );
  assertNoBlockingApprovals(approval);

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
