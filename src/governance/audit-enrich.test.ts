/**
 * AUDIT-03/05/06 enrichment helpers (D-10, D-11, D-12, D-14).
 *
 * Pure-function tests for extractRequirementsCovered (REQ-ID extraction from
 * REQUIREMENTS.md traceability), collectRemainingRisks (VERIFICATION.md gaps +
 * CONTEXT.md <deferred> aggregation with never-empty placeholder), and
 * summarizeApprovals (ApprovalRecord[] -> ApprovalSummary[] projection from
 * the approval store, never re-queried through the adapter per D-12).
 *
 * RED note: ./audit-enrich.js does not exist yet — every import resolves to
 * undefined and TS2307 fails the build. Task 2 implements the helpers -> GREEN.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectRemainingRisks,
  extractRequirementsCovered,
  summarizeApprovals,
} from "./audit-enrich.js";
import type { ApprovalRecord } from "./approval-store.js";

// ---------------------------------------------------------------------------
// extractRequirementsCovered (AUDIT-03, D-10)
// ---------------------------------------------------------------------------

test("extractRequirementsCovered returns REQ-IDs from the phase's traceability rows (simplified format)", () => {
  const md = `## Traceability\n\n| Requirement | Phase | Status |\n|---|---|---|\n| AUDIT-03 | 09 | complete |\n| APPR-01 | 09 | complete |\n| TD-01 | 06 | complete |`;
  const reqs = extractRequirementsCovered(md, "09");
  assert.deepEqual(reqs.map((r) => r.reqId), ["AUDIT-03", "APPR-01"]);
});

test("extractRequirementsCovered parses real REQUIREMENTS.md format (Phase prefix, mixed case status)", () => {
  const md = `## Traceability\n\n| Requirement | Phase | Status |\n|-------------|-------|--------|\n| AUDIT-03 | Phase 9 | Pending |\n| AUDIT-04 | Phase 9 | Complete |\n| TD-01 | Phase 6 | Complete |`;
  const reqs = extractRequirementsCovered(md, "09");
  assert.deepEqual(reqs.map((r) => r.reqId), ["AUDIT-03", "AUDIT-04"]);
  assert.equal(reqs[0].status, "pending");
  assert.equal(reqs[1].status, "complete");
});

test("extractRequirementsCovered excludes other-phase REQ-IDs", () => {
  const md = `| AUDIT-03 | 09 | complete |\n| TD-01 | 06 | complete |\n| ENF-02 | 07 | complete |`;
  const reqs = extractRequirementsCovered(md, "09");
  assert.equal(reqs.length, 1);
  assert.equal(reqs[0].reqId, "AUDIT-03");
});

test("extractRequirementsCovered handles no matching rows gracefully", () => {
  const md = `| TD-01 | 06 | complete |`;
  const reqs = extractRequirementsCovered(md, "09");
  assert.equal(reqs.length, 0);
});

// ---------------------------------------------------------------------------
// collectRemainingRisks (AUDIT-05, D-11)
// ---------------------------------------------------------------------------

test("collectRemainingRisks emits explicit none-identified row when both inputs are empty (D-11)", () => {
  const risks = collectRemainingRisks("# Verification\n\nAll clean.", "");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].id, "none-identified");
  assert.equal(risks[0].source, "none-identified");
});

test("collectRemainingRisks aggregates VERIFICATION.md gaps AND CONTEXT <deferred> items", () => {
  const verification = "## Gaps\n\n- [ ] edge case X unhandled\n- TODO: add negative test";
  const deferred = "<deferred>\n- Real scanner integrations\n- Rollback plan evidence\n</deferred>";
  const risks = collectRemainingRisks(verification, deferred);
  assert.ok(risks.length >= 3, `expected at least 3 risks, got ${risks.length}`);
  assert.ok(risks.every((r) => r.id !== "none-identified"), "none-identified should be absent when risks exist");
});

test("collectRemainingRisks VERIFICATION.md gaps carry VERIFICATION.md source", () => {
  const verification = "- [ ] unchecked verification item";
  const risks = collectRemainingRisks(verification, "");
  const verificationRisks = risks.filter((r) => r.source === "VERIFICATION.md");
  assert.ok(verificationRisks.length >= 1);
});

test("collectRemainingRisks CONTEXT deferred items carry CONTEXT.md<deferred> source", () => {
  const deferred = "<deferred>\n- Deferred risk item\n</deferred>";
  const risks = collectRemainingRisks("", deferred);
  const deferredRisks = risks.filter((r) => r.source === "CONTEXT.md<deferred>");
  assert.ok(deferredRisks.length >= 1);
});

// ---------------------------------------------------------------------------
// summarizeApprovals (AUDIT-06, D-12)
// ---------------------------------------------------------------------------

test("summarizeApprovals projects ApprovalRecord[] to ApprovalSummary[]", () => {
  const approvals: ApprovalRecord[] = [
    {
      approvalId: "ship-09",
      phase: "construction",
      gateId: "ship",
      artifactPath: ".planning/governance/gates/09-ship.json",
      requestedBy: "aidlc-governance-ship",
      requestedAt: "2026-07-07T00:00:00.000Z",
      decision: "approved",
      decidedBy: "human-1",
    },
    {
      approvalId: "verify-09",
      phase: "construction",
      gateId: "verify",
      artifactPath: ".planning/governance/gates/09-verify.json",
      requestedBy: "aidlc-governance-verify",
      requestedAt: "2026-07-07T00:00:00.000Z",
      decision: "pending",
    },
  ];
  const summary = summarizeApprovals(approvals);
  assert.equal(summary.length, 2);
  assert.deepEqual(summary[0], {
    approvalId: "ship-09",
    gateId: "ship",
    decision: "approved",
    decidedBy: "human-1",
  });
  assert.deepEqual(summary[1], {
    approvalId: "verify-09",
    gateId: "verify",
    decision: "pending",
  });
});

test("summarizeApprovals empty input returns none-required placeholder (D-11 analog)", () => {
  const summary = summarizeApprovals([]);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].approvalId, "none-required");
  assert.equal(summary[0].decision, "waived");
});
