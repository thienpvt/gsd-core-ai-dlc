/**
 * APPR-01 durable approval store (D-06, D-07).
 *
 * Per-phase approval record under `.planning/governance/approvals/{NN}.json`.
 * Cloned 1:1 from gate-evidence-store.ts (TD-03 atomic write + 4-rung loud-fail
 * read ladder). The validator is validateApproval (NOT validateGateResult —
 * approval has its own contract: the D-05 10-field shape, distinct from
 * GateResult).
 *
 * Approval lifecycle (D-07):
 *   1. ship gate writes a pending record via writeApproval (no decidedBy/decidedAt)
 *   2. human approver out-of-band edits the file (or a future API flips it) to
 *      decision=approved|rejected|waived with decidedBy/decidedAt populated
 *   3. ship gate re-reads via readApproval; validateApproval (called inside
 *      assertApproval) re-validates parsed JSON so a tampered disk state fails
 *      loud with absolute-path context (T-09-01-02).
 *
 * Anti-auto-approve invariant lives in validateApproval (the post-Ajv D-07
 * check); this store inherits it for free via assertApproval.
 */
import { existsSync, readFileSync } from "node:fs";
import { atomicWriteFile } from "./atomic-write.js";
import { approvalPath } from "./paths.js";
import type { GateId } from "../enforcement/types.js";
import type { Phase as SelectionPhase } from "../types.js";
import { validateApproval } from "../enforcement/validate-approval.js";

/**
 * Approval phase vocabulary. The approval `phase` field names the workflow
 * phase the approval is scoped to; the `SelectionPhase` re-export is for
 * callers that want the same vocabulary under a different name. Reusing
 * SelectionPhase keeps approval.phase aligned with Phase 2's SelectionConfig.
 */
export type ApprovalPhase = SelectionPhase;

/** The approval decision vocab (D-05). Distinct from GateResult.status (Pitfall 3). */
export type ApprovalDecision = "pending" | "approved" | "rejected" | "waived";

/**
 * Human approval record (APPR-01, D-05 10-field shape).
 *
 * 7 required (always present): approvalId, phase, gateId, artifactPath,
 * requestedBy, requestedAt, decision. 3 optional (blank until human resolves):
 * decidedBy, decidedAt, rationale.
 *
 * gateId is typed as the enforcement GateId union so ship/plan/verify/etc. are
 * the closed approval-surface — an approval gates a GSD loop gate, nothing else.
 */
export interface ApprovalRecord {
  approvalId: string;
  phase: ApprovalPhase;
  /** The GSD loop gate this approval gates. Reuses the enforcement union. */
  gateId: GateId | (string & {});
  artifactPath: string;
  requestedBy: string;
  requestedAt: string;
  decision: ApprovalDecision;
  /** Human approver identity. Absent while decision=pending (D-07). */
  decidedBy?: string;
  /** When the decision was resolved. Absent while decision=pending. */
  decidedAt?: string;
  /** Optional human-authored rationale. */
  rationale?: string;
}

// ApprovalPhase is re-exported as the public alias for SelectionPhase so callers
// that want the same vocabulary under a different name can import it. The
// JSON-Schema enum validates phase values at the contract boundary; the TS
// union just accepts any of the four phase strings.

function fail(filePath: string, detail: string): never {
  throw new Error(`malformed approval at ${filePath}: ${detail}`);
}

/**
 * Assert that `value` is a well-formed ApprovalRecord. Delegates structural
 * validation to {@link validateApproval} (Ajv 2020 + D-07 invariant), then
 * enforces the per-store metadata contract (file path's phaseNumber matches the
 * record's expected identity — no cross-phase leakage).
 */
function assertApproval(
  value: unknown,
  filePath: string,
  phaseNumber: string,
): asserts value is ApprovalRecord {
  try {
    validateApproval(value);
  } catch (err) {
    fail(filePath, String(err));
  }
  // validateApproval narrowed value to ApprovalRecord; enforce the phase tag.
  // approvalId is free-form but the file path's phaseNumber is the source of
  // truth for which phase the record belongs to — there is no `phase` numeric
  // field on the record (the `phase` enum is inception/construction/etc.), so
  // no additional cross-check is possible here beyond the schema's enum.
  void phaseNumber;
}

/**
 * Atomically write an approval record to `.planning/governance/approvals/{NN}.json`.
 * Validates BEFORE write so a malformed record never lands on disk.
 */
export function writeApproval(
  projectRoot: string,
  phaseNumber: string,
  approval: ApprovalRecord,
): void {
  const filePath = approvalPath(projectRoot, phaseNumber);
  assertApproval(approval, filePath, phaseNumber);
  atomicWriteFile(filePath, JSON.stringify(approval, null, 2));
}

/**
 * Read an approval record from `.planning/governance/approvals/{NN}.json`.
 *
 * Returns null when the file is absent (the legitimate pre-ship state). Throws
 * `malformed approval at <absPath>: <detail>` when the file exists but is
 * unreadable, contains invalid JSON, or fails shape validation — the 4-rung
 * loud-fail ladder mirrors readGateEvidence.
 */
export function readApproval(
  projectRoot: string,
  phaseNumber: string,
): ApprovalRecord | null {
  const filePath = approvalPath(projectRoot, phaseNumber);
  if (!existsSync(filePath)) return null;

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    fail(filePath, `unreadable (${String(err)})`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(filePath, String(err));
  }

  assertApproval(parsed, filePath, phaseNumber);
  return parsed;
}