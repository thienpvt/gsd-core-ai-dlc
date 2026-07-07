/**
 * AUDIT-03/05/06 enrichment helpers (D-10, D-11, D-12, D-14).
 *
 * Three pure functions (no I/O — D-14) that prepare the optional v2 audit fields
 * from bounded markdown inputs + the approval store's typed records:
 *
 *   - extractRequirementsCovered (AUDIT-03, D-10): regex over the REQUIREMENTS.md
 *     Traceability table for the phase's REQ-IDs. Deterministic extraction,
 *     never model narration.
 *   - collectRemainingRisks (AUDIT-05, D-11): aggregates VERIFICATION.md gaps +
 *     CONTEXT.md <deferred> items. NEVER returns [] — emits an explicit
 *     none-identified row when both inputs yield nothing so reviewers distinguish
 *     "researched and found none" from "not checked".
 *   - summarizeApprovals (AUDIT-06, D-12): projects ApprovalRecord[] from the
 *     approval store (Plan 01) into the audit summary view. Single-sourced from
 *     the store, never re-queried through the adapter at audit time.
 *
 * buildAuditRecord stays thin (D-14); these helpers prepare the optional payload
 * and the hook (Plan 04) spreads them conditionally to preserve v1 byte-stability
 * (D-09, Pitfall 2).
 */
import type { ApprovalRecord } from "./approval-store.js";

// ---------------------------------------------------------------------------
// Types — also consumed by audit-artifact.ts v2 GovernanceAudit interface.
// ---------------------------------------------------------------------------

export interface RequirementsCoveredEntry {
  reqId: string;
  title: string;
  status: "complete" | "pending" | "partial";
}

export interface RemainingRiskEntry {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
  source: "VERIFICATION.md" | "CONTEXT.md<deferred>" | "none-identified";
}

export interface ApprovalSummary {
  approvalId: string;
  gateId: string;
  decision: "pending" | "approved" | "rejected" | "waived";
  decidedBy?: string;
}

// ---------------------------------------------------------------------------
// extractRequirementsCovered (AUDIT-03, D-10)
// ---------------------------------------------------------------------------

/**
 * Regex over a REQUIREMENTS.md Traceability table row. Matches both the real
 * format (`| REQ-ID | Phase N | Status |`) and simplified fixtures
 * (`| REQ-ID | NN | status |`). `/gm` anchors `^|` to line starts.
 *
 * Capture groups:
 *   1: REQ-ID (e.g. "AUDIT-03")
 *   2: Phase number — digits, optional "Phase " prefix, optional decimal sub-phase
 *   3: Status text (human-readable)
 */
const TRACEABILITY_RE = /^\|\s*([A-Z]+-\d+)\s*\|\s*(?:Phase\s+)?(\d+(?:\.\d+)?)\s*\|\s*([^|]+?)\s*\|/gm;

/** Normalize a phase number string for comparison: "9" and "09" both match. */
function normalizePhaseNumber(n: string): string {
  return String(Number(n));
}

/** Derive the audit status enum from the traceability status text. */
function deriveStatus(statusText: string): RequirementsCoveredEntry["status"] {
  const lower = statusText.toLowerCase();
  if (lower.includes("complete")) return "complete";
  if (lower.includes("pending")) return "pending";
  return "partial";
}

/**
 * Machine-extract REQ-IDs for a phase from the REQUIREMENTS.md Traceability
 * table. Deterministic regex — never model narration (D-10). Handles both the
 * real "Phase N" format and simplified "NN" fixtures. Returns entries with
 * {reqId, title, status}.
 */
