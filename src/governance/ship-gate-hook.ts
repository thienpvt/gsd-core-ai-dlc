import { mkdirSync, openSync, closeSync, writeFileSync, constants } from "node:fs";
import path from "node:path";
import type { GateId } from "../enforcement/types.js";
import {
  readGateEvidence,
  writeGateEvidence,
  type GateEvidence,
} from "./gate-evidence-store.js";
import {
  readApproval,
  type ApprovalRecord,
} from "./approval-store.js";
import {
  readEvalEvidence,
  type EvalReport,
} from "./eval-evidence.js";
import { approvalPath, gateEvidencePath, evalEvidencePath } from "./paths.js";

const { O_CREAT, O_EXCL, O_WRONLY } = constants;

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
 * D-07: create a pending approval request for the ship gate IF (and only if) no
 * approval file exists yet. Uses O_CREAT|O_EXCL so the OS atomically rejects the
 * open if a human approver wrote the file in the gap between our read-null and
 * this create (WR-02 TOCTOU). Returns true when a new pending was created, false
 * when the file already exists (another caller or a human approver landed first).
 *
 * decidedBy/decidedAt are intentionally ABSENT (not empty string) so a human must
 * populate them out-of-band to resolve. The model cannot self-approve.
 */
function createPendingApprovalIfAbsent(
  projectRoot: string,
  phaseNumber: string,
  phase: GateEvidence["request"]["phase"],
): boolean {
  const filePath = approvalPath(projectRoot, phaseNumber);
  mkdirSync(path.dirname(filePath), { recursive: true });
  const pending: ApprovalRecord = {
    approvalId: `ship-${phaseNumber}`,
    phase,
    gateId: "ship",
    artifactPath: gateEvidencePath(projectRoot, phaseNumber, "ship"),
    requestedBy: "aidlc-governance-ship",
    requestedAt: new Date().toISOString(),
    decision: "pending",
    // decidedBy/decidedAt intentionally omitted — D-07 anti-auto-approve
  };
  // O_EXCL fails with EEXIST if the file already exists — no overwrite. This
  // closes the read-null → write-pending TOCTOU window (WR-02): a human approval
  // written between our read and this create is preserved, not clobbered.
  let fd: number;
  try {
    fd = openSync(filePath, O_WRONLY | O_CREAT | O_EXCL);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  }
  try {
    writeFileSync(fd, JSON.stringify(pending, null, 2));
  } finally {
    closeSync(fd);
  }
  return true;
}

/**
 * D-07: read the per-phase approval; if none exists, atomically create a pending
 * request (approvalId `ship-{phaseNumber}`) for the ship gate and throw to
 * surface the human-resolution gate. The create uses O_CREAT|O_EXCL (WR-02:
 * closes the read-then-write TOCTOU — a human approval landing between our
 * read-null and the create is preserved, not overwritten). After a successful
 * create, re-read to return the persisted record (validated by readApproval).
 */
function readApprovalOrFail(
  projectRoot: string,
  phaseNumber: string,
  phase: GateEvidence["request"]["phase"],
): ApprovalRecord {
  const approval = readApproval(projectRoot, phaseNumber);
  if (approval === null) {
    const created = createPendingApprovalIfAbsent(projectRoot, phaseNumber, phase);
    if (created) {
      throw new Error(
        `ship gate: ${phaseNumber} pending approval created — human resolution required`,
      );
    }
    // WR-02: a human approver (or a concurrent ship-gate run) wrote the file in
    // the gap between our read-null and the O_EXCL create. Re-read to pick up
    // whatever landed — readApproval validates it. If it is pending/rejected,
    // assertNoBlockingApprovals below surfaces the human-resolution gate. If it
    // is approved/waived, we proceed without clobbering the human's decision.
    const reread = readApproval(projectRoot, phaseNumber);
    if (reread === null) {
      // Extremely narrow: the file vanished between EEXIST and re-read. Fail
      // closed — surface as an inconsistent state rather than silently looping.
      throw new Error(
        `ship gate: ${phaseNumber} approval vanished between create-if-absent and re-read`,
      );
    }
    return reread;
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

/**
 * D-07: read the per-phase eval-evidence record; throw fail-closed when absent.
 * Clone of readRequiredEvidence shape (GATE-05 prior-evidence pattern). Only
 * invoked for phases >= "10" (forward-scoping guard below).
 */
function readEvalOrFail(projectRoot: string, phaseNumber: string): EvalReport {
  const report = readEvalEvidence(projectRoot, phaseNumber);
  if (report === null) {
    throw new Error(
      `ship gate: missing eval evidence ${evalEvidencePath(projectRoot, phaseNumber)}`,
    );
  }
  return report;
}

/**
 * D-05: enforce the critical-recall floor at the ship boundary. A persisted
 * failed eval report (criticalRecall < 1.0) blocks ship. The value is re-read
 * from the persisted `aggregate.recallBySeverity.critical` field — even a
 * forged record cannot raise the floor above what `aggregate` (severity sourced
 * from the index at write time) produced. Defense-in-depth with Plan 01's
 * exit-2 + failed-report-persisted enforcement.
 */
function assertNoFailedEval(report: EvalReport): void {
  if (report.aggregate.recallBySeverity.critical < 1.0) {
    const misses = report.criticalMisses
      .map((m) => `${m.case}: ${m.expectedNotSelected.join(", ")}`)
      .join("; ");
    throw new Error(
      `ship gate: eval evidence failed - criticalRecall=${report.aggregate.recallBySeverity.critical} (${misses})`,
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

  // RESEARCH Open Q2 resolution — forward-scoping guard. Only phases >= "10"
  // are eval-checked. Legacy phases 06-09 shipped without eval evidence and
  // are NOT retroactively failed. String compare is safe because PHASE_NUMBER_RE
  // enforces 2-digit zero-padded phase numbers, so lexical order matches numeric
  // order for the "10" threshold. MUST run before writeGateEvidence (fail-closed
  // ordering — no ship evidence on blocking condition).
  if (args.phaseNumber >= "10") {
    const evalReport = readEvalOrFail(args.projectRoot, args.phaseNumber);
    assertNoFailedEval(evalReport);
  }

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