export function extractRequirementsCovered(
  requirementsMd: string,
  phaseNumber: string,
): RequirementsCoveredEntry[] {
  const target = normalizePhaseNumber(phaseNumber);
  const entries: RequirementsCoveredEntry[] = [];
  // Reset lastIndex — g flag makes the regex stateful.
  TRACEABILITY_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TRACEABILITY_RE.exec(requirementsMd)) !== null) {
    if (normalizePhaseNumber(match[2]) !== target) continue;
    entries.push({
      reqId: match[1],
      title: match[1], // REQ-ID is the canonical title; full titles live in the req body.
      status: deriveStatus(match[3]),
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// collectRemainingRisks (AUDIT-05, D-11)
// ---------------------------------------------------------------------------

/**
 * Regex for VERIFICATION.md gap markers. Matches:
 *   - `- [ ]` unchecked checkbox items
 *   - Lines containing "GAP", "TODO", "Flagged" (case-insensitive)
 * Captures the detail text after the marker.
 */
const VERIFICATION_GAP_RE = /(?:^-\s*\[\s*\]\s*(.+?)$|^\s*-\s*(?:GAP|TODO|Flagged)\s*:?\s*(.+?)$)/gim;

/**
 * Regex for CONTEXT.md <deferred> section list items. Captures `- item` lines
 * between <deferred> and </deferred> sentinel tokens.
 */
const DEFERRED_SECTION_RE = /<deferred>\s*([\s\S]*?)<\/deferred>/i;
const DEFERRED_ITEM_RE = /^\s*-\s+(.+?)$/gm;

/**
 * Aggregate remaining risks from VERIFICATION.md gaps + CONTEXT.md <deferred>
 * items. NEVER returns [] (D-11) — emits an explicit none-identified row when
 * both inputs yield nothing so absence is auditable, not just missing.
 *
 * `contextDeferredSection` may be the entire CONTEXT.md or just the extracted
 * <deferred>...</deferred> block; the regex finds the section either way.
 */
export function collectRemainingRisks(
  verificationMd: string,
  contextDeferredSection: string,
): RemainingRiskEntry[] {
  const risks: RemainingRiskEntry[] = [];

  // Scan VERIFICATION.md for gap markers.
  VERIFICATION_GAP_RE.lastIndex = 0;
  let vMatch: RegExpExecArray | null;
  while ((vMatch = VERIFICATION_GAP_RE.exec(verificationMd)) !== null) {
    const detail = (vMatch[1] ?? vMatch[2] ?? "").trim();
    if (detail.length === 0) continue;
    risks.push({
      id: `verification-gap-${risks.length + 1}`,
      severity: "medium",
      detail,
      source: "VERIFICATION.md",
    });
  }

  // Extract <deferred> section and scan for list items.
  const deferredBlock = DEFERRED_SECTION_RE.exec(contextDeferredSection);
  if (deferredBlock !== null) {
    DEFERRED_ITEM_RE.lastIndex = 0;
    let dMatch: RegExpExecArray | null;
    while ((dMatch = DEFERRED_ITEM_RE.exec(deferredBlock[1])) !== null) {
      const detail = dMatch[1].trim();
      if (detail.length === 0) continue;
      risks.push({
        id: `deferred-${risks.length + 1}`,
        severity: "medium",
        detail,
        source: "CONTEXT.md<deferred>",
      });
    }
  }

  if (risks.length === 0) {
    return [{
      id: "none-identified",
      severity: "low",
      detail: "no risks found in VERIFICATION.md or CONTEXT.md <deferred>",
      source: "none-identified",
    }];
  }

  return risks;
}

// ---------------------------------------------------------------------------
// summarizeApprovals (AUDIT-06, D-12)
// ---------------------------------------------------------------------------

/**
 * Project ApprovalRecord[] (from the approval store, Plan 01) into the audit
 * summary view. Single-sourced from the store (D-12) — never re-queries the
 * adapter at audit time. Empty input emits a none-required placeholder row
 * (D-11 analog for approvals).
 */
export function summarizeApprovals(approvals: ApprovalRecord[]): ApprovalSummary[] {
  if (approvals.length === 0) {
    return [{
      approvalId: "none-required",
      gateId: "ship",
      decision: "waived",
    }];
  }

  return approvals.map((a) => {
    const summary: ApprovalSummary = {
      approvalId: a.approvalId,
      gateId: typeof a.gateId === "string" ? a.gateId : String(a.gateId),
      decision: a.decision,
    };
    if (a.decidedBy !== undefined && a.decidedBy.length > 0) {
      summary.decidedBy = a.decidedBy;
    }
    return summary;
  });
}
